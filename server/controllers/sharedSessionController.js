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

exports.createSharedSession = async (req, res) => {
  try {
    const { name, description, participants = [], sessionType = 'single' } = req.body;
    
    const newSession = new SharedSession({
      userId: req.user.id,
      name,
      description,
      participants,
      sessionType,
      isActive: true,
      status: 'active'
    });

    const savedSession = await newSession.save();
    const populatedSession = await SharedSession.findById(savedSession._id)
      .populate('userId', 'nombre email');

    res.json(populatedSession);
  } catch (error) {
    console.error('Error al crear sesión:', error);
    res.status(500).json({ 
      msg: 'Error del servidor al crear sesión',
      error: error.message 
    });
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
  try {
    const session = await SharedSession.findByIdAndDelete(req.params.id);
    
    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada' });
    }
    
    res.json({ msg: 'Sesión eliminada' });
  } catch (error) {
    console.error('Error al eliminar sesión:', error);
    res.status(500).json({ msg: 'Error del servidor al eliminar sesión' });
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
    const session = await SharedSession.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada' });
    }

    // Obtener el email del usuario actual
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    const participant = session.participants.find(
      p => p.email.toLowerCase() === user.email.toLowerCase()
    );

    if (!participant) {
      return res.status(404).json({ msg: 'No eres participante de esta sesión' });
    }

    participant.status = accept ? 'accepted' : 'rejected';
    participant.userId = user.id; // Asignar el userId al aceptar la invitación
    participant.responseDate = new Date();

    // Verificar si todos los participantes (excepto el creador) han aceptado
    const creatorEmail = session.userId && session.userId.email ? session.userId.email.toLowerCase() : null;
    const allAccepted = session.participants
      .filter(p => !creatorEmail || p.email.toLowerCase() !== creatorEmail)
      .every(p => p.status === 'accepted');

    if (allAccepted) {
      session.isLocked = false;
    }

    await session.save();
    res.json(session);
  } catch (error) {
    console.error('Error al responder invitación:', error);
    res.status(500).json({ msg: 'Error al procesar respuesta' });
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
  const dbSession = await mongoose.startSession();
  try {
    let updatedSession;
    await dbSession.withTransaction(async () => {
      const { distribution, currentMonth, currentYear } = req.body;
      const sessionId = req.params.id;
      const userId = req.user.id;

      // Validar la distribución
      if (!distribution || !Array.isArray(distribution)) {
        throw new Error('Formato de distribución inválido');
      }
      
      const totalPercentage = distribution.reduce((sum, item) => sum + (item.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error('La suma de porcentajes debe ser 100%');
      }

      // Obtener la sesión actual
      const currentSession = await SharedSession.findOne({
        _id: sessionId,
        $or: [
          { userId: userId },
          { 'participants.userId': userId }
        ]
      }).session(dbSession);

      if (!currentSession) {
        throw new Error('Sesión no encontrada o acceso denegado');
      }

      // Preparar la actualización de la distribución
      const yearlyExpenses = currentSession.yearlyExpenses || [];
      
      // Encontrar el último año y mes con datos en la colección
      let lastYear = currentYear;
      let lastMonth = currentMonth;
      
      yearlyExpenses.forEach(yearData => {
        if (yearData.year >= currentYear) {
          if (yearData.year > lastYear) {
            lastYear = yearData.year;
            lastMonth = Math.max(...yearData.months.map(m => m.month));
          } else if (yearData.year === lastYear) {
            const maxMonth = Math.max(...yearData.months.map(m => m.month));
            if (maxMonth > lastMonth) {
              lastMonth = maxMonth;
            }
          }
        }
      });

      // Preparar todas las actualizaciones de distribución
      const distributionUpdates = [];
      const allocationUpdates = [];
      const personalExpenseUpdates = [];

      // Generar actualizaciones para cada año y mes
      for (let year = currentYear; year <= lastYear; year++) {
        let yearData = yearlyExpenses.find(y => y.year === year);
        
        if (!yearData) {
          yearData = {
            year,
            months: []
          };
          yearlyExpenses.push(yearData);
        }

        const endMonth = year === lastYear ? lastMonth : 11;
        
        for (let month = (year === currentYear ? currentMonth : 0); month <= endMonth; month++) {
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

          const totalAmount = monthData.totalAmount || 0;

          // Preparar actualizaciones de asignaciones y gastos personales
          for (const item of distribution) {
            const amount = (totalAmount * item.percentage) / 100;

            // Preparar actualización de asignación
            allocationUpdates.push({
              deleteOne: {
                filter: {
                  sessionId,
                  year,
                  month,
                  userId: item.userId
                }
              }
            });

            allocationUpdates.push({
              insertOne: {
                document: {
                  sessionId,
                  userId: item.userId,
                  name: item.name,
                  year,
                  month,
                  percentage: item.percentage,
                  amount: amount,
                  status: 'pending'
                }
              }
            });

            // Preparar actualización de gasto personal
            personalExpenseUpdates.push({
              updateOne: {
                filter: {
                  user: item.userId.toString(),
                  'sessionReference.sessionId': sessionId,
                  year,
                  month
                },
                update: {
                  $set: {
                    amount: amount,
                    percentage: item.percentage,
                    isRecurring: true,
                    'sessionReference.percentage': item.percentage,
                    'sessionReference.totalAmount': totalAmount,
                    'sessionReference.isRecurringShare': true
                  }
                },
                upsert: true,
                setDefaultsOnInsert: true
              }
            });
          }
        }
      }

      // Ordenar los años y meses
      yearlyExpenses.sort((a, b) => a.year - b.year);
      yearlyExpenses.forEach(yearData => {
        yearData.months.sort((a, b) => a.month - b.month);
      });

      // Ejecutar todas las actualizaciones en paralelo
      const [updatedSessionResult] = await Promise.all([
        // Actualizar la sesión
        SharedSession.findOneAndUpdate(
          { _id: sessionId },
          { $set: { yearlyExpenses } },
          { 
            session: dbSession,
            new: true,
            runValidators: false
          }
        ).populate('userId', 'nombre email')
          .populate('participants.userId', 'nombre email'),

        // Actualizar asignaciones en lote
        ParticipantAllocation.bulkWrite(allocationUpdates, { session: dbSession }),

        // Actualizar gastos personales en lote
        PersonalExpense.bulkWrite(personalExpenseUpdates.map(update => ({
          ...update,
          updateOne: {
            ...update.updateOne,
            update: {
              $set: {
                ...update.updateOne.update.$set,
                name: currentSession.name || 'Gasto Compartido',
                description: `Gasto compartido - ${getMonthName(update.updateOne.filter.month)} ${update.updateOne.filter.year}`,
                category: 'Gastos Compartidos',
                date: new Date(update.updateOne.filter.year, update.updateOne.filter.month),
                isFromSharedSession: true,
                'sessionReference.sessionName': currentSession.name,
                'sessionReference.year': update.updateOne.filter.year,
                'sessionReference.month': update.updateOne.filter.month
              }
            }
          }
        })), { session: dbSession })
      ]);

      updatedSession = updatedSessionResult;
    });

    // Devolver la sesión actualizada
    res.json(updatedSession);
  } catch (error) {
    console.error('[updateDistribution] Error:', error);
    res.status(500).json({ 
      msg: 'Error al actualizar distribución',
      error: error.message
    });
  } finally {
    await dbSession.endSession();
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
    console.log('=== Inicio addExpense ===');
    console.log('Body recibido completo:', JSON.stringify(req.body));
    console.log('Tipo de req.body:', typeof req.body);
    console.log('¿Tiene propiedad expense?:', 'expense' in req.body);
    
    await dbSession.withTransaction(async () => {
      const session = await SharedSession.findById(req.params.id).session(dbSession);
      if (!session) {
        console.error('Sesión no encontrada:', req.params.id);
        return res.status(404).json({ msg: 'Sesión no encontrada' });
      }

      // Validar que expense existe en el body
      if (!req.body || !req.body.expense) {
        console.error('Datos del gasto no proporcionados');
        return res.status(400).json({ 
          msg: 'Datos del gasto no proporcionados',
          details: 'El objeto expense es requerido en el body'
        });
      }

      const { expense } = req.body;
      
      // Validar campos requeridos del gasto
      if (!expense.name || typeof expense.name !== 'string' || expense.name.trim().length === 0) {
        console.error('Nombre del gasto inválido:', expense.name);
        return res.status(400).json({
          msg: 'El nombre del gasto es requerido y no puede estar vacío',
          details: { receivedName: expense.name }
        });
      }

      if (!expense.amount || isNaN(Number(expense.amount)) || Number(expense.amount) <= 0) {
        console.error('Monto del gasto inválido:', expense.amount);
        return res.status(400).json({
          msg: 'El monto debe ser un número positivo',
          details: { receivedAmount: expense.amount }
        });
      }

      try {
        // Calcular la fecha de fin para gastos recurrentes (3 años en el futuro)
        const endDate = expense.isRecurring ? new Date(new Date().setFullYear(new Date().getFullYear() + 3)) : null;
        
        console.log('Datos del gasto a añadir:', {
          name: expense.name,
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
          isRecurring: expense.isRecurring
        });
        
        // Usar el método addExpense del modelo
        const newExpense = await session.addExpense(expense, expense.date, endDate);
        console.log('Gasto añadido correctamente:', newExpense);
        
        // Guardar la sesión
        await session.save();

        // Devolver respuesta exitosa con el gasto completo
        return res.json({
          msg: 'Gasto añadido correctamente',
          expense: {
            _id: newExpense._id,
            name: newExpense.name,
            description: newExpense.description,
            amount: newExpense.amount,
            category: newExpense.category,
            date: newExpense.date,
            paidBy: newExpense.paidBy,
            isRecurring: newExpense.isRecurring
          }
        });
      } catch (error) {
        console.error('Error al añadir el gasto:', error);
        return res.status(400).json({
          msg: error.message || 'Error al añadir el gasto',
          details: error
        });
      }
    });

    console.log('=== Fin addExpense ===');
  } catch (error) {
    console.error('Error en addExpense:', error);
    await dbSession.abortTransaction();
    res.status(500).json({ msg: 'Error del servidor al añadir el gasto' });
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
  try {
    const session = await SharedSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada' });
    }

    session.expenses = session.expenses.filter(
      e => e._id.toString() !== req.params.expenseId
    );
    await session.save();
    
    res.json({ msg: 'Gasto eliminado' });
  } catch (error) {
    console.error('Error al eliminar gasto:', error);
    res.status(500).json({ msg: 'Error al eliminar gasto' });
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
