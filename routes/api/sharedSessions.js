const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const SharedSession = require('../../models/SharedSession');
const mongoose = require('mongoose');
const ParticipantAllocation = require('../../models/ParticipantAllocation');
const syncService = require('../../services/syncService');

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

// Actualizar la distribución de una sesión
router.put('/:id/update-distribution', auth, async (req, res) => {
  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      const { distribution, currentMonth, currentYear } = req.body;
      const session = await SharedSession.findById(req.params.id).session(dbSession);
      
      if (!session) {
        throw new Error('Sesión no encontrada');
      }
      
      // Verificar que el usuario tenga acceso
      const userParticipant = session.participants.find(p => 
        p.email.toLowerCase() === req.user.email.toLowerCase()
      );
      
      if (!userParticipant) {
        throw new Error('No autorizado');
      }
      
      // Validar la distribución
      if (!distribution || !Array.isArray(distribution)) {
        throw new Error('Distribución inválida');
      }
      
      const totalPercentage = distribution.reduce((sum, item) => sum + item.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error('Los porcentajes deben sumar 100%');
      }

      // Asegurarse de que yearlyExpenses existe
      if (!session.yearlyExpenses) {
        session.yearlyExpenses = [];
      }

      // Encontrar o crear el año
      let yearData = session.yearlyExpenses.find(y => y.year === currentYear);
      if (!yearData) {
        yearData = {
          year: currentYear,
          months: []
        };
        session.yearlyExpenses.push(yearData);
      }

      // Asegurarse de que todos los meses desde el actual hasta el final del año existen
      for (let month = currentMonth; month <= 11; month++) {
        let monthData = yearData.months.find(m => m.month === month);
        if (!monthData) {
          monthData = {
            month,
            expenses: [],
            totalAmount: 0,
            Distribution: []
          };
          yearData.months.push(monthData);
        }
        
        // Actualizar la distribución para este mes
        monthData.Distribution = distribution.map(item => ({
          userId: item.userId,
          name: item.name,
          percentage: item.percentage,
          _id: new mongoose.Types.ObjectId()
        }));
      }
      
      // Guardar los cambios
      await session.save({ session: dbSession });

      // Recalcular asignaciones para todos los meses afectados
      for (let month = currentMonth; month <= 11; month++) {
        try {
          // Eliminar asignaciones existentes para este mes
          await ParticipantAllocation.deleteMany({
            sessionId: session._id,
            year: currentYear,
            month
          }).session(dbSession);

          // Obtener los gastos del mes
          const monthData = yearData.months.find(m => m.month === month);
          const totalAmount = monthData?.totalAmount || 0;

          // Crear nuevas asignaciones
          const allocations = distribution.map(item => ({
            sessionId: session._id,
            userId: item.userId,
            name: item.name,
            year: currentYear,
            month,
            percentage: item.percentage,
            amount: (totalAmount * item.percentage) / 100,
            status: 'pending'
          }));

          if (allocations.length > 0) {
            const savedAllocations = await ParticipantAllocation.insertMany(allocations, { session: dbSession });
            
            // Sincronizar cada asignación con gastos personales
            for (const allocation of savedAllocations) {
              try {
                await syncService.syncAllocationToPersonalExpense(allocation);
              } catch (syncError) {
                console.warn(`Error al sincronizar asignación ${allocation._id}:`, syncError.message);
              }
            }
          }
        } catch (error) {
          console.error(`Error procesando mes ${month}:`, error);
          throw error;
        }
      }

      res.json({
        msg: 'Distribución actualizada correctamente',
        yearlyExpenses: session.yearlyExpenses
      });
    });
  } catch (error) {
    console.error('Error al actualizar distribución:', error);
    res.status(500).json({ 
      msg: 'Error al actualizar distribución',
      error: error.message 
    });
  } finally {
    await dbSession.endSession();
  }
});

module.exports = router; 