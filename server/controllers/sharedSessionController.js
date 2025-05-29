const mongoose = require('mongoose');
const { SharedSession, PersonalExpense, ParticipantAllocation, User } = require('../models');
const { allocationService, syncService } = require('../services');
const { ObjectId } = mongoose.Types;
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const generatePDF = require('../utils/generatePDF');

// Función para obtener el nombre del mes
function getMonthName(monthIndex) {
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return monthNames[monthIndex] || `Mes ${monthIndex + 1}`;
}

// Buscar la distribución del mes anterior o siguiente
const findDistribution = (yearData, month) => {
    const prevMonth = yearData.months.find(m => m.month === month - 1);
    const nextMonth = yearData.months.find(m => m.month === month + 1);
    return prevMonth?.Distribution || nextMonth?.Distribution || [];
};

// Función para obtener la distribución actual
const getCurrentDistribution = (session, year, month) => {
  const yearData = session.yearlyExpenses?.find(y => y.year === year);
  const monthData = yearData?.months?.find(m => m.month === month);
  return monthData?.Distribution || [];
};

// Función para crear una distribución equitativa
const createEqualDistribution = (participants) => {
  const validParticipants = participants.filter(p => p.userId);
  const participantCount = validParticipants.length;
  
  if (participantCount === 0) return [];
  
  const equalShare = Math.floor(100 / participantCount);
  let remainingPercentage = 100 - (equalShare * participantCount);
  
  return validParticipants.map((participant, index) => ({
    userId: participant.userId,
    name: participant.name || participant.email,
    percentage: index === 0 ? equalShare + remainingPercentage : equalShare,
    _id: new mongoose.Types.ObjectId()
  }));
};

// Exportar funciones del controlador
exports.getAllSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await SharedSession.find({
      $or: [
        { userId: userId },
        { 'participants.userId': userId }
      ]
    })
    .populate('userId', 'nombre email')
    .populate('participants.userId', 'nombre email')
    .sort({ createdAt: -1 });
    
    res.json(sessions);
  } catch (error) {
    console.error('Error al obtener sesiones:', error);
    res.status(500).json({ msg: 'Error del servidor al obtener sesiones' });
  }
};

exports.createSession = async (req, res) => {
  const dbSession = await mongoose.startSession();
  let savedSession = null;
  
  try {
    savedSession = await dbSession.withTransaction(async () => {
      const { name, participants, sessionType, description } = req.body;
      const userId = req.user.id;
      
      console.log('Añadiendo al creador como participante en una nueva sesión');
      console.log(`Añadiendo creador ${userId} (${req.user.email}) como participante aceptado`);
      
      // Asegurarse de que el creador esté en la lista de participantes
      const allParticipants = [
        {
          email: req.user.email,
          userId: userId,
          name: req.user.nombre || req.user.email,
          status: 'accepted',
          canEdit: true,
          canDelete: true
        },
        ...participants.filter(p => p.email !== req.user.email)
      ];
      
      // Crear la sesión (bloqueada e inactiva por defecto)
      const session = new SharedSession({
        name,
        description,
        userId: userId,
        isLocked: true,
        isActive: false, // La sesión comienza inactiva hasta que todos acepten
        participants: allParticipants.map(p => ({
          ...p,
          status: p.email === req.user.email ? 'accepted' : 'pending'
        })),
        sessionType: sessionType || 'permanent',
        yearlyExpenses: [{
          year: new Date().getFullYear(),
          months: []
        }]
      });
      
      // Guardar la sesión
      const newSession = await session.save({ session: dbSession });

      // Obtener la sesión con los datos populados
      const populatedSession = await SharedSession.findById(newSession._id)
        .populate('userId', 'nombre email')
        .populate('participants.userId', 'nombre email')
        .session(dbSession);
      
      return populatedSession;
    });

    res.json({
      success: true,
      message: 'Sesión creada correctamente',
      session: savedSession
    });

  } catch (error) {
    console.error('Error al crear sesión compartida:', error);
    res.status(500).json({ 
      msg: 'Error al crear la sesión compartida',
      error: error.message 
    });
  } finally {
    await dbSession.endSession();
  }
};

exports.getSharedSessionDetails = async (req, res) => {
  try {
    const session = await SharedSession.findById(req.params.id)
      .populate('userId', 'nombre email')
      .populate('participants.userId', 'nombre email');
    
    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error al obtener detalles de sesión:', error);
    res.status(500).json({ msg: 'Error del servidor al obtener detalles' });
  }
};

exports.updateSession = async (req, res) => {
  try {
    const session = await SharedSession.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error al actualizar sesión:', error);
    res.status(500).json({ msg: 'Error del servidor al actualizar sesión' });
  }
};

