import { PrismaClient } from '@prisma/client';
import defaultRules from '../../../shared/businessRules/defaultRules.json' with { type: 'json' };

const prisma = new PrismaClient();
let fallbackRules = (defaultRules || []).map((rule) => ({
  id: rule.id,
  name: rule.name || rule.nombre,
  keywords: Array.isArray(rule.keywords) ? [...rule.keywords] : [],
  category: rule.category || rule.categoria,
  severity: rule.severity || rule.gravedad || 'media',
  suggestedAction: rule.suggestedAction || rule.accion_inmediata || 'aviso',
  origen: rule.origen || 'interno',
  accion_inmediata: rule.accion_inmediata || rule.suggestedAction || 'aviso',
  accion_correctiva: rule.accion_correctiva || '',
  peso: Number.isFinite(Number(rule.peso)) ? Math.min(3, Math.max(1, Number(rule.peso))) : 1,
  enabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}));

function normalizePeso(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(3, Math.max(1, numeric));
}

function parseRuleMetadata(rawKeywords) {
  if (Array.isArray(rawKeywords)) {
    return { keywords: rawKeywords };
  }

  if (typeof rawKeywords === 'string') {
    try {
      const parsed = JSON.parse(rawKeywords);
      if (Array.isArray(parsed)) {
        return { keywords: parsed };
      }
      if (parsed && typeof parsed === 'object') {
        return {
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
          origen: parsed.origen,
          accion_inmediata: parsed.accion_inmediata,
          accion_correctiva: parsed.accion_correctiva,
          peso: parsed.peso
        };
      }
    } catch {
      return {
        keywords: rawKeywords
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      };
    }
  }

  return { keywords: [] };
}

function buildStoredKeywordsPayload({ keywords, origen, accion_inmediata, accion_correctiva, peso }) {
  return JSON.stringify({
    keywords: Array.isArray(keywords) ? keywords : [],
    origen: origen || 'interno',
    accion_inmediata: accion_inmediata || '',
    accion_correctiva: accion_correctiva || '',
    peso: normalizePeso(peso)
  });
}

function toApiRule(rule) {
  const metadata = parseRuleMetadata(rule.keywords);
  const accionInmediata = metadata.accion_inmediata || rule.suggestedAction || 'aviso';
  const accionCorrectiva = metadata.accion_correctiva || '';
  const origen = metadata.origen || rule.origen || 'interno';
  const peso = normalizePeso(metadata.peso ?? rule.peso);

  return {
    ...rule,
    keywords: metadata.keywords || [],
    origen,
    accion_inmediata: accionInmediata,
    accion_correctiva: accionCorrectiva,
    peso,
    nombre: rule.name,
    categoria: rule.category,
    gravedad: rule.severity,
    suggestedAction: accionInmediata
  };
}

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
    const resolvedImmediateAction = accion_inmediata || suggestedAction || 'aviso';

    if (!resolvedName || !keywords || !resolvedCategory) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const rule = await prisma.businessRule.create({
      data: {
        name: resolvedName,
        keywords: buildStoredKeywordsPayload({
          keywords,
          origen,
          accion_inmediata: resolvedImmediateAction,
          accion_correctiva,
          peso
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
    const resolvedImmediateAction = accion_inmediata || suggestedAction || 'aviso';
    const nextId = fallbackRules.length ? Math.max(...fallbackRules.map((r) => Number(r.id) || 0)) + 1 : 1;
    const now = new Date().toISOString();
    const fallbackRule = {
      id: nextId,
      name: resolvedName,
      keywords: Array.isArray(keywords) ? keywords : [],
      category: resolvedCategory,
      severity: resolvedSeverity,
      suggestedAction: resolvedImmediateAction,
      origen: origen || 'interno',
      accion_inmediata: resolvedImmediateAction,
      accion_correctiva: accion_correctiva || '',
      peso: normalizePeso(peso),
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

    const rule = await prisma.businessRule.update({
      where: { id: parseInt(id) },
      data: {
        name: name || nombre || undefined,
        keywords: keywords || accion_inmediata || accion_correctiva || origen || peso !== undefined
          ? buildStoredKeywordsPayload({
              keywords: keywords || parseRuleMetadata((await prisma.businessRule.findUnique({ where: { id: parseInt(id) } }))?.keywords).keywords,
              origen,
              accion_inmediata: accion_inmediata || suggestedAction,
              accion_correctiva,
              peso
            })
          : undefined,
        category: category || categoria || undefined,
        severity: severity || gravedad || undefined,
        suggestedAction: accion_inmediata || suggestedAction || undefined,
        enabled: enabled !== undefined ? enabled : undefined
      }
    });

    res.json(toApiRule(rule));
  } catch (error) {
    const { id } = req.params;
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
    const numericId = parseInt(id);
    const index = fallbackRules.findIndex((rule) => Number(rule.id) === numericId);

    if (index < 0) {
      return res.status(404).json({ error: 'Regla no encontrada' });
    }

    const current = fallbackRules[index];
    const updated = {
      ...current,
      name: name ?? nombre ?? current.name,
      keywords: keywords ?? current.keywords,
      category: category ?? categoria ?? current.category,
      severity: severity ?? gravedad ?? current.severity,
      suggestedAction: accion_inmediata ?? suggestedAction ?? current.suggestedAction,
      origen: origen ?? current.origen,
      accion_inmediata: accion_inmediata ?? current.accion_inmediata,
      accion_correctiva: accion_correctiva ?? current.accion_correctiva,
      peso: peso !== undefined ? normalizePeso(peso) : current.peso,
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
      where: { id: parseInt(id) }
    });

    res.json({ success: true });
  } catch (error) {
    const { id } = req.params;
    const numericId = parseInt(id);
    fallbackRules = fallbackRules.filter((rule) => Number(rule.id) !== numericId);
    res.json({ success: true });
  }
}
