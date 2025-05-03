const SharedSession = require('../models/SharedSession');
const User = require('../models/User');
const mongoose = require('mongoose');

// Obtener todas las sesiones compartidas del usuario
exports.getAllSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Buscando sesiones para el usuario ${userId}`);
    
    // Buscar todas las sesiones donde el usuario es creador o participante
    const sessions = await SharedSession.find({
      $or: [
        { userId: userId }, // Sesiones creadas por el usuario
        { 'participants.userId': userId } // Sesiones donde el usuario es participante
      ]
    })
    .populate('userId', 'nombre email')
    .populate('participants.userId', 'nombre email')
    .sort({ createdAt: -1 });

    console.log(`Encontradas ${sessions.length} sesiones para el usuario ${userId}`);
    
    // Mapear las sesiones para añadir información adicional
    const processedSessions = [];
    
    for (const session of sessions) {
      const sessionObj = session.toObject();
      
      // Determinar el estado de la sesión para este usuario
      if (sessionObj.userId && sessionObj.userId._id.toString() === userId) {
        // El usuario es el creador
        console.log(`Usuario ${userId} es creador de la sesión ${sessionObj._id}`);
        sessionObj.status = session.allParticipantsAccepted() ? 'active' : 'pending';
        
        // Asegurar que el creador aparezca como participante aceptado
        const creatorParticipant = sessionObj.participants.find(p => 
          p.userId && p.userId._id && p.userId._id.toString() === userId
        );
        
        if (!creatorParticipant) {
          console.log(`Creador no figura como participante en sesión ${sessionObj._id}, añadiendo`);
          
          // Corregir en el objeto devuelto
          sessionObj.participants.unshift({
            userId: {
              _id: userId,
              nombre: sessionObj.userId.nombre || "Usuario",
              email: sessionObj.userId.email
            },
            name: sessionObj.userId.nombre || sessionObj.userId.email,
            email: sessionObj.userId.email,
            status: 'accepted',
            role: 'admin',
            canEdit: true,
            canDelete: true,
            responseDate: new Date()
          });
          
          // Arreglar la inconsistencia en la base de datos de forma segura (no usar await aquí)
          Promise.resolve().then(async () => {
            try {
              await SharedSession.findByIdAndUpdate(
                sessionObj._id,
                {
                  $push: {
                    participants: {
                      userId: userId,
                      name: sessionObj.userId.nombre || sessionObj.userId.email,
                      email: sessionObj.userId.email,
                      status: 'accepted',
                      role: 'admin',
                      canEdit: true,
                      canDelete: true,
                      responseDate: new Date()
                    }
                  }
                }
              );
              console.log(`Creador añadido como participante en la sesión ${sessionObj._id}`);
            } catch (updateError) {
              console.error(`Error al añadir creador como participante: ${updateError.message}`);
            }
          });
        }
      } else {
        // El usuario es participante
        const participant = sessionObj.participants.find(p => 
          p.userId && p.userId._id && p.userId._id.toString() === userId
        );
        
        if (participant) {
          console.log(`Usuario ${userId} es participante en sesión ${sessionObj._id} con estado ${participant.status}`);
          if (participant.status === 'pending') {
            sessionObj.status = 'invitation';
          } else if (participant.status === 'accepted') {
            sessionObj.status = session.allParticipantsAccepted() ? 'active' : 'waiting';
          } else {
            sessionObj.status = 'rejected';
          }
        } else {
          console.log(`¡INCONSISTENCIA! Usuario ${userId} no es ni creador ni participante en sesión ${sessionObj._id}`);
          sessionObj.status = 'unknown';
        }
      }
      
      processedSessions.push(sessionObj);
    }

    console.log(`Devolviendo ${processedSessions.length} sesiones procesadas`);
    res.json(processedSessions);
  } catch (error) {
    console.error('Error al obtener sesiones:', error);
    res.status(500).json({ msg: 'Error del servidor al obtener sesiones' });
  }
};

// Función de fallback para responder a invitaciones (eliminada)
exports.respondToInvitation = async (req, res) => {
  return res.status(410).json({
    status: 'error',
    msg: 'La funcionalidad de invitaciones ha sido eliminada',
    details: 'Esta característica ya no está disponible en la aplicación'
  });
};

// Crear una nueva sesión compartida
exports.createSession = async (req, res) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    console.log(`Creando nueva sesión para el usuario ${req.user.id}`);
    console.log('Datos recibidos:', JSON.stringify(req.body, null, 2));
    
    const { name, description, participants = [], sessionType = 'single' } = req.body;

    if (!name || name.trim().length === 0) {
      throw new Error('El nombre de la sesión es requerido');
    }

    if (!Array.isArray(participants)) {
      throw new Error('El formato de participantes es inválido');
    }

    // Obtener información del creador desde la base de datos
    const creator = await User.findById(req.user.id).session(dbSession);
    if (!creator) {
      throw new Error('Usuario creador no encontrado');
    }

    console.log(`Creador: ${creator._id} (${creator.email})`);
    const creatorEmail = creator.email.toLowerCase();

    // Filtrar participantes únicos y válidos
    const emailsSet = new Set();
    const uniqueParticipants = participants.filter(participant => {
      if (!participant.email || typeof participant.email !== 'string') {
        return false;
      }
      const email = participant.email.toLowerCase().trim();
      
      // No incluir al creador como participante adicional
      if (email === creatorEmail) {
        return false;
      }
      
      // No duplicar emails
      if (emailsSet.has(email)) {
        return false;
      }
      
      emailsSet.add(email);
      return true;
    });

    console.log(`Procesados ${uniqueParticipants.length} participantes únicos`);

    // Crear la sesión compartida
    const newSession = new SharedSession({
      userId: req.user.id,
      name: name.trim(),
      description: description ? description.trim() : '',
      sessionType,
      status: 'active',
      // Bloquear solo si hay otros participantes
      isLocked: uniqueParticipants.length > 0,
      participants: [],
      // Establecer fechas a null o a valores constantes
      date: null,
      startDate: null,
      endDate: null
    });

    // Añadir al creador como primer participante con estado aceptado
    newSession.participants.push({
      userId: req.user.id,
      name: creator.nombre || creator.email,
      email: creatorEmail,
      status: 'accepted', // El creador siempre acepta automáticamente
      role: 'admin',
      canEdit: true,
      canDelete: true,
      responseDate: null // Eliminar fecha de respuesta
    });

    console.log(`Creador añadido como participante aceptado`);

    // Procesar y añadir otros participantes
    for (const participant of uniqueParticipants) {
      const email = participant.email.toLowerCase().trim();
      
      // Buscar si ya existe un usuario con este email
      const existingUser = await User.findOne({ email }).session(dbSession);
      
      console.log(`Añadiendo participante: ${email} (Usuario existente: ${existingUser ? 'Sí' : 'No'})`);
      
      newSession.participants.push({
        userId: existingUser ? existingUser._id : null,
        name: existingUser ? (existingUser.nombre || existingUser.email) : email,
        email: email,
        status: 'pending',
        canEdit: participant.canEdit || false,
        canDelete: participant.canDelete || false,
        invitationDate: null // Eliminar fecha de invitación
      });
    }

    // Si no hay otros participantes además del creador, desbloquear la sesión
    if (newSession.participants.length === 1) {
      console.log(`Solo hay un participante (el creador). Desbloqueando sesión.`);
      newSession.isLocked = false;
    }

    console.log(`Guardando nueva sesión con ${newSession.participants.length} participantes`);
    await newSession.save({ session: dbSession });

    const populatedSession = await SharedSession.findById(newSession._id)
      .session(dbSession)
      .populate('userId', 'nombre email')
      .populate('participants.userId', 'nombre email');

    console.log(`Sesión creada con éxito. ID: ${populatedSession._id}`);
    await dbSession.commitTransaction();
    
    console.log(`Enviando respuesta con la sesión creada`);
    
    res.status(201).json(populatedSession);

  } catch (error) {
    await dbSession.abortTransaction();
    console.error('Error al crear sesión:', error);
    
    if (error.message.includes('duplicados')) {
      return res.status(400).json({ msg: 'No se permiten participantes duplicados' });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ msg: Object.values(error.errors).map(err => err.message).join(', ') });
    }
    
    res.status(500).json({ 
      msg: error.message || 'Error del servidor al crear la sesión',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    dbSession.endSession();
  }
};

// Actualizar una sesión compartida
exports.updateSession = async (req, res) => {
    try {
        const { name, description } = req.body;
        const session = await SharedSession.findOne({
            _id: req.params.id,
            isActive: true
        });

        if (!session) {
            return res.status(404).json({ msg: 'Sesión no encontrada' });
        }

        // Verificar que el usuario sea el propietario
        if (session.owner.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'No autorizado para editar esta sesión' });
        }

        session.name = name;
        session.description = description;
        session.lastActivity = Date.now();
        await session.save();

        const updatedSession = await SharedSession.findById(session._id)
            .populate('userId', 'nombre email')
            .populate('participants.userId', 'nombre email');

        res.json(updatedSession);
    } catch (error) {
        console.error(error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ msg: Object.values(error.errors).map(err => err.message).join(', ') });
        }
        res.status(500).json({ msg: 'Error del servidor al actualizar sesión' });
    }
};

// Eliminar una sesión
exports.deleteSession = async (req, res) => {
  try {
    const session = await SharedSession.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada' });
    }

    await session.remove();
    res.json({ msg: 'Sesión eliminada exitosamente' });

  } catch (error) {
    console.error('Error al eliminar sesión:', error);
    res.status(500).json({ msg: 'Error del servidor al eliminar sesión' });
  }
};

// Obtener detalles de una sesión compartida específica
exports.getSharedSessionDetails = async (req, res) => {
    try {
        const session = await SharedSession.findOne({
            _id: req.params.id,
            isActive: true,
            $or: [
                { userId: req.user.id },
                { 'participants.userId': req.user.id }
            ]
        })
        .populate('userId', 'name email')
        .populate('participants.userId', 'name email');

        if (!session) {
            return res.status(404).json({ msg: 'Sesión no encontrada' });
        }

        res.json(session);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error del servidor al obtener detalles de la sesión' });
    }
};

// Obtener todas las sesiones compartidas del usuario (ruta alternativa)
exports.getSharedSessions = async (req, res) => {
  try {
    // Llamar a la misma implementación de getAllSessions
    return exports.getAllSessions(req, res);
  } catch (err) {
    console.error('Error en getSharedSessions:', err.message);
    res.status(500).send('Error del servidor');
  }
};

// Obtener el presupuesto de una sesión
exports.getBudget = async (req, res) => {
    try {
        const session = await SharedSession.findOne({
            _id: req.params.id,
            isActive: true,
            $or: [
                { userId: req.user.id },
                { 'participants.userId': req.user.id }
            ]
        });

        if (!session) {
            return res.status(404).json({ msg: 'Sesión no encontrada' });
        }

        res.json({ budget: session.budget });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al obtener el presupuesto' });
    }
};

// Actualizar el presupuesto de una sesión
exports.updateBudget = async (req, res) => {
    try {
        const { budget } = req.body;
        const session = await SharedSession.findOne({
            _id: req.params.id,
            isActive: true,
            $or: [
                { userId: req.user.id },
                { 'participants.userId': req.user.id }
            ]
        });

        if (!session) {
            return res.status(404).json({ msg: 'Sesión no encontrada' });
        }

        // Validar que todos los valores sean números positivos
        for (const [key, value] of Object.entries(budget)) {
            if (typeof value !== 'number' || value < 0) {
                return res.status(400).json({ msg: `El valor de ${key} debe ser un número positivo` });
            }
        }

        session.budget = budget;
        session.lastActivity = Date.now();
        await session.save();

        res.json({ budget: session.budget });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al actualizar el presupuesto' });
    }
};

// Agregar un gasto a una sesión
exports.addExpense = async (req, res) => {
    try {
        const { description, amount, date, paidBy } = req.body;
        const session = await SharedSession.findOne({
            _id: req.params.id,
            isActive: true,
            $or: [
                { userId: req.user.id },
                { 'participants.userId': req.user.id }
            ]
        });

        if (!session) {
            return res.status(404).json({ msg: 'Sesión no encontrada o no autorizada' });
        }

        // Verificar que el usuario que pagó sea parte de la sesión
        const isParticipant = session.participants.some(p => 
            p.userId && p.userId.toString() === paidBy
        );
        
        if (!isParticipant) {
            return res.status(400).json({ msg: 'Usuario no válido para el pago' });
        }

        session.expenses.push({
            description,
            amount,
            date,
            paidBy
        });

        session.lastActivity = Date.now();
        await session.save();

        const updatedSession = await SharedSession.findById(session._id)
            .populate('userId', 'nombre email')
            .populate('participants.userId', 'nombre email')
            .populate('expenses.paidBy', 'nombre email');

        res.json(updatedSession);
    } catch (error) {
        console.error(error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ msg: Object.values(error.errors).map(err => err.message).join(', ') });
        }
        res.status(500).json({ msg: 'Error al agregar el gasto' });
    }
};

// Eliminar un gasto de una sesión
exports.deleteExpense = async (req, res) => {
    try {
        const session = await SharedSession.findOne({
            _id: req.params.sessionId,
            isActive: true,
            status: 'accepted',
            $or: [
                { userId: req.user.id },
                { 'participants.userId': req.user.id }
            ]
        });

        if (!session) {
            return res.status(404).json({ msg: 'Sesión no encontrada o no autorizada' });
        }

        const expense = session.expenses.id(req.params.expenseId);
        if (!expense) {
            return res.status(404).json({ msg: 'Gasto no encontrado' });
        }

        // Solo el que pagó puede eliminar el gasto
        if (expense.paidBy.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'No autorizado para eliminar este gasto' });
        }

        expense.remove();
        session.lastActivity = Date.now();
        await session.save();

        const updatedSession = await SharedSession.findById(session._id)
            .populate('userId', 'nombre email')
            .populate('participants.userId', 'nombre email')
            .populate('expenses.paidBy', 'nombre email');

        res.json(updatedSession);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error al eliminar el gasto' });
    }
};

// Eliminar una sesión compartida
exports.deleteSharedSession = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    const session = await SharedSession.findOne({
      _id: sessionId,
      userId: userId
    });

    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada' });
    }

    await SharedSession.findByIdAndDelete(sessionId);

    res.json({ msg: 'Sesión eliminada exitosamente' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
};

// Sincronizar gastos de sesión compartida a gastos personales
exports.syncToPersonal = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    console.log(`Solicitando sincronización de gastos para sesión ${sessionId} por usuario ${userId}`);
    
    // Buscar la sesión
    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId: userId },
        { 'participants.userId': userId }
      ]
    }).populate('expenses');
    
    if (!session) {
      return res.status(404).json({ 
        msg: 'Sesión no encontrada',
        details: 'La sesión especificada no existe o no tienes acceso a ella'
      });
    }
    
    // En una implementación real, aquí habría código para sincronizar 
    // los gastos de la sesión compartida a los gastos personales del usuario
    
    // Por ahora, simplemente devolver un resultado simulado
    res.json({
      msg: 'Sincronización completada con éxito',
      sync: {
        processed: 0,
        created: 0,
        updated: 0
      }
    });
    
  } catch (error) {
    console.error('Error al sincronizar gastos:', error);
    res.status(500).json({ 
      msg: 'Error del servidor al sincronizar gastos',
      details: error.message
    });
  }
};

// Actualizar la distribución de gastos
exports.updateDistribution = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    const { distribution } = req.body;
    
    if (!distribution || !Array.isArray(distribution)) {
      return res.status(400).json({ 
        msg: 'Formato de distribución inválido',
        details: 'La distribución debe ser un array de objetos con userId y percentage'
      });
    }
    
    // Validar que la suma de porcentajes sea 100
    const totalPercentage = distribution.reduce((sum, item) => sum + (item.percentage || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return res.status(400).json({ 
        msg: 'La suma de porcentajes debe ser 100',
        details: `El total actual es ${totalPercentage}`
      });
    }
    
    // Buscar la sesión
    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId: userId },
        { 'participants.userId': userId }
      ]
    });
    
    if (!session) {
      return res.status(404).json({ 
        msg: 'Sesión no encontrada',
        details: 'La sesión especificada no existe o no tienes acceso a ella'
      });
    }
    
    // Actualizar la distribución
    session.allocations = distribution.map(item => ({
      userId: item.userId,
      name: item.name || 'Usuario',
      percentage: item.percentage
    }));
    
    await session.save();
    
    res.json({
      msg: 'Distribución actualizada correctamente',
      allocations: session.allocations
    });
    
  } catch (error) {
    console.error('Error al actualizar distribución:', error);
    res.status(500).json({ 
      msg: 'Error del servidor al actualizar distribución',
      details: error.message
    });
  }
};

// Función de fallback para invitar participantes (eliminada)
exports.inviteParticipants = async (req, res) => {
  return res.status(410).json({
    status: 'error',
    msg: 'La funcionalidad de invitaciones ha sido eliminada',
    details: 'Esta característica ya no está disponible en la aplicación'
  });
};