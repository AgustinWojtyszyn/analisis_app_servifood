import { PrismaClient } from '@prisma/client';
import defaultRules from '../../../shared/businessRules/defaultRules.json' with { type: 'json' };

const prisma = new PrismaClient();
let fallbackRules = (defaultRules || []).map((rule) => ({
  id: rule.id,
  name: rule.name,
  keywords: Array.isArray(rule.keywords) ? [...rule.keywords] : [],
  category: rule.category,
  severity: rule.severity || 'media',
  suggestedAction: rule.suggestedAction || 'aviso',
  enabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}));

function toApiRule(rule) {
  return {
    ...rule,
    keywords: typeof rule.keywords === 'string' ? JSON.parse(rule.keywords) : rule.keywords
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
    const { name, keywords, category, severity, suggestedAction } = req.body;

    if (!name || !keywords || !category) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const rule = await prisma.businessRule.create({
      data: {
        name,
        keywords: JSON.stringify(keywords),
        category,
        severity,
        suggestedAction
      }
    });

    res.status(201).json({
      ...rule,
      keywords: JSON.parse(rule.keywords)
    });
  } catch (error) {
    const { name, keywords, category, severity, suggestedAction } = req.body;
    const nextId = fallbackRules.length ? Math.max(...fallbackRules.map((r) => Number(r.id) || 0)) + 1 : 1;
    const now = new Date().toISOString();
    const fallbackRule = {
      id: nextId,
      name,
      keywords: Array.isArray(keywords) ? keywords : [],
      category,
      severity: severity || 'media',
      suggestedAction: suggestedAction || 'aviso',
      enabled: true,
      createdAt: now,
      updatedAt: now
    };
    fallbackRules.unshift(fallbackRule);
    res.status(201).json(fallbackRule);
  }
}

/**
 * Actualizar una regla de negocio
 */
export async function updateRule(req, res) {
  try {
    const { id } = req.params;
    const { name, keywords, category, severity, suggestedAction, enabled } = req.body;

    const rule = await prisma.businessRule.update({
      where: { id: parseInt(id) },
      data: {
        name: name || undefined,
        keywords: keywords ? JSON.stringify(keywords) : undefined,
        category: category || undefined,
        severity: severity || undefined,
        suggestedAction: suggestedAction || undefined,
        enabled: enabled !== undefined ? enabled : undefined
      }
    });

    res.json({
      ...rule,
      keywords: JSON.parse(rule.keywords)
    });
  } catch (error) {
    const { id } = req.params;
    const { name, keywords, category, severity, suggestedAction, enabled } = req.body;
    const numericId = parseInt(id);
    const index = fallbackRules.findIndex((rule) => Number(rule.id) === numericId);

    if (index < 0) {
      return res.status(404).json({ error: 'Regla no encontrada' });
    }

    const current = fallbackRules[index];
    const updated = {
      ...current,
      name: name ?? current.name,
      keywords: keywords ?? current.keywords,
      category: category ?? current.category,
      severity: severity ?? current.severity,
      suggestedAction: suggestedAction ?? current.suggestedAction,
      enabled: enabled ?? current.enabled,
      updatedAt: new Date().toISOString()
    };

    fallbackRules[index] = updated;
    res.json(updated);
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
