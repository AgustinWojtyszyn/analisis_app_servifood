import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yauzl from 'yauzl';
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_ZIP_DEPTH,
  MAX_ZIP_ENTRIES,
  MAX_ZIP_FILE_SIZE_BYTES,
  MAX_ZIP_UNCOMPRESSED_BYTES,
  STORAGE_BUCKET,
  canManageByRole,
  ensureStorageBucketExists,
  getExtension,
  sanitizeStorageFileName
} from '../../routes/nutritionModules/helpers.js';
import { resolveUserRole, supabaseAdmin } from './context.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMPORT_TMP_DIR = path.resolve(__dirname, '../../../tmp/sgc-zip-imports');
const IMPORT_TOKEN_TTL_MS = 60 * 60 * 1000;
const DEFAULT_IMPORTED_MODULE_TYPE = 'registro';
const ZIP_EXTENSIONS = new Set(['.zip']);

function normalizeComparableName(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function stripExtension(fileName = '') {
  const ext = getExtension(fileName);
  return ext ? String(fileName).slice(0, -ext.length) : String(fileName);
}

function getContentType(ext = '') {
  const normalized = String(ext || '').toLowerCase();
  const types = {
    '.pdf': 'application/pdf',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.msg': 'application/vnd.ms-outlook',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.txt': 'text/plain'
  };
  return types[normalized] || 'application/octet-stream';
}

function buildEmptySummary() {
  return {
    foldersNew: 0,
    foldersExisting: 0,
    documentsNew: 0,
    filesSkipped: 0,
    duplicates: 0,
    invalidFiles: 0,
    totalUncompressedBytes: 0,
    warnings: [],
    limits: {
      maxZipBytes: MAX_ZIP_FILE_SIZE_BYTES,
      maxFileBytes: MAX_FILE_SIZE_BYTES,
      maxUncompressedBytes: MAX_ZIP_UNCOMPRESSED_BYTES,
      maxEntries: MAX_ZIP_ENTRIES,
      maxDepth: MAX_ZIP_DEPTH
    }
  };
}

function isPathSuspicious(rawName = '') {
  const normalized = String(rawName || '').replace(/\\/g, '/');
  if (!normalized.trim()) return true;
  if (normalized.startsWith('/') || /^[a-zA-Z]:\//.test(normalized)) return true;
  return normalized.split('/').some((segment) => segment === '..');
}

function toPathSegments(rawName = '') {
  return String(rawName || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function shouldStripWrapper(paths) {
  const firstSegments = new Set(paths.map((segments) => segments[0]).filter(Boolean));
  if (firstSegments.size !== 1) return false;
  const [first] = [...firstSegments];
  return normalizeComparableName(first) === 'documentos-servifood';
}

function stripWrapperFromEntries(entries) {
  const paths = entries.map((entry) => entry.segments).filter((segments) => segments.length);
  if (!paths.length || !shouldStripWrapper(paths)) return entries;
  return entries
    .map((entry) => ({ ...entry, segments: entry.segments.slice(1) }))
    .filter((entry) => entry.segments.length);
}

function isSystemEntry(segments) {
  return segments.some((segment) => segment === '__MACOSX')
    || segments.some((segment) => segment === '.DS_Store')
    || segments.some((segment) => segment.startsWith('._'));
}

function isTemporaryFile(fileName) {
  const ext = getExtension(fileName);
  return String(fileName || '').startsWith('~$') || ext === '.tmp';
}

function folderKey(parentKey, name) {
  return `${parentKey || 'root'}::${normalizeComparableName(name)}`;
}

async function ensureImportTmpDir() {
  await fs.mkdir(IMPORT_TMP_DIR, { recursive: true });
}

async function cleanupExpiredImports() {
  await ensureImportTmpDir();
  const entries = await fs.readdir(IMPORT_TMP_DIR, { withFileTypes: true }).catch(() => []);
  const now = Date.now();
  await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map(async (entry) => {
      const manifestPath = path.join(IMPORT_TMP_DIR, entry.name);
      try {
        const raw = await fs.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(raw);
        if (!manifest.createdAt || now - Number(manifest.createdAt) < IMPORT_TOKEN_TTL_MS) return;
        await fs.rm(manifest.zipPath, { force: true }).catch(() => {});
        await fs.rm(manifestPath, { force: true }).catch(() => {});
      } catch {
        await fs.rm(manifestPath, { force: true }).catch(() => {});
      }
    }));
}

function openZip(zipPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: true }, (error, zipfile) => {
      if (error || !zipfile) reject(error || new Error('No se pudo abrir el ZIP'));
      else resolve(zipfile);
    });
  });
}

