import { PrismaClient } from '@prisma/client';
import defaultRules from '../../../shared/businessRules/defaultRules.json' with { type: 'json' };

const prisma = new PrismaClient();

function normalizePeso(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(3, Math.max(1, numeric));
}

function inferPesoByContext(category, severity) {
  const normalizedCategory = String(category || '').toLowerCase();
  const normalizedSeverity = String(severity || '').toLowerCase();
  if (normalizedCategory === 'inocuidad' && normalizedSeverity === 'alta') return 3;
  if (normalizedCategory === 'operativo') return 2;
  if (normalizedCategory === 'documentacion') return 1;
  return 1;
}

function resolvePeso(value, category, severity) {
  const normalized = normalizePeso(value);
  if (normalized != null) return normalized;
  return inferPesoByContext(category, severity);
}

function resolveAction(value, fallback) {
  const text = String(value ?? '').trim();
  return text && text !== '-' ? text : fallback;
}

function normalizeKeywords(value) {
  if (Array.isArray(value)) return value.map((k) => String(k).trim()).filter(Boolean);

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((k) => String(k).trim()).filter(Boolean);
      }
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.keywords)) {
        return parsed.keywords.map((k) => String(k).trim()).filter(Boolean);
      }
    } catch {
      return value.split(',').map((k) => k.trim()).filter(Boolean);
    }
  }

  return [];
}

function parseRuleMetadata(rawKeywords) {
  if (Array.isArray(rawKeywords)) {
    return { keywords: normalizeKeywords(rawKeywords) };
  }

  if (typeof rawKeywords === 'string') {
    try {
      const parsed = JSON.parse(rawKeywords);
      if (Array.isArray(parsed)) {
        return { keywords: normalizeKeywords(parsed) };
      }
      if (parsed && typeof parsed === 'object') {
        return {
          keywords: normalizeKeywords(parsed.keywords),
          origen: parsed.origen,
          accion_inmediata: parsed.accion_inmediata,
          accion_correctiva: parsed.accion_correctiva,
          peso: parsed.peso
        };
      }
    } catch {
      return { keywords: normalizeKeywords(rawKeywords) };
    }
  }

  return { keywords: [] };
}

function buildStoredKeywordsPayload({ keywords, origen, accion_inmediata, accion_correctiva, peso }) {
  return JSON.stringify({
    keywords: normalizeKeywords(keywords),
    origen: origen || 'interno',
    accion_inmediata: accion_inmediata || 'Registrar incidencia y notificar',
    accion_correctiva: accion_correctiva || 'Definir mejora y seguimiento',
    peso: peso
  });
}

function toApiRule(rule) {
  const metadata = parseRuleMetadata(rule.keywords);
  const accionInmediata = resolveAction(metadata.accion_inmediata, rule.suggestedAction || 'Registrar incidencia y notificar');
  const accionCorrectiva = resolveAction(metadata.accion_correctiva, 'Definir mejora y seguimiento');
  const resolvedPeso = resolvePeso(metadata.peso ?? rule.peso, rule.category, rule.severity);

  return {
    ...rule,
    keywords: metadata.keywords || [],
    origen: metadata.origen || rule.origen || 'interno',
    accion_inmediata: accionInmediata,
    accion_correctiva: accionCorrectiva,
    peso: resolvedPeso,
    nombre: rule.name,
    categoria: rule.category,
    gravedad: rule.severity,
    suggestedAction: accionInmediata
  };
}

let fallbackRules = (defaultRules || []).map((rule) => ({
  id: rule.id,
  name: rule.name || rule.nombre,
  keywords: buildStoredKeywordsPayload({
    keywords: rule.keywords,
    origen: rule.origen,
    accion_inmediata: rule.accion_inmediata || rule.suggestedAction,
    accion_correctiva: rule.accion_correctiva,
    peso: resolvePeso(rule.peso, rule.category || rule.categoria, rule.severity || rule.gravedad)
  }),
  category: rule.category || rule.categoria,
  severity: rule.severity || rule.gravedad || 'media',
  suggestedAction: rule.suggestedAction || rule.accion_inmediata || 'aviso',
  enabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}));

