import ExcelJS from 'exceljs';
import { getSupabaseAdmin } from './context.js';
import {
  buildHealthEvaluation,
  getDateTimeParts,
  loadProfilesMap,
  normalizeStatus,
  normalizeTrafficLight,
  toIsoDate,
  toPolicyValue,
  toYesNo
} from './helpers.js';
import { safeExcelCell } from '../../utils/safeExcelCell.js';

export async function exportHealthDeclarationsHandler(req, res) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const requestedIds = Array.isArray(req.body?.ids)
      ? [...new Set(req.body.ids.filter((id) => typeof id === 'string' && id.trim()))]
      : [];

    let query = supabaseAdmin
      .from('health_declarations')
      .select('*')
      .order('created_at', { ascending: false });

    if (requestedIds.length) {
      query = query.in('id', requestedIds);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message || 'Error exportando declaraciones' });
    }

    const profileMap = await loadProfilesMap((data || []).map((item) => item.user_id));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Declaraciones Salud');

    const tableRows = [];
    for (const row of data || []) {
      const profile = profileMap.get(row.user_id) || null;
      const declaredAt = row.declared_at || row.created_at || null;
      const { fecha, hora } = getDateTimeParts(declaredAt);
      const evalRow = buildHealthEvaluation({
        hasSymptoms: Boolean(row.has_symptoms),
        hasFever: Boolean(row.has_fever),
        recentContact: Boolean(row.recent_contact),
        symptomsDetail: row.symptoms_detail || {}
      });
      tableRows.push([
        profile?.full_name || profile?.email || row.user_id,
        profile?.email || '',
        fecha,
        hora,
        toYesNo(row.has_symptoms === true),
        toYesNo(row.has_fever === true),
        toYesNo(row.recent_contact === true),
        toPolicyValue(row.policy_accepted === true),
        normalizeStatus(row.health_status || evalRow.healthStatus),
        normalizeTrafficLight(row.traffic_light || evalRow.trafficLight)
      ].map(safeExcelCell));
    }

    sheet.addTable({
      name: 'DeclaracionesSaludTable',
      ref: 'A1',
      headerRow: true,
      totalsRow: false,
      style: {
        theme: 'TableStyleLight9',
        showRowStripes: false
      },
      columns: [
        { name: 'Usuario', filterButton: true },
        { name: 'Email', filterButton: true },
        { name: 'Fecha', filterButton: true },
        { name: 'Hora', filterButton: true },
        { name: 'Síntomas', filterButton: true },
        { name: 'Fiebre', filterButton: true },
        { name: 'Contacto', filterButton: true },
        { name: 'Política aceptada', filterButton: true },
        { name: 'Estado', filterButton: true },
        { name: 'Semáforo', filterButton: true }
      ],
      rows: tableRows
    });

    sheet.getColumn(1).width = 24;
    sheet.getColumn(2).width = 34;
    sheet.getColumn(3).width = 14;
    sheet.getColumn(4).width = 10;
    sheet.getColumn(5).width = 12;
    sheet.getColumn(6).width = 10;
    sheet.getColumn(7).width = 12;
    sheet.getColumn(8).width = 16;
    sheet.getColumn(9).width = 14;
    sheet.getColumn(10).width = 12;

    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
    });

    for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
      const row = sheet.getRow(rowIndex);
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
      for (let col = 3; col <= 10; col += 1) {
        row.getCell(col).alignment = { vertical: 'middle', horizontal: 'center' };
      }
    }

    const exportedDates = (data || [])
      .map((row) => toIsoDate(row.declared_at || row.created_at))
      .filter(Boolean)
      .sort();
    const defaultIsoDate = new Date().toISOString().slice(0, 10);
    const fromIso = (typeof req.body?.fromDate === 'string' && req.body.fromDate) || exportedDates[0] || defaultIsoDate;
    const toIso = (typeof req.body?.toDate === 'string' && req.body.toDate) || exportedDates[exportedDates.length - 1] || defaultIsoDate;
    const fileName = `declaraciones_salud_${fromIso}_a_${toIso}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(Buffer.from(buffer));
  } catch {
    return res.status(500).json({ error: 'Error interno exportando declaraciones' });
  }
}