async function readZipEntries(zipPath) {
  const zipfile = await openZip(zipPath);
  return await new Promise((resolve, reject) => {
    const entries = [];
    zipfile.readEntry();
    zipfile.on('entry', (entry) => {
      entries.push(entry);
      if (entries.length > MAX_ZIP_ENTRIES) {
        zipfile.close();
        reject(new Error(`El ZIP supera el máximo de ${MAX_ZIP_ENTRIES} entradas`));
        return;
      }
      zipfile.readEntry();
    });
    zipfile.on('end', () => resolve(entries));
    zipfile.on('error', reject);
  });
}

async function readEntryBuffer(zipPath, entryName) {
  const zipfile = await openZip(zipPath);
  return await new Promise((resolve, reject) => {
    zipfile.readEntry();
    zipfile.on('entry', (entry) => {
      if (entry.fileName !== entryName) {
        zipfile.readEntry();
        return;
      }
      zipfile.openReadStream(entry, (error, stream) => {
        if (error || !stream) {
          zipfile.close();
          reject(error || new Error('No se pudo leer archivo del ZIP'));
          return;
        }
        const chunks = [];
        let total = 0;
        stream.on('data', (chunk) => {
          total += chunk.length;
          if (total > MAX_FILE_SIZE_BYTES) {
            stream.destroy(new Error('Archivo excede el máximo permitido'));
            return;
          }
          chunks.push(chunk);
        });
        stream.on('end', () => {
          zipfile.close();
          resolve(Buffer.concat(chunks));
        });
        stream.on('error', (streamError) => {
          zipfile.close();
          reject(streamError);
        });
      });
    });
    zipfile.on('end', () => reject(new Error('Archivo no encontrado dentro del ZIP')));
    zipfile.on('error', reject);
  });
}

async function loadActiveFolders() {
  const { data, error } = await supabaseAdmin
    .from('sgc_document_folders')
    .select('id, name, parent_id')
    .neq('status', 'archivado');
  if (error) throw new Error(error.message || 'Error consultando carpetas existentes');
  return data || [];
}

async function loadExistingFileKeys() {
  const { data: docs, error: docsError } = await supabaseAdmin
    .from('nutrition_modules')
    .select('id, folder_id');
  if (docsError) throw new Error(docsError.message || 'Error consultando documentos existentes');
  const folderByModuleId = new Map((docs || []).map((row) => [row.id, row.folder_id || null]));

  const { data: files, error: filesError } = await supabaseAdmin
    .from('nutrition_module_files')
    .select('module_id, file_name, file_size');
  if (filesError) throw new Error(filesError.message || 'Error consultando adjuntos existentes');

  const keys = new Set();
  (files || []).forEach((file) => {
    const folderId = folderByModuleId.get(file.module_id) || null;
    keys.add(`${folderId || 'root'}::${normalizeComparableName(file.file_name)}::${Number(file.file_size || 0)}`);
  });
  return keys;
}

async function getNextFolderSortOrder(parentId) {
  let query = supabaseAdmin
    .from('sgc_document_folders')
    .select('sort_order')
    .neq('status', 'archivado')
    .order('sort_order', { ascending: false })
    .limit(1);

  query = parentId ? query.eq('parent_id', parentId) : query.is('parent_id', null);

  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Error calculando orden de carpeta');
  return Number(data?.[0]?.sort_order ?? -1) + 1;
}

