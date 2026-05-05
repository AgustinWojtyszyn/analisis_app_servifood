import express from 'express';
import { getRules, createRule, updateRule, deleteRule } from '../controllers/rulesController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

/**
 * GET /api/rules
 * Obtener todas las reglas de negocio
 */
router.get('/', authenticateToken, requireAdmin, getRules);
/**
 * POST /api/rules
 * Crear una nueva regla (solo admin)
 */
router.post('/', authenticateToken, requireAdmin, createRule);

/**
 * PUT /api/rules/:id
 * Actualizar una regla (solo admin)
 */
router.put('/:id', authenticateToken, requireAdmin, updateRule);

/**
 * DELETE /api/rules/:id
 * Eliminar una regla (solo admin)
 */
router.delete('/:id', authenticateToken, requireAdmin, deleteRule);

export default router;
