const Session = require('../models/Session');
const User = require('../models/User');
const mongoose = require('mongoose');
const PersonalExpense = require('../models/PersonalExpense');

// Obtener todas las sesiones del usuario
exports.getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({
      'participants.user': req.user.id
    })
    .populate('creator', 'name email')
    .populate('participants.user', 'name email');
    
    // Verificar el estado de bloqueo basado en las aceptaciones
    for (const session of sessions) {
      if (session.allParticipantsAccepted && typeof session.allParticipantsAccepted === 'function') {
        if (session.allParticipantsAccepted()) {
          session.isLocked = false;
        }
      }
    }
    
    res.json(sessions);
  } catch (err) {
    console.error('Error al obtener sesiones:', err);
    res.status(500).json({ message: 'Error al obtener las sesiones compartidas' });
  }
};

// Crear una nueva sesión
exports.createSession = async (req, res) => {
  try {
    const { name, description, participants } = req.body;
    
    // Obtener el usuario creador con su email y nombre
    const creator = await User.findById(req.user.id).select('email name');
    if (!creator) {
      return res.status(400).json({ 
        message: 'Usuario creador no encontrado'
      });
    }
    
    console.log("Creador de la sesión:", creator);
    
    // Validar que los participantes tengan emails válidos
    const validParticipants = participants.every(p => {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return p.email && emailRegex.test(p.email.trim().toLowerCase());
    });
    
    if (!validParticipants) {
      return res.status(400).json({ 
        message: 'Uno o más emails de participantes no son válidos'
      });
    }
    
    // Buscar usuarios existentes por email
    const participantEmails = participants.map(p => p.email.toLowerCase().trim());
    const existingUsers = await User.find({ email: { $in: participantEmails } });
    
    // Crear mapa de email a ID de usuario
    const emailToUserId = {};
    existingUsers.forEach(user => {
      emailToUserId[user.email.toLowerCase()] = user._id;
    });
    
    // Crear la lista de participantes con IDs si existen, o solo emails si no
    const participantsList = [
      { 
        user: req.user.id, 
        email: creator.email,
        name: creator.name || creator.email.split('@')[0],
        role: 'admin',
        status: 'accepted' // El creador acepta automáticamente
      },
      ...participants.map(p => ({
        user: emailToUserId[p.email.toLowerCase()] || null,
        email: p.email.toLowerCase().trim(),
        name: p.name || p.email.split('@')[0],
        role: 'member',
        status: 'pending' // Los demás participantes comienzan como pendientes
      }))
    ];
    
    console.log("Lista de participantes:", participantsList);
    
    const newSession = new Session({
      name,
      description,
      creator: req.user.id,
      participants: participantsList,
      isLocked: true // La sesión comienza bloqueada
    });
    
    await newSession.save();
    
    // Poblar la información de los participantes antes de enviar la respuesta
    const populatedSession = await Session.findById(newSession._id)
      .populate('creator', 'name email')
      .populate('participants.user', 'name email');
    
    res.status(201).json(populatedSession);
  } catch (err) {
    console.error('Error al crear sesión:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Error de validación',
        errors: Object.values(err.errors).map(e => e.message)
      });
    }
    res.status(500).json({ message: 'Error al crear la sesión compartida' });
  }
};

// Obtener detalles de una sesión específica
exports.getSharedSessionDetails = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('participants.user', 'name email')
      .populate('expenses.paidBy', 'name email')
      .populate('expenses.sharedWith.user', 'name email');
      
    if (!session) {
      return res.status(404).json({ message: 'Sesión no encontrada' });
    }
    
    // Verificar que el usuario es participante
    const isParticipant = session.participants.some(
      p => p.user._id.toString() === req.user.id
    );
    
    if (!isParticipant) {
      return res.status(403).json({ message: 'No tienes acceso a esta sesión' });
    }
    
    res.json(session);
  } catch (err) {
    console.error('Error al obtener detalles de la sesión:', err);
    res.status(500).json({ message: 'Error al obtener los detalles de la sesión' });
  }
};