/**
 * Obtener todas las reglas de negocio
 */
export async function getRules(req, res) {
  try {
    const rules = await prisma.businessRule.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json(rules.map(toApiRule));
  } catch (error) {
    console.warn('Error obteniendo reglas por Prisma, usando fallback en memoria:', error?.message || error);
    res.json(fallbackRules.map(toApiRule));
  }
}

/**
 * Crear una nueva regla de negocio
 */
export async function createRule(req, res) {
  try {
    const {
      name,
      nombre,
      keywords,
      category,
      categoria,
      severity,
      gravedad,
      suggestedAction,
      accion_inmediata,
      accion_correctiva,
      origen,
      peso
    } = req.body;

    const resolvedName = name || nombre;
    const resolvedCategory = category || categoria;
    const resolvedSeverity = severity || gravedad || 'media';
    const resolvedImmediateAction = resolveAction(
      accion_inmediata || suggestedAction,
      'Registrar incidencia y notificar'
    );
    const resolvedCorrectiveAction = resolveAction(
      accion_correctiva,
      'Definir mejora y seguimiento'
    );
    const resolvedKeywords = normalizeKeywords(keywords);
    const resolvedPeso = resolvePeso(peso, resolvedCategory, resolvedSeverity);

    if (!resolvedName || !resolvedCategory || resolvedKeywords.length === 0) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const rule = await prisma.businessRule.create({
      data: {
        name: resolvedName,
        keywords: buildStoredKeywordsPayload({
          keywords: resolvedKeywords,
          origen,
          accion_inmediata: resolvedImmediateAction,
          accion_correctiva: resolvedCorrectiveAction,
          peso: resolvedPeso
        }),
        category: resolvedCategory,
        severity: resolvedSeverity,
        suggestedAction: resolvedImmediateAction
      }
    });

    res.status(201).json(toApiRule(rule));
  } catch (error) {
    const {
      name,
      nombre,
      keywords,
      category,
      categoria,
      severity,
      gravedad,
      suggestedAction,
      accion_inmediata,
      accion_correctiva,
      origen,
      peso
    } = req.body;

    const resolvedName = name || nombre;
    const resolvedCategory = category || categoria;
    const resolvedSeverity = severity || gravedad || 'media';
    const resolvedImmediateAction = resolveAction(
      accion_inmediata || suggestedAction,
      'Registrar incidencia y notificar'
    );
    const resolvedCorrectiveAction = resolveAction(
      accion_correctiva,
      'Definir mejora y seguimiento'
    );
    const resolvedKeywords = normalizeKeywords(keywords);
    const resolvedPeso = resolvePeso(peso, resolvedCategory, resolvedSeverity);
    const nextId = fallbackRules.length ? Math.max(...fallbackRules.map((r) => Number(r.id) || 0)) + 1 : 1;
    const now = new Date().toISOString();

    const fallbackRule = {
      id: nextId,
      name: resolvedName,
      keywords: buildStoredKeywordsPayload({
        keywords: resolvedKeywords,
        origen,
        accion_inmediata: resolvedImmediateAction,
        accion_correctiva: resolvedCorrectiveAction,
        peso: resolvedPeso
      }),
      category: resolvedCategory,
      severity: resolvedSeverity,
      suggestedAction: resolvedImmediateAction,
      enabled: true,
      createdAt: now,
      updatedAt: now
    };

    fallbackRules.unshift(fallbackRule);
    res.status(201).json(toApiRule(fallbackRule));
  }
}

/**
 * Actualizar una regla de negocio
 */