async function getNextDocumentSortOrder(folderId) {
  let query = supabaseAdmin
    .from('nutrition_modules')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  query = folderId ? query.eq('folder_id', folderId) : query.is('folder_id', null);

  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Error calculando orden de documento');
  return Number(data?.[0]?.sort_order ?? -1) + 1;
}

function buildFolderAnalysis(folderPaths, existingFolders) {
  const existingByKey = new Map();
  existingFolders.forEach((folder) => {
    existingByKey.set(folderKey(folder.parent_id || null, folder.name), folder.id);
  });

  const plannedByKey = new Map();
  let foldersExisting = 0;
  let foldersNew = 0;

  [...folderPaths]
    .sort((a, b) => a.length - b.length)
    .forEach((segments) => {
      let parentIdOrKey = null;
      let parentStableKey = null;
      segments.forEach((segment) => {
        const key = folderKey(parentStableKey || parentIdOrKey, segment);
        if (plannedByKey.has(key)) {
          const planned = plannedByKey.get(key);
          parentIdOrKey = planned.id || planned.key;
          parentStableKey = planned.key;
          return;
        }
        const existingId = existingByKey.get(folderKey(parentIdOrKey, segment));
        if (existingId) {
          foldersExisting += 1;
          plannedByKey.set(key, { id: existingId, key });
          parentIdOrKey = existingId;
          parentStableKey = key;
          return;
        }
        foldersNew += 1;
        plannedByKey.set(key, { id: null, key });
        parentIdOrKey = key;
        parentStableKey = key;
      });
    });

  return { foldersExisting, foldersNew };
}