// Actualizar una sesión
exports.updateSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Sesión no encontrada' });
    }
    
    // Verificar que el usuario es admin
    const isAdmin = session.participants.find(
      p => p.user.toString() === req.user.id && p.role === 'admin'
    );
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'No tienes permisos para actualizar esta sesión' });
    }
    
    const updatedSession = await Session.findByIdAndUpdate(
      req.params.sessionId,
      { $set: req.body },
      { new: true }
    ).populate('participants.user', 'name email');
    
    res.json(updatedSession);
  } catch (err) {
    console.error('Error al actualizar sesión:', err);
    res.status(500).json({ message: 'Error al actualizar la sesión' });
  }
};

// Eliminar una sesión
exports.deleteSession = async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    
    // Buscar la sesión
    const sessionDoc = await Session.findById(sessionId);
    
    if (!sessionDoc) {
      return res.status(404).json({ message: 'Sesión no encontrada' });
    }

    // Verificar que el usuario tiene permisos para eliminar la sesión
    const isAdmin = sessionDoc.participants.find(
      p => p.user && p.user.toString() === req.user.id && p.role === 'admin'
    );
    
    const isCreator = sessionDoc.creator && sessionDoc.creator.toString() === req.user.id;
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ 
        message: 'No tienes permisos para eliminar esta sesión' 
      });
    }
    
    // Realizar operaciones en una transacción
    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();
    
    try {
      // 1. Eliminar todos los gastos personales relacionados con esta sesión
      console.log(`Eliminando gastos personales relacionados con la sesión ${sessionId}`);
      const result = await PersonalExpense.deleteMany({
        'sessionReference.sessionId': new mongoose.Types.ObjectId(sessionId)
      }, { session: mongoSession });
      
      console.log(`Eliminados ${result.deletedCount} gastos personales`);
      
      // 2. Eliminar la sesión
      await Session.findByIdAndDelete(sessionId, { session: mongoSession });
      
      // Confirmar la transacción
      await mongoSession.commitTransaction();
      console.log('Transacción completada: sesión y gastos relacionados eliminados');
      
      res.json({ 
        message: 'Sesión eliminada correctamente',
        expensesDeleted: result.deletedCount
      });
    } catch (err) {
      // Si hay error, revertir la transacción
      await mongoSession.abortTransaction();
      console.error('Error en transacción al eliminar sesión:', err);
      throw err;
    } finally {
      // Finalizar la sesión de MongoDB
      mongoSession.endSession();
    }
  } catch (err) {
    console.error('Error al eliminar sesión:', err);
    res.status(500).json({ message: 'Error al eliminar la sesión', error: err.message });
  }
};

// Aceptar invitación a una sesión
exports.acceptInvitation = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Sesión no encontrada' });
    }
    
    // Encontrar al participante actual
    const participantIndex = session.participants.findIndex(
      p => p.email.toLowerCase() === req.user.email.toLowerCase()
    );
    
    if (participantIndex === -1) {
      return res.status(403).json({ message: 'No eres participante de esta sesión' });
    }
    
    // Actualizar el estado del participante
    session.participants[participantIndex].status = 'accepted';
    session.participants[participantIndex].user = req.user.id; // Vincular el usuario si no estaba vinculado
    
    // Verificar si todos los participantes han aceptado
    const allAccepted = session.participants.every(p => p.status === 'accepted');
    if (allAccepted) {
      session.isLocked = false; // Desbloquear la sesión
    }
    
    await session.save();
    
    // Poblar la información actualizada
    const updatedSession = await Session.findById(session._id)
      .populate('creator', 'name email')
      .populate('participants.user', 'name email');
    
    res.json(updatedSession);
  } catch (err) {
    console.error('Error al aceptar invitación:', err);
    res.status(500).json({ message: 'Error al aceptar la invitación a la sesión' });
  }
};