exports.deleteSession = async (req, res) => {
  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      const sessionId = req.params.id;
      console.log('=== Inicio deleteSession ===');
      console.log(`Eliminando sesión: ${sessionId}`);

      // Verificar que la sesión existe y el usuario tiene permisos
      const session = await SharedSession.findOne({
        _id: sessionId,
        $or: [
          { userId: req.user.id },
          { 'participants.userId': req.user.id }
        ]
      }).session(dbSession);

      if (!session) {
        throw new Error('Sesión no encontrada o sin permisos para eliminar');
      }

      // 1. Eliminar todos los gastos personales relacionados con esta sesión
      console.log('Eliminando gastos personales relacionados...');
      const deletedPersonalExpenses = await PersonalExpense.deleteMany({
        'sessionReference.sessionId': sessionId
      }).session(dbSession);
      console.log(`- ${deletedPersonalExpenses.deletedCount} gastos personales eliminados`);

      // 2. Eliminar todas las asignaciones de participantes
      console.log('Eliminando asignaciones de participantes...');
      const deletedAllocations = await ParticipantAllocation.deleteMany({
        sessionId: sessionId
      }).session(dbSession);
      console.log(`- ${deletedAllocations.deletedCount} asignaciones eliminadas`);

      // 3. Eliminar la sesión (esto eliminará también todos los gastos compartidos)
      console.log('Eliminando la sesión...');
      await SharedSession.findByIdAndDelete(sessionId).session(dbSession);

      console.log('=== Fin deleteSession ===');
      res.json({ 
        msg: 'Sesión y datos relacionados eliminados correctamente',
        stats: {
          personalExpenses: deletedPersonalExpenses.deletedCount,
          allocations: deletedAllocations.deletedCount
        }
      });
    });
  } catch (error) {
    console.error('Error al eliminar sesión:', error);
    await dbSession.abortTransaction();
    res.status(500).json({ 
      msg: 'Error del servidor al eliminar sesión',
      error: error.message
    });
  } finally {
    await dbSession.endSession();
  }
};

exports.getPendingInvitations = async (req, res) => {
  try {
    // Obtener el email del usuario actual
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    const sessions = await SharedSession.find({
      'participants': {
        $elemMatch: {
          email: user.email,
          status: 'pending'
        }
      }
    }).populate('userId', 'nombre email');

    // Formatear la respuesta para incluir información relevante
    const formattedSessions = sessions.map(session => ({
      _id: session._id,
      sessionId: session._id,
      sessionName: session.name,
      description: session.description,
      invitedBy: session.userId ? session.userId.nombre || session.userId.email : 'Desconocido',
      invitationDate: session.createdAt,
      participants: session.participants,
      participantsCount: session.participants.length
    }));

    res.json(formattedSessions);
  } catch (error) {
    console.error('Error al obtener invitaciones pendientes:', error);
    res.status(500).json({ msg: 'Error al obtener invitaciones' });
  }
};

exports.respondToInvitation = async (req, res) => {
  try {
    const { accept } = req.body;
    const sessionId = req.params.id;
    const userId = req.user.id;
    const userEmail = req.user.email;

    console.log('=== Inicio respondToInvitation ===', {
      sessionId,
      accept,
      userId,
      userEmail
    });

    // 1. Buscar la sesión y verificar que existe
    const session = await SharedSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ 
        msg: 'Sesión no encontrada' 
      });
    }

    // 2. Buscar al participante y verificar que está pendiente
    const participantIndex = session.participants.findIndex(
      p => p.email?.toLowerCase() === userEmail?.toLowerCase() && p.status === 'pending'
    );

    if (participantIndex === -1) {
      return res.status(400).json({ 
        msg: 'No se encontró una invitación pendiente para este usuario' 
      });
    }

    // 3. Actualizar el estado del participante manteniendo todos los campos existentes
    const currentParticipant = session.participants[participantIndex];
    session.participants[participantIndex] = {
      ...currentParticipant, // Mantener todos los campos existentes
      email: userEmail, // Asegurar que el email está presente
      userId: userId,
      status: accept ? 'accepted' : 'rejected',
      responseDate: new Date()
    };

    // 4. Verificar si todos han respondido y actualizar estado de la sesión
    const pendingParticipants = session.participants.filter(p => p.status === 'pending');
    
    // Solo verificar aceptación si no hay pendientes
    if (pendingParticipants.length === 0) {
      const allAccepted = session.participants.every(p => p.status === 'accepted');
      if (allAccepted) {
        session.isLocked = false;
        session.isActive = true;
        console.log('Todos los participantes han aceptado. Activando sesión.');
      }
    }

    // 5. Guardar los cambios
    const updatedSession = await session.save();
    if (!updatedSession) {
      throw new Error('Error al guardar los cambios en la sesión');
    }

    // 6. Devolver la sesión actualizada con los datos populados
    const populatedSession = await SharedSession.findById(sessionId)
      .populate('userId', 'nombre email')
      .populate('participants.userId', 'nombre email');

    console.log('Sesión actualizada exitosamente');
    res.json(populatedSession);

  } catch (error) {
    console.error('Error al responder a la invitación:', error);
    res.status(500).json({ 
      msg: 'Error al procesar la respuesta',
      error: error.message,
      details: error.errors // Incluir detalles de validación si existen
    });
  }
};

