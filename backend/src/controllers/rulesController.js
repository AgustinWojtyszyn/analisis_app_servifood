import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Obtener todas las reglas de negocio
 */
export async function getRules(req, res) {
  try {
    const rules = await prisma.businessRule.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json(rules);
  } catch (error) {
    console.error('Error obteniendo reglas:', error);
    res.status(500).json({ error: 'Error obteniendo reglas' });
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
    console.error('Error creando regla:', error);
    res.status(500).json({ error: 'Error creando regla' });
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
    console.error('Error actualizando regla:', error);
    res.status(500).json({ error: 'Error actualizando regla' });
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
    console.error('Error eliminando regla:', error);
    res.status(500).json({ error: 'Error eliminando regla' });
  }
}