// Rechazar invitación a una sesión
exports.rejectInvitation = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Sesión no encontrada' });
    }
    
    // Encontrar al participante actual
    const participantIndex = session.participants.findIndex(
      p => p.email.toLowerCase() === req.user.email.toLowerCase()
    );
    
    if (participantIndex === -1) {
      return res.status(403).json({ message: 'No eres participante de esta sesión' });
    }
    
    // Marcar la sesión para eliminación
    session.status = 'archived';
    session.participants[participantIndex].status = 'rejected';
    
    await session.save();
    
    // Eliminar la sesión si alguien la rechaza
    await Session.findByIdAndDelete(session._id);
    
    res.json({ message: 'Invitación rechazada y sesión eliminada correctamente' });
  } catch (err) {
    console.error('Error al rechazar invitación:', err);
    res.status(500).json({ message: 'Error al rechazar la invitación a la sesión' });
  }
};

// Responder a una invitación
exports.respondToInvitation = async (req, res) => {
  try {
    const { accept } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const sessionId = req.params.sessionId;

    console.log(`Usuario ${userId} (${userEmail}) respondiendo a invitación para sesión ${sessionId}, accept=${accept}`);
    
    // Buscar la sesión
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Sesión no encontrada' });
    }

    // Buscar al participante por correo electrónico o por ID de usuario
    let participantIndex = session.participants.findIndex(
      p => (p.user && p.user.toString() === userId) || 
           (p.email && p.email.toLowerCase() === userEmail.toLowerCase())
    );
    
    if (participantIndex === -1) {
      console.log(`Usuario ${userEmail} no figura como participante en la sesión ${sessionId}`);
      return res.status(400).json({ 
        message: 'No tienes invitaciones pendientes para esta sesión' 
      });
    }

    const participant = session.participants[participantIndex];
    
    console.log(`Encontrado participante: ${JSON.stringify(participant)}`);
    
    // Verificar si el estado actual es "pending" o si se está cambiando el estado
    if (participant.status !== 'pending' && participant.status === (accept ? 'accepted' : 'rejected')) {
      console.log(`El participante ya tiene el estado ${participant.status}`);
      return res.status(200).json({ 
        message: `Ya has ${accept ? 'aceptado' : 'rechazado'} esta invitación previamente`,
        session: await Session.findById(sessionId)
          .populate('creator', 'name email')
          .populate('participants.user', 'name email')
      });
    }
    
    // Asegurarse de que esté vinculado el usuario
    if (!participant.user) {
      participant.user = userId;
    }
    
    // Actualizar el estado del participante
    participant.status = accept ? 'accepted' : 'rejected';
    participant.responseDate = new Date();
    session.participants[participantIndex] = participant;
    
    if (accept) {
      // Si el usuario acepta, verificar si todos los participantes han aceptado para desbloquear la sesión
      if (session.allParticipantsAccepted()) {
        console.log('Todos los participantes han aceptado. Desbloqueando sesión.');
        session.isLocked = false;
      } else {
        console.log('No todos los participantes han aceptado. La sesión sigue bloqueada.');
        // Asegurarse de que la sesión esté bloqueada
        session.isLocked = true;
      }
    } else {
      // Si el usuario rechaza, eliminarlo de la sesión
      console.log(`El usuario ${userId} rechazó la invitación. Eliminando de la sesión.`);
      session.participants = session.participants.filter((p, idx) => idx !== participantIndex);
    }
    
    await session.save();
    
    let responseMessage = '';
    let updatedSession = null;
    
    if (accept) {
      // Si aceptó, devolver la sesión actualizada
      updatedSession = await Session.findById(sessionId)
        .populate('creator', 'name email')
        .populate('participants.user', 'name email');
      
      // Verificar si todos los participantes han aceptado para el mensaje
      if (updatedSession.allParticipantsAccepted()) {
        responseMessage = 'Has aceptado la invitación. Todos los participantes han aceptado, ya puedes acceder a la sesión.';
      } else {
        responseMessage = 'Has aceptado la invitación. La sesión se desbloqueará cuando todos los participantes acepten.';
      }
    } else {
      // Si rechazó, enviar mensaje de confirmación
      responseMessage = 'Has rechazado la invitación. La sesión ha sido eliminada de tu lista.';
    }
    
    res.json({
      message: responseMessage,
      session: updatedSession
    });
  } catch (err) {
    console.error('Error al responder a la invitación:', err);
    res.status(500).json({ message: 'Error al procesar la respuesta a la invitación' });
  }
};

