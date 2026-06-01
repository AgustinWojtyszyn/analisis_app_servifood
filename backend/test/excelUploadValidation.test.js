import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  validateUploadedExcelFile,
  processExcelFile
} from '../src/controllers/analysisController.utils.js';

async function buildValidXlsxBuffer() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Datos');
  sheet.addRow(['Fecha', 'Área/Sector', 'Desvío detectado']);
  sheet.addRow(['01/05', 'Cocina', 'Falta de higiene']);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function createFile({ name = 'archivo.xlsx', mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer = Buffer.alloc(0), size = null } = {}) {
  return {
    originalname: name,
    mimetype: mime,
    buffer,
    size: size ?? buffer.length
  };
}

function createSupabaseInsertMock() {
  return {
    from() {
      return {
        insert(payload) {
          return {
            select() {
              return {
                single: async () => ({
                  data: { id: 'analysis-1', ...payload },
                  error: null
                })
              };
            }
          };
        }
      };
    }
  };
}

test('acepta archivo .xlsx válido', async () => {
  const buffer = await buildValidXlsxBuffer();
  const file = createFile({ buffer });
  assert.doesNotThrow(() => validateUploadedExcelFile(file));
});

test('rechaza archivo .txt por extensión incorrecta', async () => {
  const buffer = await buildValidXlsxBuffer();
  const file = createFile({ name: 'archivo.txt', mime: 'text/plain', buffer });
  assert.throws(
    () => validateUploadedExcelFile(file),
    /Solo se aceptan archivos \.xlsx/i
  );
});

test('rechaza .txt renombrado a .xlsx por firma inválida', () => {
  const file = createFile({
    name: 'falso.xlsx',
    mime: 'application/octet-stream',
    buffer: Buffer.from('esto no es un zip de excel')
  });
  assert.throws(
    () => validateUploadedExcelFile(file),
    /no es un excel \.xlsx válido/i
  );
});

test('rechaza archivo .xlsx vacío', () => {
  const file = createFile({
    name: 'vacio.xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.alloc(0)
  });
  assert.throws(
    () => validateUploadedExcelFile(file),
    /está vacío/i
  );
});

test('rechaza ZIP genérico renombrado a .xlsx por estructura inválida', () => {
  const genericZipLike = Buffer.from('PK\x03\x04zip-content-without-workbook-entries');
  const file = createFile({
    name: 'zip_generico.xlsx',
    mime: 'application/octet-stream',
    buffer: genericZipLike
  });
  assert.throws(
    () => validateUploadedExcelFile(file),
    /estructura excel válida/i
  );
});

test('archivo corrupto termina en error controlado de proceso (400)', async () => {
  const buffer = Buffer.from('PK\x03\x04[Content_Types].xml_xl/workbook.xml__rels/.rels');
  const file = createFile({ buffer, mime: 'application/octet-stream' });
  await assert.rejects(
    () => processExcelFile({
      file,
      userId: 'u1',
      analyzeExcel: async () => ({ success: false, error: 'bad zip: end of central directory not found' }),
      prisma: { businessRule: { findMany: async () => [] } },
      defaultRules: [],
      supabaseAdmin: createSupabaseInsertMock(),
      mapAnalysisRowToApi: (row) => row
    }),
    (error) => Number(error?.status) === 400
  );
});

test('rechaza archivo demasiado grande', () => {
  const file = createFile({
    buffer: Buffer.from('PK\x03\x04[Content_Types].xml_xl/workbook.xml__rels/.rels'),
    size: 11
  });
  assert.throws(
    () => validateUploadedExcelFile(file, { maxFileSizeBytes: 10 }),
    (error) => Number(error?.status) === 413
  );
});

test('rechaza MIME incorrecto', async () => {
  const buffer = await buildValidXlsxBuffer();
  const file = createFile({
    mime: 'text/plain',
    buffer
  });
  assert.throws(
    () => validateUploadedExcelFile(file),
    /tipo de archivo no es válido/i
  );
});

test('admite application/octet-stream si el .xlsx es real', async () => {
  const buffer = await buildValidXlsxBuffer();
  const file = createFile({
    mime: 'application/octet-stream',
    buffer
  });
  assert.doesNotThrow(() => validateUploadedExcelFile(file));
});

test('archivo válido mantiene flujo funcional de análisis', async () => {
  const buffer = await buildValidXlsxBuffer();
  const file = createFile({ buffer });
  const result = await processExcelFile({
    file,
    userId: 'u1',
    analyzeExcel: async () => ({
      success: true,
      records: [{ id: 1 }],
      summary: { totalNC: 1 },
      cases: []
    }),
    prisma: { businessRule: { findMany: async () => [] } },
    defaultRules: [],
    supabaseAdmin: createSupabaseInsertMock(),
    mapAnalysisRowToApi: (row) => row
  });

  assert.equal(result.id, 'analysis-1');
  assert.equal(result.user_id, 'u1');
});
