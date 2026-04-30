import '../config/env.js';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

function startAndEndOfToday() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString(), date: start.toISOString().slice(0, 10) };
}

function mapDeclaration(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    declarationDate: row.declaration_date || null,
    declaredAt: row.declared_at || row.created_at || null,
    hasSymptoms: Boolean(row.has_symptoms),
    hasFever: Boolean(row.has_fever),
    recentContact: Boolean(row.recent_contact),
    commitInform: Boolean(row.commit_inform),
    policyAccepted: Boolean(row.policy_accepted),
    policyId: row.policy_id || null,
    createdAt: row.created_at || null
  };
}

async function getTodayDeclaration(userId) {
  const { start, end, date } = startAndEndOfToday();

  let query = await supabaseAdmin
    .from('health_declarations')
    .select('*')
    .eq('user_id', userId)
    .eq('declaration_date', date)
    .order('created_at', { ascending: false })
    .limit(1);

  if (query.error) {
    query = await supabaseAdmin
      .from('health_declarations')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false })
      .limit(1);
  }

  return query;
}

router.get('/health-policies/active', authenticateToken, async (_req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { data, error } = await supabaseAdmin
      .from('health_policies')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message || 'Error consultando políticas' });
    }

    return res.json(data || null);
  } catch (error) {
    return res.status(500).json({ error: 'Error interno consultando política activa' });
  }
});

router.get('/health-declarations/today', authenticateToken, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { data, error } = await getTodayDeclaration(req.user.id);

    if (error) {
      return res.status(500).json({ error: error.message || 'Error consultando declaración diaria' });
    }

    const row = data?.[0] || null;
    return res.json({ completed: Boolean(row), declaration: mapDeclaration(row) });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno consultando declaración diaria' });
  }
});

router.post('/health-declarations', authenticateToken, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const {
      hasSymptoms,
      hasFever,
      recentContact,
      commitInform,
      policyAccepted,
      policyId = null
    } = req.body || {};

    const requiredBooleans = [hasSymptoms, hasFever, recentContact, commitInform, policyAccepted];
    if (requiredBooleans.some((value) => typeof value !== 'boolean')) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (!commitInform) {
      return res.status(400).json({ error: 'Debes comprometerte a informar síntomas durante la jornada' });
    }

    if (!policyAccepted) {
      return res.status(400).json({ error: 'Debes aceptar la política vigente' });
    }

    const todayResult = await getTodayDeclaration(req.user.id);
    if (!todayResult.error && todayResult.data?.length) {
      return res.status(409).json({ error: 'Ya completaste la declaración de hoy' });
    }

    const { date } = startAndEndOfToday();

    const insertPayload = {
      user_id: req.user.id,
      declaration_date: date,
      declared_at: new Date().toISOString(),
      has_symptoms: hasSymptoms,
      has_fever: hasFever,
      recent_contact: recentContact,
      commit_inform: commitInform,
      policy_accepted: policyAccepted,
      policy_id: policyId
    };

    const { data, error } = await supabaseAdmin
      .from('health_declarations')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      if (String(error.message || '').toLowerCase().includes('duplicate') || String(error.code || '') === '23505') {
        return res.status(409).json({ error: 'Ya completaste la declaración de hoy' });
      }
      return res.status(500).json({ error: error.message || 'Error guardando declaración' });
    }

    const risk = Boolean(hasSymptoms || hasFever || recentContact);
    return res.status(201).json({ success: true, risk, declaration: mapDeclaration(data) });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno guardando declaración' });
  }
});

router.get('/health-declarations/me', authenticateToken, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { data, error } = await supabaseAdmin
      .from('health_declarations')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message || 'Error consultando historial' });
    }

    return res.json((data || []).map(mapDeclaration));
  } catch (error) {
    return res.status(500).json({ error: 'Error interno consultando historial' });
  }
});

router.get('/health-declarations/admin', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { data, error } = await supabaseAdmin
      .from('health_declarations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message || 'Error consultando declaraciones' });
    }

    return res.json((data || []).map(mapDeclaration));
  } catch (error) {
    return res.status(500).json({ error: 'Error interno consultando declaraciones' });
  }
});

router.delete('/health-declarations/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from('health_declarations')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message || 'Error eliminando declaración' });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno eliminando declaración' });
  }
});

router.post('/health-declarations/export', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase no está configurado en el backend' });
    }

    const { data, error } = await supabaseAdmin
      .from('health_declarations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message || 'Error exportando declaraciones' });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Declaraciones');

    sheet.columns = [
      { header: 'usuario', key: 'usuario', width: 40 },
      { header: 'fecha', key: 'fecha', width: 15 },
      { header: 'sintomas', key: 'sintomas', width: 12 },
      { header: 'fiebre', key: 'fiebre', width: 12 },
      { header: 'contacto', key: 'contacto', width: 12 },
      { header: 'politica', key: 'politica', width: 12 },
      { header: 'hora', key: 'hora', width: 25 }
    ];

    for (const row of data || []) {
      const declaredAt = row.declared_at || row.created_at || null;
      const dateObj = declaredAt ? new Date(declaredAt) : null;
      sheet.addRow({
        usuario: row.user_id,
        fecha: row.declaration_date || (dateObj ? dateObj.toISOString().slice(0, 10) : ''),
        sintomas: row.has_symptoms ? 'si' : 'no',
        fiebre: row.has_fever ? 'si' : 'no',
        contacto: row.recent_contact ? 'si' : 'no',
        politica: row.policy_accepted ? 'aceptada' : 'no aceptada',
        hora: declaredAt || ''
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="health_declarations_${Date.now()}.xlsx"`);
    return res.send(Buffer.from(buffer));
  } catch (error) {
    return res.status(500).json({ error: 'Error interno exportando declaraciones' });
  }
});

export default router;
