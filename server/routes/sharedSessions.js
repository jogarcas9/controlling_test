const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getAllSessions,
    createSession,
    updateSession,
    deleteSession,
    getBudget,
    updateBudget,
    addExpense,
    deleteExpense,
    respondToInvitation,
    getSharedSessionDetails
} = require('../controllers/sharedSessionController');

// Rutas protegidas por autenticación
router.use(auth);

// @route   GET /api/shared-sessions
// @desc    Obtener todas las sesiones del usuario
// @access  Private
router.get('/', getAllSessions);

// @route   POST /api/shared-sessions
// @desc    Crear una nueva sesión compartida
// @access  Private
router.post('/', createSession);

// @route   POST /api/shared-sessions/:id/respond
// @desc    Responder a una invitación
// @access  Private
router.post('/:id/respond', respondToInvitation);

// @route   GET /api/shared-sessions/:id
// @desc    Obtener una sesión específica
// @access  Private
router.get('/:id', getSharedSessionDetails);

// @route   PUT /api/shared-sessions/:id
// @desc    Actualizar una sesión
// @access  Private
router.put('/:id', updateSession);

// @route   DELETE /api/shared-sessions/:id
// @desc    Eliminar una sesión
// @access  Private
router.delete('/:id', deleteSession);

// @route   GET /api/shared-sessions/:id/budget
// @desc    Obtener el presupuesto de una sesión
// @access  Private
router.get('/:id/budget', getBudget);

// @route   PUT /api/shared-sessions/:id/budget
// @desc    Actualizar el presupuesto de una sesión
// @access  Private
router.put('/:id/budget', updateBudget);

// @route   POST /api/shared-sessions/:id/expenses
// @desc    Agregar un gasto a una sesión
// @access  Private
router.post('/:id/expenses', addExpense);

// @route   DELETE /api/shared-sessions/:sessionId/expenses/:expenseId
// @desc    Eliminar un gasto de una sesión
// @access  Private
router.delete('/:sessionId/expenses/:expenseId', deleteExpense);

module.exports = router; 