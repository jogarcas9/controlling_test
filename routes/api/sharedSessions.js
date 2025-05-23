const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const SharedSession = require('../../models/SharedSession');

// @route   POST /api/shared-sessions/create-base
// @desc    Crear una nueva sesión compartida (paso 1)
// @access  Private
router.post('/create-base', auth, async (req, res) => {
  try {
    const { name, description, sessionType, participants } = req.body;

    // Validaciones básicas
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }

    if (!participants || !Array.isArray(participants)) {
      return res.status(400).json({ message: 'La lista de participantes es inválida' });
    }

    // Crear la sesión base
    const session = new SharedSession({
      name: name.trim(),
      description: description?.trim() || '',
      sessionType: sessionType || 'single',
      participants: participants.map(p => ({
        email: p.email.toLowerCase(),
        name: p.name || p.email.split('@')[0],
        canEdit: p.canEdit || false,
        canDelete: p.canDelete || false,
        status: p.status || 'pending',
        role: p.role || 'member'
      })),
      creator: req.user.id,
      createdAt: new Date()
    });

    await session.save();
    
    console.log(`Sesión base creada con ID: ${session._id}`);
    res.json({ 
      sessionId: session._id,
      message: 'Sesión base creada exitosamente'
    });

  } catch (error) {
    console.error('Error al crear sesión base:', error);
    res.status(500).json({ 
      message: 'Error al crear la sesión base',
      error: error.message 
    });
  }
});

// @route   POST /api/shared-sessions/:sessionId/configure
// @desc    Configurar una sesión existente con meses y asignaciones (paso 2)
// @access  Private
router.post('/:sessionId/configure', auth, async (req, res) => {
  try {
    const { yearlyExpenses, recurringConfig } = req.body;
    const sessionId = req.params.sessionId;

    // Validaciones básicas
    if (!yearlyExpenses || !Array.isArray(yearlyExpenses)) {
      return res.status(400).json({ message: 'La estructura de gastos anuales es inválida' });
    }

    // Obtener la sesión
    const session = await SharedSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Sesión no encontrada' });
    }

    // Verificar permisos
    if (session.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permiso para modificar esta sesión' });
    }

    // Actualizar la sesión con los datos de configuración
    session.yearlyExpenses = yearlyExpenses.map(year => ({
      year: year.year,
      months: year.months.map(month => ({
        month: month.month,
        expenses: [],
        allocations: month.allocations.map(alloc => ({
          email: alloc.email.toLowerCase(),
          percentage: alloc.percentage,
          status: alloc.status || 'pending'
        }))
      }))
    }));

    if (recurringConfig) {
      session.recurringConfig = recurringConfig;
    }

    session.lastUpdated = new Date();
    await session.save();

    console.log(`Sesión ${sessionId} configurada exitosamente`);
    res.json(session);

  } catch (error) {
    console.error('Error al configurar sesión:', error);
    res.status(500).json({ 
      message: 'Error al configurar la sesión',
      error: error.message 
    });
  }
});

// @route   GET /api/shared-sessions
// @desc    Obtener todas las sesiones del usuario
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const sessions = await SharedSession.find({
      'participants.email': req.user.email
    }).sort({ createdAt: -1 });

    res.json(sessions);
  } catch (error) {
    console.error('Error al obtener sesiones:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/shared-sessions/:id
// @desc    Obtener una sesión específica
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const session = await SharedSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Sesión no encontrada' });
    }

    // Verificar si el usuario tiene acceso
    const userParticipant = session.participants.find(
      p => p.email.toLowerCase() === req.user.email.toLowerCase()
    );

    if (!userParticipant) {
      return res.status(403).json({ message: 'No tienes acceso a esta sesión' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error al obtener sesión:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 