exports.inviteParticipants = async (req, res) => {
  try {
    const session = await SharedSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada' });
    }

    const { participants } = req.body;
    session.participants.push(...participants);
    await session.save();
    
    res.json(session);
  } catch (error) {
    console.error('Error al invitar participantes:', error);
    res.status(500).json({ msg: 'Error al procesar invitaciones' });
  }
};

exports.syncToPersonal = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId: userId },
        { 'participants.userId': userId }
      ]
    });

    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada' });
    }

    // Aquí iría la lógica de sincronización
    res.json({ msg: 'Sincronización completada' });
  } catch (error) {
    console.error('Error en sincronización:', error);
    res.status(500).json({ msg: 'Error al sincronizar gastos' });
  }
};

exports.updateDistribution = async (req, res) => {
  let dbSession;
  try {
    console.log('Iniciando updateDistribution con datos:', JSON.stringify(req.body, null, 2));
    
    dbSession = await mongoose.startSession();
    await dbSession.startTransaction();

    const { distribution, currentMonth, currentYear } = req.body;
    const sessionId = req.params.id;
    const userId = req.user.id;

    console.log('Validando datos:', {
      sessionId,
      userId,
      currentMonth,
      currentYear,
      distributionLength: distribution?.length
    });

    // Validar la distribución
    if (!distribution || !Array.isArray(distribution)) {
      throw new Error('Formato de distribución inválido');
    }
    
    const totalPercentage = distribution.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);
    console.log('Total porcentaje calculado:', totalPercentage);
    
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error(`La suma de porcentajes debe ser 100%. Actual: ${totalPercentage}%`);
    }

    // Obtener la sesión con campos específicos necesarios
    const currentSession = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId: userId },
        { 'participants.userId': userId }
      ]
    })
    .select('yearlyExpenses currency participants userId name')
    .session(dbSession);

    if (!currentSession) {
      throw new Error('Sesión no encontrada o acceso denegado');
    }

    console.log('Sesión encontrada:', {
      id: currentSession._id,
      name: currentSession.name,
      participantsCount: currentSession.participants?.length
    });

    // Asegurarse de que yearlyExpenses existe y es un array
    if (!Array.isArray(currentSession.yearlyExpenses)) {
      currentSession.yearlyExpenses = [];
    }

    // Preparar la nueva distribución con IDs
    const newDistribution = distribution.map(d => ({
      userId: d.userId,
      name: d.name,
      percentage: Number(d.percentage),
      _id: new mongoose.Types.ObjectId()
    }));

    // Array para almacenar todas las asignaciones que necesitamos crear
    const allAllocations = [];

    // Iterar sobre todos los años
    for (const yearData of currentSession.yearlyExpenses) {
      // Solo procesar si es el año actual o futuro
      if (yearData.year >= currentYear) {
        // Asegurarse de que months es un array
        if (!Array.isArray(yearData.months)) {
          yearData.months = [];
        }

        // Iterar sobre todos los meses del año
        for (const monthData of yearData.months) {
          // Solo actualizar si es un mes futuro o el mes actual
          if (yearData.year > currentYear || (yearData.year === currentYear && monthData.month >= currentMonth)) {
            // Asegurarse de que expenses y Distribution son arrays
            if (!Array.isArray(monthData.expenses)) {
              monthData.expenses = [];
            }
            if (!Array.isArray(monthData.Distribution)) {
              monthData.Distribution = [];
            }

            // Actualizar la distribución para este mes
            monthData.Distribution = newDistribution.map(d => ({
              ...d,
              _id: new mongoose.Types.ObjectId()
            }));

            // Preparar asignaciones para este mes
            const monthlyAllocations = distribution.map(d => ({
              sessionId,
              userId: d.userId,
              name: d.name,
              year: yearData.year,
              month: monthData.month,
              percentage: Number(d.percentage),
              amount: (monthData.totalAmount * Number(d.percentage)) / 100,
              totalAmount: monthData.totalAmount,
              currency: currentSession.currency || 'EUR',
              status: 'pending'
            }));

            allAllocations.push(...monthlyAllocations);
          }
        }
      }
    }

    console.log('Total de asignaciones preparadas:', allAllocations.length);

    // Eliminar los gastos personales existentes relacionados con esta sesión para los meses futuros
    await PersonalExpense.deleteMany({
      'sessionReference.sessionId': sessionId,
      $or: [
        { year: { $gt: currentYear } },
        {
          year: currentYear,
          month: { $gte: currentMonth }
        }
      ],
      isFromSharedSession: true
    }).session(dbSession);

    // Eliminar todas las asignaciones futuras
    await ParticipantAllocation.deleteMany({
      sessionId,
      $or: [
        { year: { $gt: currentYear } },
        {
          year: currentYear,
          month: { $gte: currentMonth }
        }
      ]
    }).session(dbSession);

    // Crear las nuevas asignaciones
    let savedAllocations = [];
    if (allAllocations.length > 0) {
      savedAllocations = await ParticipantAllocation.insertMany(allAllocations, { session: dbSession });
    }

    // Crear los nuevos gastos personales basados en las asignaciones
    const personalExpenses = savedAllocations.map(allocation => ({
      user: allocation.userId.toString(),
      name: currentSession.name,
      description: `Parte correspondiente (${allocation.percentage.toFixed(2)}%) de gastos compartidos en "${currentSession.name}" para ${getMonthName(allocation.month)} ${allocation.year}`,
      amount: allocation.amount,
      currency: allocation.currency,
      category: 'Gastos Compartidos',
      date: new Date(allocation.year, allocation.month, 15),
      year: allocation.year,
      month: allocation.month,
      type: 'expense',
      isFromSharedSession: true,
      isRecurring: true,
      sessionReference: {
        sessionId: allocation.sessionId,
        sessionName: currentSession.name,
        percentage: allocation.percentage,
        totalAmount: allocation.totalAmount,
        year: allocation.year,
        month: allocation.month,
        isRecurringShare: true,
        participantName: allocation.name
      },
      allocationId: allocation._id
    }));

    // Insertar los nuevos gastos personales
    if (personalExpenses.length > 0) {
      await PersonalExpense.insertMany(personalExpenses, { session: dbSession });
    }

    // Ordenar los meses y años para mantener consistencia
    currentSession.yearlyExpenses.forEach(yearData => {
      yearData.months.sort((a, b) => a.month - b.month);
    });
    currentSession.yearlyExpenses.sort((a, b) => a.year - b.year);

    // Marcar el documento como modificado
    currentSession.markModified('yearlyExpenses');

    // Guardar la sesión actualizada
    await currentSession.save({ session: dbSession });

    // Confirmar la transacción
    await dbSession.commitTransaction();

    // Obtener la sesión actualizada con todos los datos necesarios
    const finalSession = await SharedSession.findById(sessionId)
      .populate('userId', 'nombre email')
      .populate('participants.userId', 'nombre email');

    console.log('Distribución y gastos personales actualizados exitosamente');

    res.json({
      success: true,
      message: 'Distribución actualizada correctamente',
      session: finalSession
    });

  } catch (error) {
    console.error('[updateDistribution] Error detallado:', error);
    console.error('Stack trace:', error.stack);
    
    if (dbSession?.inTransaction()) {
      await dbSession.abortTransaction();
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error al actualizar distribución',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (dbSession) {
      await dbSession.endSession();
    }
  }
};

