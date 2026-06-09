import multer from 'multer';

export const VALID_MODULE_TYPES = new Set(['procedimiento', 'registro', 'estrategias']);
export const STORAGE_BUCKET = 'nutrition-modules';
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const ALLOWED_EXTENSIONS = new Set(['.pdf', '.xls', '.xlsx', '.csv', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp', '.txt']);
export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain'
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 10 }
});

export function normalizeModuleType(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!VALID_MODULE_TYPES.has(v)) return null;
  return v;
}

export function canManageByRole(role) {
  const r = String(role || '').trim().toLowerCase();
  return r === 'admin';
}

export function canViewByRole(role) {
  const r = String(role || '').trim().toLowerCase();
  return r === 'admin' || r === 'nutricionista';
}

export function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

export function mapModuleRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    content: row.content || '',
    status: row.status || 'aprobado',
    moduleType: row.module_type || null,
    folderId: row.folder_id || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    publishedAt: row.published_at || null
  };
}

export function mapFolderRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || '',
    parentId: row.parent_id || null,
    description: row.description || '',
    status: row.status || 'activo',
    createdBy: row.created_by || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

export function sanitizeFilename(title = 'modulo_nutricional') {
  return String(title || 'modulo_nutricional')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'modulo_nutricional';
}

export function getExtension(fileName = '') {
  const base = String(fileName).trim().toLowerCase();
  const dot = base.lastIndexOf('.');
  if (dot < 0) return '';
  return base.slice(dot);
}

export function sanitizeStorageFileName(fileName = 'archivo') {
  const ext = getExtension(fileName);
  const base = String(fileName).replace(ext, '');
  const safe = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'archivo';
  return `${safe}${ext}`;
}

export function ensureAllowedFile(file) {
  const rawName = String(file?.originalname || '');
  const trimmedName = rawName.trim();
  const ext = getExtension(trimmedName);
  const mime = String(file?.mimetype || '').toLowerCase();
  if (!trimmedName) {
    return 'El nombre del archivo no puede estar vacío';
  }
  if (trimmedName.startsWith('~$')) {
    return 'No se permiten archivos temporales de Office';
  }
  if (ext === '.tmp') {
    return 'No se permiten archivos temporales .tmp';
  }
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return `Tipo de archivo no permitido (${ext || 'sin extensión'})`;
  }
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    return `MIME type no permitido (${mime || 'desconocido'})`;
  }
  if (Number(file?.size || 0) > MAX_FILE_SIZE_BYTES) {
    return 'El archivo supera el máximo permitido de 25 MB';
  }
  return null;
}

export async function ensureStorageBucketExists(supabaseAdmin) {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) {
    throw new Error(listError.message || 'No se pudieron listar buckets de storage');
  }
  const exists = (buckets || []).some((bucket) => bucket?.name === STORAGE_BUCKET);
  if (exists) return;

  const { error: createError } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
    public: false
  });
  if (createError && !/already exists/i.test(String(createError.message || ''))) {
    throw new Error(createError.message || `No se pudo crear bucket ${STORAGE_BUCKET}`);
  }
}