async function analyzeZip(zipPath) {
  const summary = buildEmptySummary();
  const rawEntries = await readZipEntries(zipPath);
  const parsedEntries = [];
  let totalUncompressedBytes = 0;

  for (const entry of rawEntries) {
    const rawName = entry.fileName || '';
    if (isPathSuspicious(rawName)) {
      summary.invalidFiles += 1;
      summary.warnings.push(`Ruta sospechosa omitida: ${rawName}`);
      continue;
    }
    const segments = toPathSegments(rawName);
    if (!segments.length || isSystemEntry(segments)) {
      summary.filesSkipped += 1;
      continue;
    }
    if (segments.length > MAX_ZIP_DEPTH) {
      summary.invalidFiles += 1;
      summary.warnings.push(`Ruta demasiado profunda omitida: ${rawName}`);
      continue;
    }
    totalUncompressedBytes += Number(entry.uncompressedSize || 0);
    if (totalUncompressedBytes > MAX_ZIP_UNCOMPRESSED_BYTES) {
      throw new Error(`El ZIP supera el máximo descomprimido de ${Math.round(MAX_ZIP_UNCOMPRESSED_BYTES / (1024 * 1024))} MB`);
    }
    parsedEntries.push({
      zipEntryName: rawName,
      segments,
      isDirectory: rawName.endsWith('/'),
      size: Number(entry.uncompressedSize || 0)
    });
  }

  const entries = stripWrapperFromEntries(parsedEntries);
  const folderPathKeys = new Set();
  const validFiles = [];
  const fileKeysInZip = new Set();

  for (const entry of entries) {
    if (entry.isDirectory) {
      folderPathKeys.add(JSON.stringify(entry.segments));
      continue;
    }

    const fileName = entry.segments.at(-1);
    const folderSegments = entry.segments.slice(0, -1);
    const ext = getExtension(fileName);
    if (!fileName || !fileName.trim()) {
      summary.invalidFiles += 1;
      summary.warnings.push(`Nombre inválido omitido: ${entry.zipEntryName}`);
      continue;
    }
    if (isTemporaryFile(fileName) || fileName === '.DS_Store') {
      summary.filesSkipped += 1;
      continue;
    }
    if (ZIP_EXTENSIONS.has(ext)) {
      summary.filesSkipped += 1;
      summary.warnings.push(`ZIP interno omitido: ${entry.segments.join('/')}`);
      continue;
    }
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      summary.invalidFiles += 1;
      summary.warnings.push(`Extensión no permitida omitida: ${entry.segments.join('/')}`);
      continue;
    }
    if (entry.size <= 0) {
      summary.filesSkipped += 1;
      summary.warnings.push(`Archivo vacío omitido: ${entry.segments.join('/')}`);
      continue;
    }
    if (entry.size > MAX_FILE_SIZE_BYTES) {
      summary.invalidFiles += 1;
      summary.warnings.push(`Archivo supera 25 MB y fue omitido: ${entry.segments.join('/')}`);
      continue;
    }

    for (let i = 1; i <= folderSegments.length; i += 1) {
      folderPathKeys.add(JSON.stringify(folderSegments.slice(0, i)));
    }

    const inZipKey = `${JSON.stringify(folderSegments.map(normalizeComparableName))}::${normalizeComparableName(fileName)}::${entry.size}`;
    if (fileKeysInZip.has(inZipKey)) {
      summary.duplicates += 1;
      summary.warnings.push(`Duplicado dentro del ZIP omitido: ${entry.segments.join('/')}`);
      continue;
    }
    fileKeysInZip.add(inZipKey);

    validFiles.push({
      zipEntryName: entry.zipEntryName,
      path: entry.segments.join('/'),
      fileName,
      folderSegments,
      size: entry.size,
      ext,
      title: stripExtension(fileName).trim() || fileName
    });
  }

  const folderPaths = [...folderPathKeys].map((value) => JSON.parse(value)).filter((segments) => segments.length);
  const [existingFolders, existingFileKeys] = await Promise.all([
    loadActiveFolders(),
    loadExistingFileKeys()
  ]);
  const folderAnalysis = buildFolderAnalysis(folderPaths, existingFolders);
  summary.foldersNew = folderAnalysis.foldersNew;
  summary.foldersExisting = folderAnalysis.foldersExisting;
  summary.totalUncompressedBytes = totalUncompressedBytes;

  const folderIdByPath = new Map();
  const existingByKey = new Map();
  existingFolders.forEach((folder) => {
    existingByKey.set(folderKey(folder.parent_id || null, folder.name), folder.id);
  });
  folderPaths.sort((a, b) => a.length - b.length).forEach((segments) => {
    let parentId = null;
    let stableParentKey = null;
    segments.forEach((segment, index) => {
      const pathKey = JSON.stringify(segments.slice(0, index + 1).map(normalizeComparableName));
      if (folderIdByPath.has(pathKey)) {
        parentId = folderIdByPath.get(pathKey);
        stableParentKey = pathKey;
        return;
      }
      const existingId = existingByKey.get(folderKey(parentId, segment));
      folderIdByPath.set(pathKey, existingId || stableParentKey || pathKey);
      parentId = existingId || null;
      stableParentKey = pathKey;
    });
  });

  const importableFiles = [];
  for (const file of validFiles) {
    const folderPathKey = JSON.stringify(file.folderSegments.map(normalizeComparableName));
    const folderIdOrKey = file.folderSegments.length ? folderIdByPath.get(folderPathKey) : null;
    const existingKey = `${typeof folderIdOrKey === 'string' && !folderIdOrKey.match(/^[0-9a-f-]{36}$/i) ? folderPathKey : (folderIdOrKey || 'root')}::${normalizeComparableName(file.fileName)}::${file.size}`;
    if (existingFileKeys.has(existingKey)) {
      summary.duplicates += 1;
      summary.warnings.push(`Ya existe un adjunto con mismo nombre y tamaño: ${file.path}`);
      continue;
    }
    importableFiles.push(file);
  }

  summary.documentsNew = importableFiles.length;
  return { summary, files: importableFiles, folderPaths };
}

async function saveManifest(zipPath, originalName, analysis, userId) {
  await cleanupExpiredImports();
  const token = crypto.randomUUID();
  const manifestPath = path.join(IMPORT_TMP_DIR, `${token}.json`);
  await fs.writeFile(manifestPath, JSON.stringify({
    token,
    zipPath,
    originalName,
    createdAt: Date.now(),
    userId,
    analysis
  }), 'utf8');
  return token;
}