exports.getSessionAllocations = async (req, res) => {
  try {
    const allocations = await ParticipantAllocation.find({
      sessionId: req.params.id
    });
    res.json(allocations);
  } catch (error) {
    console.error('Error al obtener asignaciones:', error);
    res.status(500).json({ msg: 'Error al obtener asignaciones' });
  }
};

exports.getUserAllocations = async (req, res) => {
  try {
    const allocations = await ParticipantAllocation.find({
      userId: req.user.id
    });
    res.json(allocations);
  } catch (error) {
    console.error('Error al obtener asignaciones del usuario:', error);
    res.status(500).json({ msg: 'Error al obtener asignaciones' });
  }
};

exports.updateAllocationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allocation = await ParticipantAllocation.findByIdAndUpdate(
      req.params.allocationId,
      { status },
      { new: true }
    );
    
    if (!allocation) {
      return res.status(404).json({ msg: 'Asignación no encontrada' });
    }
    
    res.json(allocation);
  } catch (error) {
    console.error('Error al actualizar estado de asignación:', error);
    res.status(500).json({ msg: 'Error al actualizar estado' });
  }
};

exports.addExpense = async (req, res) => {
  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      const { expense } = req.body;
      
      if (!expense) {
        return res.status(400).json({ 
          msg: 'Datos del gasto no proporcionados'
        });
      }

      // Validaciones básicas
      if (!expense.name?.trim()) {
        return res.status(400).json({
          msg: 'El nombre del gasto es requerido'
        });
      }

      if (!expense.amount || isNaN(Number(expense.amount)) || Number(expense.amount) <= 0) {
        return res.status(400).json({
          msg: 'El monto debe ser un número positivo'
        });
      }

      // Buscar la sesión y validar en una sola operación
      const session = await SharedSession.findOne({
        _id: req.params.id,
        $or: [
          { userId: req.user.id },
          { 'participants.userId': req.user.id }
        ]
      }).session(dbSession);

      if (!session) {
        return res.status(404).json({ msg: 'Sesión no encontrada o acceso denegado' });
      }

      // Crear el gasto con los datos validados
      const expenseDate = new Date(expense.date);
      const year = expenseDate.getFullYear();
      const month = expenseDate.getMonth();

      // Encontrar o crear el año y mes en una sola operación
      let yearData = session.yearlyExpenses.find(y => y.year === year);
      if (!yearData) {
        yearData = { 
          year,
          months: []
        };
        session.yearlyExpenses.push(yearData);
      }

      let monthData = yearData.months.find(m => m.month === month);
      if (!monthData) {
        monthData = {
          month,
          expenses: [],
          Distribution: [],
          totalAmount: 0
        };
        yearData.months.push(monthData);
      }

      // Crear el nuevo gasto
      const newExpense = {
        _id: new mongoose.Types.ObjectId(),
        name: expense.name.trim(),
        description: expense.description?.trim() || '',
        amount: Number(expense.amount),
        date: expenseDate,
        category: expense.category?.trim() || 'Otros',
        paidBy: expense.paidBy || req.user.id,
        isPeriodic: expense.isPeriodic || false,
        isRecurring: expense.isRecurring || false,
        chargeDay: expense.isRecurring ? expense.chargeDay : undefined,
        periodStartDate: expense.isPeriodic ? new Date(expense.periodStartDate) : null,
        periodEndDate: expense.isPeriodic ? new Date(expense.periodEndDate) : null
      };

      // Si es un gasto recurrente o periódico, crear las instancias necesarias
      if (expense.isRecurring || expense.isPeriodic) {
        const startDate = expense.isPeriodic ? new Date(expense.periodStartDate) : expenseDate;
        const endDate = expense.isPeriodic ? new Date(expense.periodEndDate) : null;
        
        let currentDate = new Date(startDate);
        const finalDate = endDate || new Date(year + 1, month, 1); // Si es recurrente, crear para un año

        while (currentDate <= finalDate) {
          const currentYear = currentDate.getFullYear();
          const currentMonth = currentDate.getMonth();

          // Encontrar o crear estructura de año/mes para cada instancia
          let currentYearData = session.yearlyExpenses.find(y => y.year === currentYear);
          if (!currentYearData) {
            currentYearData = { year: currentYear, months: [] };
            session.yearlyExpenses.push(currentYearData);
          }

          let currentMonthData = currentYearData.months.find(m => m.month === currentMonth);
          if (!currentMonthData) {
            currentMonthData = {
              month: currentMonth,
              expenses: [],
              Distribution: monthData.Distribution, // Copiar la distribución del mes original
              totalAmount: 0
            };
            currentYearData.months.push(currentMonthData);
          }

          // Crear instancia del gasto para este mes
          const expenseInstance = {
            ...newExpense,
            _id: new mongoose.Types.ObjectId(),
            date: new Date(currentYear, currentMonth, expense.isRecurring ? expense.chargeDay : currentDate.getDate())
          };

          currentMonthData.expenses.push(expenseInstance);
          currentMonthData.totalAmount = currentMonthData.expenses.reduce((sum, exp) => sum + exp.amount, 0);

          // Avanzar al siguiente mes
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      } else {
        // Gasto único
        monthData.expenses.push(newExpense);
        monthData.totalAmount = monthData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
      }

      // Ordenar los meses y años
      yearData.months.sort((a, b) => a.month - b.month);
      session.yearlyExpenses.sort((a, b) => a.year - b.year);

      // Guardar la sesión actualizada
      await session.save({ session: dbSession });

      res.json({
        msg: 'Gasto añadido correctamente',
        session
      });
    });
  } catch (error) {
    await dbSession.abortTransaction();
    console.error('Error al añadir gasto:', error);
    res.status(500).json({ 
      msg: 'Error del servidor al añadir el gasto',
      error: error.message 
    });
  } finally {
    await dbSession.endSession();
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const session = await SharedSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada' });
    }

    const expenseIndex = session.expenses.findIndex(
      e => e._id.toString() === req.params.expenseId
    );

    if (expenseIndex === -1) {
      return res.status(404).json({ msg: 'Gasto no encontrado' });
    }

    session.expenses[expenseIndex] = { ...session.expenses[expenseIndex], ...req.body };
    await session.save();
    
    res.json(session);
  } catch (error) {
    console.error('Error al actualizar gasto:', error);
    res.status(500).json({ msg: 'Error al actualizar gasto' });
  }
};