// Sincronizar gastos compartidos a gastos personales
exports.syncToPersonal = async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const userId = req.user.id;
    
    // Buscar la sesión
    const session = await Session.findById(sessionId)
      .populate('expenses.paidBy', 'name email')
      .populate('expenses.sharedWith.user', 'name email');
    
    if (!session) {
      return res.status(404).json({ message: 'Sesión no encontrada' });
    }
    
    // Verificar que el usuario es un participante activo
    const isParticipant = session.participants.some(
      p => p.user.toString() === userId && p.status === 'accepted'
    );
    
    if (!isParticipant) {
      return res.status(403).json({ 
        message: 'No tienes acceso a esta sesión o tu invitación está pendiente' 
      });
    }
    
    // Iniciar transacción para sincronización
    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();
    
    try {
      // Contar estadísticas de sincronización
      const syncStats = {
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0
      };
      
      // Procesar cada gasto en el que el usuario esté involucrado
      for (const expense of session.expenses) {
        // Si el usuario pagó o está en sharedWith
        const userShare = expense.sharedWith.find(
          share => share.user._id.toString() === userId
        );
        
        const userPaid = expense.paidBy._id.toString() === userId;
        
        if (!userPaid && !userShare) {
          continue; // El usuario no está involucrado en este gasto
        }
        
        syncStats.processed++;
        
        // Buscar si ya existe un gasto personal referenciado
        let personalExpense = await PersonalExpense.findOne({
          'sessionReference.sessionId': sessionId,
          'sessionReference.expenseId': expense._id,
          userId
        });
        
        // Crear o actualizar el gasto personal
        if (personalExpense) {
          personalExpense.amount = userShare ? userShare.amount : expense.amount;
          personalExpense.description = `[Sesión] ${session.name}: ${expense.description}`;
          personalExpense.date = expense.date;
          personalExpense.category = expense.category;
          syncStats.updated++;
        } else {
          personalExpense = new PersonalExpense({
            userId,
            amount: userShare ? userShare.amount : expense.amount,
            description: `[Sesión] ${session.name}: ${expense.description}`,
            date: expense.date,
            category: expense.category,
            sessionReference: {
              sessionId,
              expenseId: expense._id
            }
          });
          syncStats.created++;
        }
        
        await personalExpense.save({ session: mongoSession });
      }
      
      await mongoSession.commitTransaction();
      
      res.json({ 
        message: 'Sincronización completada',
        sync: syncStats
      });
    } catch (err) {
      await mongoSession.abortTransaction();
      throw err;
    } finally {
      mongoSession.endSession();
    }
  } catch (err) {
    console.error('Error al sincronizar gastos:', err);
    res.status(500).json({ message: 'Error al sincronizar los gastos a personales' });
  }
};

// Actualizar la distribución de gastos
exports.updateDistribution = async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const { distribution } = req.body;
    
    if (!distribution || !Array.isArray(distribution)) {
      return res.status(400).json({ message: 'Formato de distribución inválido' });
    }
    
    // Buscar la sesión
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Sesión no encontrada' });
    }
    
    // Verificar que el usuario es un participante activo
    const isActive = session.participants.some(
      p => p.user.toString() === req.user.id && p.status === 'accepted'
    );
    
    if (!isActive) {
      return res.status(403).json({ message: 'No tienes acceso a esta sesión' });
    }
    
    // Actualizar la distribución personalizada
    session.customDistribution = distribution;
    await session.save();
    
    res.json(session);
  } catch (err) {
    console.error('Error al actualizar distribución:', err);
    res.status(500).json({ message: 'Error al actualizar la distribución de gastos' });
  }
}; 