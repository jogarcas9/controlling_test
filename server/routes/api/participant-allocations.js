const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const participantAllocationController = require('../../controllers/participantAllocationController');

// @route   GET /api/participant-allocations
// @desc    Obtener todas las asignaciones del usuario actual
// @access  Private
router.get('/', auth, participantAllocationController.getUserAllocations);

// @route   GET /api/participant-allocations/year/:year/month/:month
// @desc    Obtener asignaciones del usuario por año y mes
// @access  Private
router.get('/year/:year/month/:month', auth, participantAllocationController.getUserAllocationsByYearMonth);

// @route   GET /api/participant-allocations/session/:sessionId
// @desc    Obtener asignaciones de una sesión
// @access  Private
router.get('/session/:sessionId', auth, participantAllocationController.getSessionAllocations);

// @route   GET /api/participant-allocations/session/:sessionId/year/:year/month/:month
// @desc    Obtener asignaciones de una sesión por año y mes
// @access  Private
router.get('/session/:sessionId/year/:year/month/:month', auth, participantAllocationController.getSessionAllocationsByYearMonth);

// @route   PUT /api/participant-allocations/:id/status
// @desc    Actualizar el estado de una asignación
// @access  Private
router.put('/:id/status', auth, participantAllocationController.updateAllocationStatus);

// @route   DELETE /api/participant-allocations/:id
// @desc    Eliminar una asignación (solo para administradores)
// @access  Private
router.delete('/:id', auth, participantAllocationController.deleteAllocation);

module.exports = router; 