exports.deleteExpense = async (req, res) => {
  let dbSession = null;
  
  try {
    const { id: sessionId, expenseId } = req.params;
    const userId = req.user.id;

    console.log('=== Inicio deleteExpense ===');
    console.log(`Intentando eliminar gasto ${expenseId} de la sesión ${sessionId}`);

    // Iniciar sesión de base de datos
    dbSession = await mongoose.startSession();
    await dbSession.startTransaction();

    // Buscar la sesión y verificar permisos
    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId: userId },
        { 'participants.userId': userId }
      ]
    }).session(dbSession);

    if (!session) {
      throw new Error('Sesión no encontrada o no autorizada');
    }

    // Variables para rastrear el gasto
    let gastoEncontrado = false;
    let gastosEliminados = 0;
    let mesesAfectados = new Set();
    let gastoOriginal = null;

    // Buscar y eliminar el gasto en todos los años y meses
    for (const yearData of session.yearlyExpenses || []) {
      for (const monthData of yearData.months || []) {
        const expenseIndex = monthData.expenses.findIndex(exp => 
          exp && exp._id && exp._id.toString() === expenseId
        );

        if (expenseIndex !== -1) {
          gastoOriginal = monthData.expenses[expenseIndex];
          gastoEncontrado = true;

          // Eliminar el gasto actual
          monthData.expenses.splice(expenseIndex, 1);
          gastosEliminados++;
          mesesAfectados.add(`${yearData.year}-${monthData.month}`);

          // Recalcular el total del mes
          monthData.totalAmount = monthData.expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

          // Si es un gasto periódico o recurrente, eliminar las instancias futuras
          if (gastoOriginal && (gastoOriginal.isPeriodic || gastoOriginal.isRecurring)) {
            for (const futureYear of session.yearlyExpenses) {
              if (futureYear.year < yearData.year) continue;

              for (const futureMonth of futureYear.months) {
                if (futureYear.year === yearData.year && futureMonth.month <= monthData.month) continue;

                const futureExpenses = futureMonth.expenses.filter(exp => 
                  exp && exp.name === gastoOriginal.name && 
                  (exp.isPeriodic || exp.isRecurring)
                );

                if (futureExpenses.length > 0) {
                  // Eliminar gastos futuros que coincidan
                  futureMonth.expenses = futureMonth.expenses.filter(exp => 
                    !futureExpenses.some(fe => fe._id.toString() === exp._id.toString())
                  );

                  // Recalcular total del mes futuro
                  futureMonth.totalAmount = futureMonth.expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
                  
                  gastosEliminados += futureExpenses.length;
                  mesesAfectados.add(`${futureYear.year}-${futureMonth.month}`);
                }
              }
            }
          }
        }
      }
    }

    if (!gastoEncontrado) {
      throw new Error('Gasto no encontrado en la sesión');
    }

    // Guardar los cambios en la sesión
    await session.save({ session: dbSession });

    // Actualizar las asignaciones para cada mes afectado
    for (const mesKey of mesesAfectados) {
      const [year, month] = mesKey.split('-').map(Number);
      const yearData = session.yearlyExpenses.find(y => y.year === year);
      const monthData = yearData?.months.find(m => m.month === month);

      if (monthData && monthData.Distribution) {
        // Eliminar asignaciones existentes
        await ParticipantAllocation.deleteMany({
          sessionId: session._id,
          year: year,
          month: month
        }).session(dbSession);

        // Crear nuevas asignaciones
        const allocations = monthData.Distribution.map(dist => ({
          sessionId: session._id,
          userId: dist.userId,
          name: dist.name,
          year: year,
          month: month,
          percentage: dist.percentage,
          amount: (monthData.totalAmount * dist.percentage) / 100,
          totalAmount: monthData.totalAmount,
          status: 'pending'
        }));

        if (allocations.length > 0) {
          await ParticipantAllocation.insertMany(allocations, { session: dbSession });
        }
      }
    }

    // Confirmar la transacción
    await dbSession.commitTransaction();
    
    res.json({ 
      msg: 'Gasto(s) eliminado(s) correctamente',
      count: gastosEliminados,
      monthsAffected: mesesAfectados.size
    });

  } catch (error) {
    console.error('Error al eliminar gasto:', error);
    
    // Solo intentar abortar si la sesión existe y la transacción está activa
    if (dbSession?.inTransaction()) {
      await dbSession.abortTransaction();
    }
    
    res.status(500).json({ 
      msg: 'Error del servidor al eliminar gasto',
      error: error.message
    });
  } finally {
    // Cerrar la sesión si existe
    if (dbSession) {
      await dbSession.endSession();
    }
  }
};