async function loadManifest(token) {
  if (!/^[0-9a-f-]{36}$/i.test(String(token || ''))) {
    const error = new Error('Token de importación inválido');
    error.statusCode = 400;
    throw error;
  }
  const manifestPath = path.join(IMPORT_TMP_DIR, `${token}.json`);
  const raw = await fs.readFile(manifestPath, 'utf8').catch(() => null);
  if (!raw) {
    const error = new Error('La vista previa del ZIP no existe o expiró');
    error.statusCode = 404;
    throw error;
  }
  const manifest = JSON.parse(raw);
  if (Date.now() - Number(manifest.createdAt || 0) > IMPORT_TOKEN_TTL_MS) {
    await fs.rm(manifest.zipPath, { force: true }).catch(() => {});
    await fs.rm(manifestPath, { force: true }).catch(() => {});
    const error = new Error('La vista previa del ZIP expiró. Analizá el archivo nuevamente.');
    error.statusCode = 410;
    throw error;
  }
  return { manifest, manifestPath };
}

async function ensureFolderPath(folderSegments, cache, userId) {
  let parentId = null;
  for (const segment of folderSegments) {
    const key = folderKey(parentId, segment);
    if (cache.has(key)) {
      parentId = cache.get(key);
      continue;
    }
    const { data, error } = await supabaseAdmin
      .from('sgc_document_folders')
      .insert({
        name: segment,
        parent_id: parentId,
        description: null,
        status: 'activo',
        sort_order: await getNextFolderSortOrder(parentId),
        created_by: userId
      })
      .select('id')
      .maybeSingle();
    if (error || !data) {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('sgc_document_folders')
        .select('id')
        .eq('parent_id', parentId)
        .eq('name', segment)
        .neq('status', 'archivado')
        .maybeSingle();
      if (existingError || !existing) {
        throw new Error(error?.message || existingError?.message || `No se pudo crear carpeta ${segment}`);
      }
      cache.set(key, existing.id);
      parentId = existing.id;
      continue;
    }
    cache.set(key, data.id);
    parentId = data.id;
  }
  return parentId;
}

