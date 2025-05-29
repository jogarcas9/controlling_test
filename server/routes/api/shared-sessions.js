const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const sharedSessionController = require('../../controllers/sharedSessionController');
const SharedSession = require('../../models/SharedSession');

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

// @route   POST api/shared-sessions/admin/update-usernames
// @desc    Actualizar nombres de usuario en las asignaciones
// @access  Private (Admin)
router.post('/admin/update-usernames', auth, sharedSessionController.updateAllocationUsernames);

// @route   POST api/shared-sessions/admin/generate-all-allocations
// @desc    Generar asignaciones mensuales para todas las sesiones
// @access  Private (Admin)
router.post('/admin/generate-all-allocations', auth, sharedSessionController.generateAllMonthlyAllocations);

// @route   POST api/shared-sessions/:id/generate-allocations
// @desc    Generar asignaciones mensuales para una sesión específica
// @access  Private
router.post('/:id/generate-allocations', auth, sharedSessionController.generateMonthlyAllocations);

// Ruta de prueba para validar la eliminación de gastos
router.get('/test-delete-expense/:id/:expenseId', auth, async (req, res) => {
  try {
    // Mantener consistencia con el controlador deleteExpense
    const { id, expenseId } = req.params;
    const sessionId = id; // Para compatibilidad con código existente
    const userId = req.user.id;
    
    console.log(`Probando eliminación de gasto - SessionID: ${sessionId}, ExpenseID: ${expenseId}, UserID: ${userId}`);
    
    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId: userId },
        { 'participants.userId': userId }
      ]
    });

    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada o no autorizada' });
    }

    // Buscar el gasto
    let gastoEncontrado = false;
    let isRecurringExpense = false;
    let expenseName = '';
    let expenseYear, expenseMonth;
    
    for (const yearData of session.yearlyExpenses || []) {
      for (const monthData of yearData.months || []) {
        const expense = (monthData.expenses || []).find(exp => 
          exp && exp._id && exp._id.toString() === expenseId
        );
        
        if (expense) {
          gastoEncontrado = true;
          isRecurringExpense = expense.isRecurring;
          expenseName = expense.name;
          expenseYear = yearData.year;
          expenseMonth = monthData.month;
          break;
        }
      }
      if (gastoEncontrado) break;
    }

    if (!gastoEncontrado) {
      return res.status(404).json({ msg: 'Gasto no encontrado en la sesión' });
    }
    
    // Determinar qué gastos se eliminarían
    const gastosAEliminar = [];
    
    if (isRecurringExpense) {
      for (const yearData of session.yearlyExpenses || []) {
        if (yearData.year < expenseYear) continue;
        
        for (const monthData of yearData.months || []) {
          if (yearData.year === expenseYear && monthData.month < expenseMonth) continue;
          
          const recurrentExpenses = (monthData.expenses || []).filter(exp => 
            exp && exp.name === expenseName && exp.isRecurring
          );
          
          if (recurrentExpenses.length > 0) {
            gastosAEliminar.push({
              year: yearData.year,
              month: monthData.month,
              expenses: recurrentExpenses.map(e => ({
                _id: e._id.toString(),
                name: e.name,
                amount: e.amount,
                date: e.date
              }))
            });
          }
        }
      }
    } else {
      // Para gasto normal, solo incluir el gasto específico
      gastosAEliminar.push({
        year: expenseYear,
        month: expenseMonth,
        expenses: [{
          _id: expenseId,
          name: expenseName
        }]
      });
    }
    
    res.json({
      sessionId,
      expenseId,
      isRecurring: isRecurringExpense,
      expenseName,
      year: expenseYear,
      month: expenseMonth,
      gastosAEliminar
    });
    
  } catch (err) {
    console.error('Error en prueba de eliminación:', err);
    res.status(500).json({ 
      msg: 'Error al probar la eliminación del gasto', 
      error: err.message 
    });
  }
});

// @route   PUT api/shared-sessions/:id/participants
// @desc    Actualizar participantes y sincronizar distribución
// @access  Private
router.put('/:id/participants', auth, sharedSessionController.updateParticipants);

module.exports = router; 