exports.getExpensesByMonth = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { year, month } = req.query;
    
    // Verificar que el usuario esté autenticado
    if (!req.user || !req.user.id) {
      console.error('Usuario no autenticado o ID de usuario no disponible');
      return res.status(401).json({ msg: 'Usuario no autenticado' });
    }
    
    const userId = req.user.id;
    
    console.log(`Usuario ${userId} solicitando gastos para sesión=${sessionId}, año=${year}, mes=${month}`);
    
    if (!year || month === undefined) {
      console.warn('Petición sin año o mes especificados');
      return res.status(400).json({ msg: 'Año y mes son requeridos' });
    }
    
    // Convertir a números
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    // Validar que son números válidos
    if (isNaN(yearNum) || isNaN(monthNum)) {
      console.warn(`Año o mes inválidos: año=${year}, mes=${month}`);
      return res.status(400).json({ msg: 'Año y mes deben ser números válidos' });
    }
    
    // Validar rango del mes (0-11)
    if (monthNum < 0 || monthNum > 11) {
      console.warn(`Mes fuera de rango: ${monthNum}`);
      return res.status(400).json({ msg: 'El mes debe estar entre 0 y 11' });
    }
    
    // Verificar acceso a la sesión
    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId: userId },
        { 'participants.userId': userId }
      ]
    });
    
    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada o acceso denegado' });
    }

    // Buscar los gastos en la estructura yearlyExpenses
    const yearData = session.yearlyExpenses.find(y => y.year === yearNum);
    if (!yearData) {
      console.log(`No se encontraron datos para el año ${yearNum}`);
      return res.json([]);
    }

    const monthData = yearData.months.find(m => m.month === monthNum);
    if (!monthData) {
      console.log(`No se encontraron datos para el mes ${monthNum} del año ${yearNum}`);
      return res.json([]);
    }

    console.log(`Se encontraron ${monthData.expenses.length} gastos para ${monthNum}/${yearNum}`);
    res.json(monthData.expenses);

  } catch (error) {
    console.error('Error al obtener gastos por mes:', error);
    res.status(500).json({ 
      msg: 'Error al obtener gastos por mes', 
      error: error.message 
    });
  }
};

