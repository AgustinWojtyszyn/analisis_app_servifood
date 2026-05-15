import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  __setSupabaseAdminForTests,
  exportHealthDeclarationsHandler
} from '../src/routes/healthDeclarations.js';

function createMockRes() {
  const headers = {};
  return {
    statusCode: 200,
    body: null,
    buffer: null,
    headers,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      headers[name] = value;
      return this;
    },
    send(payload) {
      this.buffer = payload;
      return this;
    }
  };
}

function createSupabaseMock({ declarations = [], profiles = [] } = {}) {
  const dataByTable = {
    health_declarations: declarations.map((row) => ({ ...row })),
    profiles: profiles.map((row) => ({ ...row }))
  };

  function applyFilters(rows, filters) {
    return rows.filter((row) => filters.every((f) => {
      if (f.type === 'in') return f.values.includes(row[f.column]);
      if (f.type === 'eq') return row[f.column] === f.value;
      return true;
    }));
  }

  class Query {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.orderBy = null;
    }

    select() { return this; }

    in(column, values) {
      this.filters.push({ type: 'in', column, values: values || [] });
      return this;
    }

    eq(column, value) {
      this.filters.push({ type: 'eq', column, value });
      return this;
    }

    order(column, opts = {}) {
      this.orderBy = { column, ascending: Boolean(opts.ascending) };
      return this;
    }

    then(resolve, reject) {
      try {
        let rows = applyFilters(dataByTable[this.table] || [], this.filters);
        if (this.orderBy) {
          const { column, ascending } = this.orderBy;
          rows = rows.sort((a, b) => {
            const av = a[column] || '';
            const bv = b[column] || '';
            if (av === bv) return 0;
            return ascending ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
          });
        }
        resolve({ data: rows, error: null });
      } catch (err) {
        if (reject) reject(err);
      }
    }
  }

  return {
    from(table) {
      return new Query(table);
    }
  };
}

async function readSheetFromBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return {
    sheet: workbook.getWorksheet('Declaraciones Salud'),
    workbook
  };
}

function getTableModel(sheet, name = 'DeclaracionesSaludTable') {
  const tables = sheet?.model?.tables || [];
  return tables.find((table) => table.name === name);
}

test('exportación excel: headers, estilos base, tabla, nombre de archivo por rango y normalización', async () => {
  __setSupabaseAdminForTests(createSupabaseMock({
    declarations: [
      {
        id: 'd1',
        user_id: 'u1',
        created_at: '2026-05-14T11:30:00.000Z',
        declared_at: '2026-05-14T11:30:00.000Z',
        has_symptoms: true,
        has_fever: false,
        recent_contact: false,
        policy_accepted: true,
        health_status: null,
        traffic_light: null,
        symptoms_detail: {}
      },
      {
        id: 'd2',
        user_id: 'u2',
        created_at: '2026-05-15T12:00:00.000Z',
        declared_at: '2026-05-15T12:00:00.000Z',
        has_symptoms: false,
        has_fever: true,
        recent_contact: true,
        policy_accepted: false,
        health_status: 'Apto',
        traffic_light: 'Verde',
        symptoms_detail: {}
      }
    ],
    profiles: [
      { id: 'u1', full_name: 'Ana Perez', email: 'ana@example.com' },
      { id: 'u2', full_name: 'Juan Diaz', email: 'juan@example.com' }
    ]
  }));

  const req = {
    body: {
      fromDate: '2026-05-01',
      toDate: '2026-05-15'
    }
  };
  const res = createMockRes();

  await exportHealthDeclarationsHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.match(
    String(res.headers['Content-Disposition'] || ''),
    /declaraciones_salud_2026-05-01_a_2026-05-15\.xlsx/
  );

  const { sheet } = await readSheetFromBuffer(res.buffer);
  const headers = sheet.getRow(1).values.slice(1);
  assert.deepEqual(headers, [
    'Usuario', 'Email', 'Fecha', 'Hora', 'Síntomas', 'Fiebre', 'Contacto', 'Política aceptada', 'Estado', 'Semáforo'
  ]);

  const table = getTableModel(sheet);
  assert.ok(table, 'Debe existir una tabla llamada DeclaracionesSaludTable');
  assert.equal(table.tableRef || table.ref, 'A1:J3');
  assert.equal(table.headerRow, true);
  assert.equal(table.totalsRow, false);
  assert.equal(table.autoFilterRef, 'A1:J3');
  assert.deepEqual((table.columns || []).map((c) => c.name), headers);
  assert.ok((table.columns || []).every((c) => c.filterButton !== false), 'Todas las columnas deben tener botón de filtro');

  assert.equal(sheet.autoFilter, undefined);

  assert.equal(sheet.views?.[0]?.state, 'frozen');
  assert.equal(sheet.views?.[0]?.ySplit, 1);
  assert.equal(sheet.getRow(1).font?.bold, true);

  const dataRows = [sheet.getRow(2), sheet.getRow(3)].map((r) => r.values.slice(1, 11));
  const anaRow = dataRows.find((r) => r[0] === 'Ana Perez');
  assert.ok(anaRow, 'Debe existir fila exportada para Ana Perez');
  assert.equal(anaRow[4], 'Sí');
  assert.equal(anaRow[5], 'No');
  assert.equal(anaRow[6], 'No');
  assert.equal(anaRow[7], 'Aceptada');
  assert.equal(anaRow[8], 'No Apto');
  assert.equal(anaRow[9], 'Amarillo');
  assert.equal(sheet.getRow(2).getCell(1).alignment?.horizontal, 'left');
  assert.equal(sheet.getRow(2).getCell(3).alignment?.horizontal, 'center');
});

test('exportación excel: con ids visibles exporta solo esas filas', async () => {
  __setSupabaseAdminForTests(createSupabaseMock({
    declarations: [
      {
        id: 'd1',
        user_id: 'u1',
        created_at: '2026-05-14T11:30:00.000Z',
        declared_at: '2026-05-14T11:30:00.000Z',
        has_symptoms: true,
        has_fever: false,
        recent_contact: false,
        policy_accepted: true,
        health_status: 'No Apto',
        traffic_light: 'Rojo',
        symptoms_detail: {}
      },
      {
        id: 'd2',
        user_id: 'u2',
        created_at: '2026-05-15T12:00:00.000Z',
        declared_at: '2026-05-15T12:00:00.000Z',
        has_symptoms: false,
        has_fever: false,
        recent_contact: false,
        policy_accepted: true,
        health_status: 'Apto',
        traffic_light: 'Verde',
        symptoms_detail: {}
      }
    ],
    profiles: [
      { id: 'u1', full_name: 'Ana Perez', email: 'ana@example.com' },
      { id: 'u2', full_name: 'Juan Diaz', email: 'juan@example.com' }
    ]
  }));

  const req = { body: { ids: ['d1'] } };
  const res = createMockRes();

  await exportHealthDeclarationsHandler(req, res);

  assert.equal(res.statusCode, 200);
  const { sheet } = await readSheetFromBuffer(res.buffer);
  assert.equal(sheet.rowCount, 2);
  const table = getTableModel(sheet);
  assert.ok(table, 'Debe existir tabla en exportación filtrada');
  assert.equal(table.autoFilterRef, 'A1:J2');
  assert.equal(sheet.getCell('A2').value, 'Ana Perez');
  assert.equal(sheet.getCell('J2').value, 'Rojo');
});