async function importAnalyzedZip(manifest, userId) {
  const freshAnalysis = await analyzeZip(manifest.zipPath);
  const existingFolders = await loadActiveFolders();
  const folderCache = new Map();
  existingFolders.forEach((folder) => {
    folderCache.set(folderKey(folder.parent_id || null, folder.name), folder.id);
  });
  const existingFileKeys = await loadExistingFileKeys();
  const result = {
    imported: 0,
    skipped: 0,
    duplicates: 0,
    failed: 0,
    warnings: [...freshAnalysis.summary.warnings],
    rows: []
  };

  await ensureStorageBucketExists(supabaseAdmin);

  const filesToImport = [...freshAnalysis.files].sort((a, b) => {
    const pathA = String(a.path || '').toLocaleLowerCase('es-AR');
    const pathB = String(b.path || '').toLocaleLowerCase('es-AR');
    if (pathA !== pathB) return pathA.localeCompare(pathB, 'es-AR');
    return String(a.zipEntryName || '').localeCompare(String(b.zipEntryName || ''), 'es-AR');
  });

  for (const file of filesToImport) {
    let documentId = null;
    let storagePath = null;
    try {
      const folderId = await ensureFolderPath(file.folderSegments, folderCache, userId);
      const duplicateKey = `${folderId || 'root'}::${normalizeComparableName(file.fileName)}::${file.size}`;
      if (existingFileKeys.has(duplicateKey)) {
        result.duplicates += 1;
        result.rows.push({ path: file.path, status: 'duplicado', message: 'Ya existe un adjunto con mismo nombre y tamaño en la carpeta destino' });
        continue;
      }

      const nowIso = new Date().toISOString();
      const { data: documentRow, error: documentError } = await supabaseAdmin
        .from('nutrition_modules')
        .insert({
          title: file.title,
          description: `Importado desde ZIP: ${file.path}`,
          content: '',
          status: 'aprobado',
          module_type: DEFAULT_IMPORTED_MODULE_TYPE,
          folder_id: folderId,
          sort_order: await getNextDocumentSortOrder(folderId),
          created_by: userId,
          published_at: nowIso
        })
        .select('id')
        .maybeSingle();
      if (documentError || !documentRow) {
        throw new Error(documentError?.message || 'No se pudo crear el documento');
      }
      documentId = documentRow.id;

      const buffer = await readEntryBuffer(manifest.zipPath, file.zipEntryName);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
      const safeName = sanitizeStorageFileName(file.fileName);
      storagePath = `${documentId}/${Date.now()}-${hash}-${safeName}`;
      const uploadResult = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: getContentType(file.ext),
          upsert: false
        });
      if (uploadResult.error) {
        throw new Error(uploadResult.error.message || 'No se pudo subir el adjunto');
      }

      const { error: fileError } = await supabaseAdmin
        .from('nutrition_module_files')
        .insert({
          module_id: documentId,
          file_name: file.fileName,
          file_path: storagePath,
          file_type: getContentType(file.ext),
          file_size: file.size,
          uploaded_by: userId
        });
      if (fileError) {
        throw new Error(fileError.message || 'No se pudo guardar metadata del adjunto');
      }

      existingFileKeys.add(duplicateKey);
      result.imported += 1;
      result.rows.push({ path: file.path, status: 'importado', documentId });
    } catch (error) {
      result.failed += 1;
      result.rows.push({ path: file.path, status: 'fallido', message: error.message || 'Error importando archivo' });
      if (storagePath) {
        await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => {});
      }
      if (documentId) {
        await supabaseAdmin.from('nutrition_modules').delete().eq('id', documentId).catch(() => {});
      }
    }
  }

  result.skipped = freshAnalysis.summary.filesSkipped + freshAnalysis.summary.invalidFiles;
  result.summary = freshAnalysis.summary;
  return result;
}

function sendMulterZipError(error, res) {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `El ZIP no puede superar ${Math.round(MAX_ZIP_FILE_SIZE_BYTES / (1024 * 1024))} MB` });
  }
  return res.status(400).json({ error: error?.message || 'Error cargando ZIP' });
}

export async function analyzeZipImport(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }
    const role = await resolveUserRole(req.user);
    if (!canManageByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para importar ZIP' });
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Debés seleccionar un archivo ZIP' });
    }
    if (getExtension(file.originalname) !== '.zip') {
      await fs.rm(file.path, { force: true }).catch(() => {});
      return res.status(400).json({ error: 'El archivo debe tener extensión .zip' });
    }

    const analysis = await analyzeZip(file.path);
    const token = await saveManifest(file.path, file.originalname, analysis, req.user.id);
    return res.json({ token, fileName: file.originalname, ...analysis });
  } catch (error) {
    if (req.file?.path) await fs.rm(req.file.path, { force: true }).catch(() => {});
    return res.status(error.statusCode || 500).json({ error: error.message || 'Error analizando ZIP' });
  }
}

export async function confirmZipImport(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }
    const role = await resolveUserRole(req.user);
    if (!canManageByRole(role)) {
      return res.status(403).json({ error: 'No autorizado para importar ZIP' });
    }

    const { manifest, manifestPath } = await loadManifest(req.body?.token);
    if (manifest.userId !== req.user.id) {
      return res.status(403).json({ error: 'La vista previa pertenece a otro usuario' });
    }

    const result = await importAnalyzedZip(manifest, req.user.id);
    await fs.rm(manifest.zipPath, { force: true }).catch(() => {});
    await fs.rm(manifestPath, { force: true }).catch(() => {});
    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Error importando ZIP' });
  }
}

export function handleZipUploadError(error, _req, res, next) {
  if (!error) return next();
  return sendMulterZipError(error, res);
}