exports.repairSessionStructure = async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    // Verificar que el usuario esté autenticado
    if (!req.user || !req.user.id) {
      console.error('Usuario no autenticado o ID de usuario no disponible');
      return res.status(401).json({ msg: 'Usuario no autenticado' });
    }
    
    const userId = req.user.id;
    
    console.log(`Usuario ${userId} solicitando reparación de estructura para sesión ${sessionId}`);
    
    // Verificar acceso a la sesión
    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId: userId },
        { 'participants.userId': userId }
      ]
    });
    
    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada o acceso denegado' });
    }
    
    // Verificar y reparar la estructura yearlyExpenses
    if (!session.yearlyExpenses || !Array.isArray(session.yearlyExpenses)) {
      console.log('Creando estructura yearlyExpenses vacía');
      session.yearlyExpenses = [];
    }
    
    // Obtener años y meses existentes
    const existingYears = new Set();
    const existingMonths = {};
    
    // Inicializar estructuras para los años/meses
    if (session.expenses && session.expenses.length > 0) {
      for (const expense of session.expenses) {
        if (!expense.date) continue;
        
        const expenseDate = new Date(expense.date);
        if (isNaN(expenseDate.getTime())) continue;
        
        const year = expenseDate.getFullYear();
        const month = expenseDate.getMonth(); // 0-indexed
        
        existingYears.add(year);
        if (!existingMonths[year]) {
          existingMonths[year] = new Set();
        }
        existingMonths[year].add(month);
      }
    }
    
    // Crear estructura para cada año y mes que tenga gastos
    for (const year of existingYears) {
      let yearData = session.yearlyExpenses.find(y => y.year === year);
      if (!yearData) {
        yearData = {
          year,
          months: []
        };
        session.yearlyExpenses.push(yearData);
      }
      
      // Asegurarse de que cada mes tenga la estructura correcta
      for (const month of existingMonths[year]) {
        let monthData = yearData.months.find(m => m.month === month);
        if (!monthData) {
          monthData = {
            month,
            expenses: [],
            totalAmount: 0
          };
          yearData.months.push(monthData);
        }
        
        // Asegurarse de que el mes tenga todos los campos necesarios
        if (!monthData.expenses) monthData.expenses = [];
        if (typeof monthData.totalAmount !== 'number') monthData.totalAmount = 0;
      }
    }
    
    // Reorganizar todos los gastos en la estructura correcta
    let gastosProcesados = 0;
    let gastosCorregidos = 0;
    
    if (session.expenses && session.expenses.length > 0) {
      for (const expense of session.expenses) {
        gastosProcesados++;
        
        if (!expense.date) continue;
        
        const expenseDate = new Date(expense.date);
        if (isNaN(expenseDate.getTime())) continue;
        
        const year = expenseDate.getFullYear();
        const month = expenseDate.getMonth();
        
        const yearData = session.yearlyExpenses.find(y => y.year === year);
        if (yearData) {
          const monthData = yearData.months.find(m => m.month === month);
          if (monthData) {
            // Verificar si el gasto ya existe en el mes
            const existingExpense = monthData.expenses.find(e => 
              e._id.toString() === expense._id.toString()
            );
            
            if (!existingExpense) {
              monthData.expenses.push(expense);
              monthData.totalAmount += expense.amount;
              gastosCorregidos++;
            }
          }
        }
      }
    }
    
    // Guardar los cambios
    await session.save();
    
    console.log(`Reparación completada: ${gastosProcesados} gastos procesados, ${gastosCorregidos} corregidos`);
    
    res.json({ 
      msg: 'Estructura reparada exitosamente',
      stats: {
        processed: gastosProcesados,
        fixed: gastosCorregidos
      }
    });
    
  } catch (error) {
    console.error('Error al reparar estructura:', error);
    res.status(500).json({ 
      msg: 'Error al reparar estructura',
      error: error.message
    });
  }
};

