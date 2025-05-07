const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const sharedSessionController = require('../../controllers/sharedSessionController');

// @route   GET api/shared-sessions
// @desc    Obtener todas las sesiones del usuario
// @access  Private
router.get('/', auth, sharedSessionController.getAllSessions);

// @route   POST api/shared-sessions
// @desc    Crear una nueva sesión compartida
// @access  Private
router.post('/', [
  auth,
  [
    check('name', 'El nombre es requerido').not().isEmpty(),
    check('participants', 'Los participantes deben ser un array').isArray(),
    check('description', 'La descripción es opcional').optional()
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
], sharedSessionController.createSession);

// @route   GET api/shared-sessions/:id
// @desc    Obtener detalles de una sesión
// @access  Private
router.get('/:id', auth, sharedSessionController.getSharedSessionDetails);

// @route   PUT api/shared-sessions/:id
// @desc    Actualizar una sesión
// @access  Private
router.put('/:id', auth, sharedSessionController.updateSession);

// @route   DELETE api/shared-sessions/:id
// @desc    Eliminar una sesión
// @access  Private
router.delete('/:id', auth, sharedSessionController.deleteSession);

// @route   GET api/shared-sessions/invitations/pending
// @desc    Obtener todas las invitaciones pendientes para el usuario actual
// @access  Private
router.get('/invitations/pending', auth, sharedSessionController.getPendingInvitations);

// @route   POST api/shared-sessions/:id/respond
// @desc    Responder a una invitación (aceptar o rechazar)
// @access  Private
router.post('/:id/respond', auth, sharedSessionController.respondToInvitation);

// @route   POST api/shared-sessions/:id/invite
// @desc    Compatible con método anterior - redirige a respondToInvitation
// @access  Private
router.post('/:id/invite', auth, sharedSessionController.inviteParticipants);

// @route   POST api/shared-sessions/:id/sync-to-personal
// @desc    Sincronizar gastos compartidos a personales
// @access  Private
router.post('/:id/sync-to-personal', auth, sharedSessionController.syncToPersonal);

// @route   PUT api/shared-sessions/:id/update-distribution
// @desc    Actualizar la distribución de gastos
// @access  Private
router.put('/:id/update-distribution', auth, sharedSessionController.updateDistribution);

// @route   GET api/shared-sessions/:id/allocations
// @desc    Obtener asignaciones de montos por participante
// @access  Private
router.get('/:id/allocations', auth, sharedSessionController.getSessionAllocations);

// @route   GET api/shared-sessions/user/allocations
// @desc    Obtener asignaciones de un usuario
// @access  Private
router.get('/user/allocations', auth, sharedSessionController.getUserAllocations);

// @route   PUT api/shared-sessions/allocations/:allocationId
// @desc    Actualizar estado de una asignación
// @access  Private
router.put('/allocations/:allocationId', auth, sharedSessionController.updateAllocationStatus);

// @route   POST api/shared-sessions/:id/expenses
// @desc    Añadir un gasto a una sesión compartida
// @access  Private
router.post('/:id/expenses', auth, sharedSessionController.addExpense);

// @route   PUT api/shared-sessions/:id/expenses/:expenseId
// @desc    Actualizar un gasto en una sesión compartida
// @access  Private
router.put('/:id/expenses/:expenseId', auth, sharedSessionController.updateExpense);

// @route   DELETE api/shared-sessions/:id/expenses/:expenseId
// @desc    Eliminar un gasto de una sesión compartida
// @access  Private
router.delete('/:id/expenses/:expenseId', auth, sharedSessionController.deleteExpense);

// @route   GET api/shared-sessions/:id/expenses-by-month
// @desc    Obtener los gastos de un mes y año específico
// @access  Private
router.get('/:id/expenses-by-month', auth, sharedSessionController.getExpensesByMonth);

// @route   POST api/shared-sessions/:id/repair
// @desc    Reparar la estructura de datos de una sesión si tiene problemas
// @access  Private
router.post('/:id/repair', auth, sharedSessionController.repairSessionStructure);

// Ruta para reparar fechas de gastos en una sesión
router.post('/:id/repair-dates', auth, sharedSessionController.repairExpenseDates);

// Ruta para reparar la estructura de meses en todas las sesiones (admin only)
router.post('/admin/repair-month-structure', auth, sharedSessionController.repairAllSessionsMonthStructure);

module.exports = router; 