export async function updateRule(req, res) {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);
    const {
      name,
      nombre,
      keywords,
      category,
      categoria,
      severity,
      gravedad,
      suggestedAction,
      accion_inmediata,
      accion_correctiva,
      origen,
      peso,
      enabled
    } = req.body;

    const currentRule = await prisma.businessRule.findUnique({ where: { id: numericId } });
    if (!currentRule) {
      return res.status(404).json({ error: 'Regla no encontrada' });
    }

    const currentMeta = parseRuleMetadata(currentRule.keywords);
    const nextKeywords = keywords !== undefined ? normalizeKeywords(keywords) : currentMeta.keywords;
    const nextOrigen = origen ?? currentMeta.origen ?? 'interno';
    const nextSeverity = severity ?? gravedad ?? currentRule.severity;
    const nextCategory = category ?? categoria ?? currentRule.category;
    const nextAccionInmediata = resolveAction(
      accion_inmediata ?? suggestedAction ?? currentMeta.accion_inmediata ?? currentRule.suggestedAction,
      'Registrar incidencia y notificar'
    );
    const nextAccionCorrectiva = resolveAction(
      accion_correctiva ?? currentMeta.accion_correctiva,
      'Definir mejora y seguimiento'
    );
    const nextPeso = resolvePeso(peso !== undefined ? peso : currentMeta.peso, nextCategory, nextSeverity);

    const rule = await prisma.businessRule.update({
      where: { id: numericId },
      data: {
        name: name ?? nombre ?? currentRule.name,
        keywords: buildStoredKeywordsPayload({
          keywords: nextKeywords,
          origen: nextOrigen,
          accion_inmediata: nextAccionInmediata,
          accion_correctiva: nextAccionCorrectiva,
          peso: nextPeso
        }),
        category: nextCategory,
        severity: nextSeverity,
        suggestedAction: nextAccionInmediata,
        enabled: enabled !== undefined ? enabled : currentRule.enabled
      }
    });

    res.json(toApiRule(rule));
  } catch (error) {
    const { id } = req.params;
    const numericId = parseInt(id, 10);
    const {
      name,
      nombre,
      keywords,
      category,
      categoria,
      severity,
      gravedad,
      suggestedAction,
      accion_inmediata,
      accion_correctiva,
      origen,
      peso,
      enabled
    } = req.body;

    const index = fallbackRules.findIndex((rule) => Number(rule.id) === numericId);

    if (index < 0) {
      return res.status(404).json({ error: 'Regla no encontrada' });
    }

    const current = fallbackRules[index];
    const currentMeta = parseRuleMetadata(current.keywords);
    const nextKeywords = keywords !== undefined ? normalizeKeywords(keywords) : currentMeta.keywords;
    const nextOrigen = origen ?? currentMeta.origen ?? 'interno';
    const nextSeverity = severity ?? gravedad ?? current.severity;
    const nextCategory = category ?? categoria ?? current.category;
    const nextAccionInmediata = resolveAction(
      accion_inmediata ?? suggestedAction ?? currentMeta.accion_inmediata ?? current.suggestedAction,
      'Registrar incidencia y notificar'
    );
    const nextAccionCorrectiva = resolveAction(
      accion_correctiva ?? currentMeta.accion_correctiva,
      'Definir mejora y seguimiento'
    );
    const nextPeso = resolvePeso(peso !== undefined ? peso : currentMeta.peso, nextCategory, nextSeverity);

    const updated = {
      ...current,
      name: name ?? nombre ?? current.name,
      keywords: buildStoredKeywordsPayload({
        keywords: nextKeywords,
        origen: nextOrigen,
        accion_inmediata: nextAccionInmediata,
        accion_correctiva: nextAccionCorrectiva,
        peso: nextPeso
      }),
      category: nextCategory,
      severity: nextSeverity,
      suggestedAction: nextAccionInmediata,
      enabled: enabled ?? current.enabled,
      updatedAt: new Date().toISOString()
    };

    fallbackRules[index] = updated;
    res.json(toApiRule(updated));
  }
}

/**
 * Eliminar una regla de negocio
 */
export async function deleteRule(req, res) {
  try {
    const { id } = req.params;

    await prisma.businessRule.delete({
      where: { id: parseInt(id, 10) }
    });

    res.json({ success: true });
  } catch (error) {
    const { id } = req.params;
    const numericId = parseInt(id, 10);
    fallbackRules = fallbackRules.filter((rule) => Number(rule.id) !== numericId);
    res.json({ success: true });
  }
}