exports.repairExpenseDates = async (req, res) => {
  try {
    const session = await SharedSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada' });
    }

    // Aquí iría la lógica de reparación de fechas
    await session.save();
    
    res.json({ msg: 'Fechas reparadas' });
  } catch (error) {
    console.error('Error al reparar fechas:', error);
    res.status(500).json({ msg: 'Error al reparar fechas' });
  }
};

exports.repairAllSessionsMonthStructure = async (req, res) => {
  try {
    const sessions = await SharedSession.find({});
    for (const session of sessions) {
      // Aquí iría la lógica de reparación para cada sesión
      await session.save();
    }
    
    res.json({ msg: 'Estructuras reparadas' });
  } catch (error) {
    console.error('Error al reparar estructuras:', error);
    res.status(500).json({ msg: 'Error al reparar estructuras' });
  }
};

exports.updateAllocationUsernames = async (req, res) => {
  try {
    const allocations = await ParticipantAllocation.find({});
    for (const allocation of allocations) {
      const user = await User.findById(allocation.userId);
      if (user) {
        allocation.username = user.nombre || user.email;
        await allocation.save();
      }
    }
    
    res.json({ msg: 'Nombres actualizados' });
  } catch (error) {
    console.error('Error al actualizar nombres:', error);
    res.status(500).json({ msg: 'Error al actualizar nombres' });
  }
};

exports.generateMonthlyAllocations = async (req, res) => {
  try {
    const session = await SharedSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada' });
    }

    // Aquí iría la lógica de generación de asignaciones
    await session.save();
    
    res.json({ msg: 'Asignaciones generadas' });
  } catch (error) {
    console.error('Error al generar asignaciones:', error);
    res.status(500).json({ msg: 'Error al generar asignaciones' });
  }
};

exports.generateAllMonthlyAllocations = async (req, res) => {
  try {
    const sessions = await SharedSession.find({});
    for (const session of sessions) {
      // Aquí iría la lógica de generación para cada sesión
      await session.save();
    }
    
    res.json({ msg: 'Asignaciones generadas para todas las sesiones' });
  } catch (error) {
    console.error('Error al generar asignaciones:', error);
    res.status(500).json({ msg: 'Error al generar asignaciones' });
  }
};

exports.updateParticipants = async (req, res) => {
  try {
    const { participants } = req.body;
    const session = await SharedSession.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada' });
    }

    // Verificar que el usuario actual es el propietario o tiene permisos
    if (session.userId.toString() !== req.user.id) {
      const userParticipant = session.participants.find(
        p => p.userId && p.userId.toString() === req.user.id && p.canEdit
      );
      
      if (!userParticipant) {
        return res.status(403).json({ msg: 'No tienes permisos para modificar esta sesión' });
      }
    }

    // Actualizar participantes
    session.participants = participants;

    // Crear una distribución equitativa para los nuevos participantes
    const distribution = createEqualDistribution(participants);
    
    // Si hay datos de yearlyExpenses, actualizar la distribución en el mes actual
    if (session.yearlyExpenses && session.yearlyExpenses.length > 0) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const yearData = session.yearlyExpenses.find(y => y.year === currentYear);
      if (yearData) {
        const monthData = yearData.months.find(m => m.month === currentMonth);
        if (monthData) {
          monthData.Distribution = distribution;
        }
      }
    }

    await session.save();
    
    res.json(session);
  } catch (error) {
    console.error('Error al actualizar participantes:', error);
    res.status(500).json({ msg: 'Error al actualizar participantes' });
  }
};
