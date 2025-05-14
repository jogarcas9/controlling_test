const mongoose = require('mongoose');
const { SharedSession, PersonalExpense, ParticipantAllocation, User } = require('../models');
const { allocationService, syncService } = require('../services');
const { ObjectId } = mongoose.Types;
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const generatePDF = require('../utils/generatePDF');

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
      
      // Preservar la propiedad isLocked del objeto original
      sessionObj.isLocked = session.isLocked;
      
      // Determinar el estado de la sesión para este usuario
      if (sessionObj.userId && sessionObj.userId._id.toString() === userId) {
        // El usuario es el creador
        console.log(`Usuario ${userId} es creador de la sesión ${sessionObj._id}`);
        sessionObj.status = session.allParticipantsAccepted() ? 'active' : 'pending';
        
        // Si el usuario es creador, verificar si la sesión debería estar desbloqueada
        // incluso si hay participantes que no han aceptado
        if (session.participants.length === 1 || session.allParticipantsAccepted()) {
          sessionObj.isLocked = false;
        }
        
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
            
            // Si el participante ha aceptado, no debería estar bloqueado para él
            if (participant.status === 'accepted') {
              sessionObj.isLocked = false;
            }
          } else {
            sessionObj.status = 'rejected';
          }
        } else {
          console.log(`¡INCONSISTENCIA! Usuario ${userId} no es ni creador ni participante en sesión ${sessionObj._id}`);
          sessionObj.status = 'unknown';
        }
      }
      
      console.log(`Sesión ${sessionObj._id}: isLocked = ${sessionObj.isLocked}`);
      processedSessions.push(sessionObj);
    }

    console.log(`Devolviendo ${processedSessions.length} sesiones procesadas`);
    res.json(processedSessions);
  } catch (error) {
    console.error('Error al obtener sesiones:', error);
    res.status(500).json({ msg: 'Error del servidor al obtener sesiones' });
  }
};

// Obtener todas las invitaciones pendientes para el usuario actual
exports.getPendingInvitations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email.toLowerCase();
    
    console.log(`Buscando invitaciones pendientes para el usuario ${userId} (${userEmail})`);
    
    // Buscar sesiones donde el usuario es un participante con estado pendiente
    // y NO es el creador de la sesión
    const pendingSessions = await SharedSession.find({
      'participants.email': userEmail,
      'participants.status': 'pending',
      userId: { $ne: userId } // Excluir sesiones donde el usuario actual es el creador
    })
    .populate('userId', 'nombre email')
    .sort({ createdAt: -1 });
    
    console.log(`Encontradas ${pendingSessions.length} invitaciones pendientes`);
    
    // Transformar los datos para la respuesta
    const pendingInvitations = pendingSessions.map(session => {
      // Encontrar la información del participante actual
      const currentParticipant = session.participants.find(
        p => p.email.toLowerCase() === userEmail
      );
      
      // Obtener información del creador
      const creator = session.userId;
      
      return {
        _id: session._id,
        sessionId: session._id,
        sessionName: session.name,
        description: session.description,
        invitedBy: creator ? (creator.nombre || creator.email) : 'Usuario desconocido',
        invitationDate: currentParticipant.invitationDate,
        participantsCount: session.participants.length,
        participants: session.participants.map(p => ({
          name: p.name,
          email: p.email,
          status: p.status
        })),
        color: session.color
      };
    });
    
    res.json(pendingInvitations);
  } catch (error) {
    console.error('Error al obtener invitaciones pendientes:', error);
    res.status(500).json({ msg: 'Error del servidor al obtener invitaciones pendientes' });
  }
};

// Verificar si todos los participantes han aceptado (función auxiliar)
const checkAllParticipantsAccepted = (participants, creatorId) => {
  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    return true;
  }
  
  return participants.every(p => 
    p.status === 'accepted' || 
    (p.userId && p.userId.toString() === creatorId.toString())
  );
};

// Responder a una invitación de sesión compartida
exports.respondToInvitation = async (req, res) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();
  
  try {
    const { id } = req.params;
    const { response } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email.toLowerCase();
    
    console.log(`Usuario ${userId} (${userEmail}) respondiendo a invitación ${id} con: ${response}`);
    console.log('Cuerpo de la solicitud:', JSON.stringify(req.body));
    console.log('Parámetros de la ruta:', JSON.stringify(req.params));
    
    if (!['accept', 'reject'].includes(response)) {
      console.log('Respuesta inválida:', response);
      return res.status(400).json({ msg: 'Respuesta no válida. Use "accept" o "reject"' });
    }
    
    // Buscar la sesión
    console.log(`Buscando sesión con ID: ${id}`);
    const sharedSession = await SharedSession.findById(id).session(dbSession);
    
    if (!sharedSession) {
      console.log(`Sesión con ID ${id} no encontrada`);
      return res.status(404).json({ msg: 'Sesión compartida no encontrada' });
    }
    
    console.log(`Sesión encontrada: ${sharedSession._id}, creador: ${sharedSession.userId}`);
    
    // Verificar que el usuario no sea el creador de la sesión
    if (sharedSession.userId.toString() === userId) {
      console.log('El usuario es el creador de la sesión');
      return res.status(400).json({ 
        msg: 'No puedes responder a esta invitación',
        details: 'Eres el creador de esta sesión y ya estás incluido automáticamente'
      });
    }
    
    // Buscar al participante por email
    console.log(`Buscando participante con email: ${userEmail} entre ${sharedSession.participants.length} participantes`);
    const participantIndex = sharedSession.participants.findIndex(
      p => p.email.toLowerCase() === userEmail
    );
    
    if (participantIndex === -1) {
      console.log(`Participante con email ${userEmail} no encontrado en la sesión`);
      return res.status(403).json({ msg: 'No eres participante de esta sesión' });
    }
    
    console.log(`Participante encontrado en índice ${participantIndex}: ${JSON.stringify(sharedSession.participants[participantIndex])}`);
    
    // Verificar que la invitación esté pendiente
    if (sharedSession.participants[participantIndex].status !== 'pending') {
      console.log(`La invitación ya fue respondida con estado: ${sharedSession.participants[participantIndex].status}`);
      return res.status(400).json({ msg: 'Ya has respondido a esta invitación anteriormente' });
    }
    
    // Actualizar el estado del participante
    console.log(`Actualizando estado del participante a: ${response === 'accept' ? 'accepted' : 'rejected'}`);
    sharedSession.participants[participantIndex].status = response === 'accept' ? 'accepted' : 'rejected';
    sharedSession.participants[participantIndex].responseDate = new Date();
    
    // Si el usuario acepta, vincular su userId
    if (response === 'accept') {
      console.log(`Vinculando userId ${userId} al participante`);
      sharedSession.participants[participantIndex].userId = userId;
      
      // Verificar si todos los participantes han aceptado usando nuestra función auxiliar
      const allAccepted = checkAllParticipantsAccepted(sharedSession.participants, sharedSession.userId);
      
      console.log(`¿Todos los participantes han aceptado? ${allAccepted}`);
      
      if (allAccepted) {
        sharedSession.isLocked = false; // Desbloquear la sesión
        console.log(`Todos los participantes han aceptado. Desbloqueando sesión ${id}`);
      }
    }
    
    console.log('Guardando cambios en la sesión...');
    await sharedSession.save({ session: dbSession });
    console.log('Confirmando transacción...');
    await dbSession.commitTransaction();
    
    const responseMessage = response === 'accept' 
      ? 'Has aceptado la invitación a la sesión compartida'
      : 'Has rechazado la invitación a la sesión compartida';
    
    console.log(`Respondiendo con mensaje: ${responseMessage}`);
    
    // Si se aceptó la invitación, intentamos actualizar distribuciones en segundo plano
    // pero sin depender del resultado para la respuesta actual
    if (response === 'accept') {
      // Usar process.nextTick para ejecutar después de enviar la respuesta
      process.nextTick(async () => {
        try {
          // Cargar el servicio de asignación de manera segura
          let allocationService;
          try {
            allocationService = require('../services/allocationService');
          } catch (reqError) {
            console.error('Error al cargar el servicio de asignación:', reqError);
            return; // Salir si no se puede cargar
          }
          
          // Verificar que el servicio y el método existan
          if (allocationService && typeof allocationService.distributeAmount === 'function') {
            try {
              // Buscar la sesión actualizada fuera de la transacción
              const updatedSession = await SharedSession.findById(id);
              if (updatedSession) {
                await allocationService.distributeAmount(updatedSession);
                console.log(`Distribución de montos actualizada para sesión ${id}`);
              } else {
                console.log(`No se encontró la sesión ${id} para actualizar distribuciones`);
              }
            } catch (allocError) {
              console.error('Error al distribuir montos en segundo plano:', allocError);
              // Este error no afecta la respuesta al usuario ya enviada
            }
          } else {
            console.log('El servicio de asignación no está disponible o no tiene el método necesario');
          }
        } catch (error) {
          console.error('Error general al procesar distribuciones en segundo plano:', error);
        }
      });
    }
    
    res.json({
      message: responseMessage,
      status: response === 'accept' ? 'accepted' : 'rejected',
      sessionId: sharedSession._id
    });
    
  } catch (error) {
    await dbSession.abortTransaction();
    console.error('Error al responder a la invitación:', error);
    console.error('Detalles del error:', error.stack);
    
    // Información adicional para diagnóstico
    try {
      console.log('Información de la solicitud:');
      console.log('- ID de sesión:', req.params?.id);
      console.log('- Usuario:', req.user?.id, req.user?.email);
      console.log('- Respuesta:', req.body?.response);
    } catch (logError) {
      console.error('Error al registrar información de diagnóstico:', logError);
    }
    
    res.status(500).json({ msg: 'Error del servidor al procesar la respuesta' });
  } finally {
    dbSession.endSession();
  }
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
        console.log(`Excluyendo al creador ${creatorEmail} de la lista de participantes invitados`);
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
      responseDate: new Date() // Establecer fecha de respuesta para el creador
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
        role: 'member', // Los participantes invitados tienen rol 'member'
        canEdit: participant.canEdit || false,
        canDelete: participant.canDelete || false,
        invitationDate: new Date() // Establecer fecha de invitación
      });
    }

    // Si no hay otros participantes además del creador, desbloquear la sesión
    if (newSession.participants.length === 1) {
      console.log(`Solo hay un participante (el creador). Desbloqueando sesión.`);
      newSession.isLocked = false;
    }

    // Inicializar la asignación de porcentajes equitativamente entre los participantes
    const participantCount = newSession.participants.length;
    const equalPercentage = Math.floor(100 / participantCount);
    let remainingPercentage = 100 - (equalPercentage * participantCount);
    
    console.log(`Inicializando distribución de gastos: ${participantCount} participantes con ${equalPercentage}% cada uno`);
    
    newSession.allocations = newSession.participants.map((participant, index) => {
      // Añadir el porcentaje sobrante al primer participante para asegurar que sume exactamente 100%
      const percentage = index === 0 ? equalPercentage + remainingPercentage : equalPercentage;
      return {
        userId: participant.userId,
        name: participant.name,
        percentage: percentage
      };
    });

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
  // Iniciar una sesión de transacción
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();
  
  try {
    const sessionId = req.params.id;
    console.log(`Intentando eliminar sesión: ${sessionId} por usuario: ${req.user.id}`);
    
    // Primero verificar si la sesión existe y pertenece al usuario
    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId: req.user.id },
        { 'participants.userId': req.user.id, 'participants.role': 'admin' }
      ]
    });

    if (!session) {
      console.log(`Sesión ${sessionId} no encontrada o no autorizada para usuario ${req.user.id}`);
      return res.status(404).json({ msg: 'Sesión no encontrada o no tienes permisos para eliminarla' });
    }

    // 1. Buscar todas las asignaciones vinculadas a esta sesión
    const allocations = await ParticipantAllocation.find({ sessionId });
    const allocationIds = allocations.map(allocation => allocation._id);
    
    console.log(`Encontradas ${allocations.length} asignaciones relacionadas con la sesión ${sessionId}`);

    // 2. Eliminar todos los gastos personales vinculados a las asignaciones
    const deletePersonalExpensesByAllocation = await PersonalExpense.deleteMany({ 
      allocationId: { $in: allocationIds } 
    }, { session: dbSession });
    console.log(`Eliminados ${deletePersonalExpensesByAllocation.deletedCount} gastos personales por allocationId`);

    // 3. Eliminar todas las asignaciones vinculadas a esta sesión
    const deleteAllocationResult = await ParticipantAllocation.deleteMany({ sessionId }, { session: dbSession });
    console.log(`Eliminadas ${deleteAllocationResult.deletedCount} asignaciones relacionadas con la sesión ${sessionId}`);

    // 4. Eliminar la sesión compartida
    const deleteResult = await SharedSession.findByIdAndDelete(sessionId, { session: dbSession });
    
    console.log(`Sesión ${sessionId} eliminada con éxito:`, deleteResult ? 'Sí' : 'No');
    
    // Confirmar la transacción
    await dbSession.commitTransaction();
    
    res.json({ 
      msg: 'Sesión eliminada exitosamente',
      success: true,
      deletedAllocations: deleteAllocationResult.deletedCount,
      deletedPersonalExpenses: deletePersonalExpensesByAllocation.deletedCount
    });
  } catch (err) {
    // Revertir la transacción en caso de error
    await dbSession.abortTransaction();
    
    console.error(`Error al eliminar sesión ${req.params.id}:`, err.message);
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        msg: 'ID de sesión inválido',
        error: err.message
      });
    }
    return res.status(500).json({ 
      msg: 'Error del servidor al eliminar sesión',
      error: err.message
    });
  } finally {
    dbSession.endSession();
  }
};

// Obtener detalles de una sesión compartida específica
exports.getSharedSessionDetails = async (req, res) => {
    try {
        console.log(`Obteniendo detalles de sesión: ${req.params.id} para usuario: ${req.user.id}`);
        
        const session = await SharedSession.findOne({
            _id: req.params.id,
            isActive: true,
            $or: [
                { userId: req.user.id },
                { 'participants.userId': req.user.id }
            ]
        })
        .populate('userId', 'nombre email')
        .populate('participants.userId', 'nombre email');

        if (!session) {
            console.log(`Sesión ${req.params.id} no encontrada para usuario ${req.user.id}`);
            return res.status(404).json({ msg: 'Sesión no encontrada' });
        }

        // Asegurarse de que la asignación de porcentajes existe
        if (!session.allocations || session.allocations.length === 0) {
            console.log(`Sesión ${req.params.id} no tiene asignación de porcentajes, creando una equitativa`);
            
            // Crear distribución equitativa si no existe
            const participantCount = session.participants.length;
            if (participantCount > 0) {
                const equalPercentage = Math.floor(100 / participantCount);
                let remainingPercentage = 100 - (equalPercentage * participantCount);
                
                session.allocations = session.participants.map((participant, index) => ({
                    userId: participant.userId,
                    name: participant.name,
                    percentage: index === 0 ? equalPercentage + remainingPercentage : equalPercentage
                }));
                
                await session.save();
                console.log(`Distribución equitativa creada para sesión ${req.params.id}`);
            }
        }

        console.log(`Devolviendo detalles de sesión ${req.params.id} con ${session.participants.length} participantes y ${session.allocations?.length || 0} asignaciones`);
        res.json(session);
    } catch (error) {
        console.error(`Error al obtener detalles de la sesión ${req.params.id}:`, error);
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
        const { description, amount, date, paidBy, name = 'Gasto', category = 'Otros', isRecurring = false } = req.body;
        
        // Buscar la sesión
        const session = await SharedSession.findOne({
            _id: req.params.id,
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

        // Crear el objeto de gasto
        const newExpense = {
            name,
            description,
            amount: Number(amount) || 0,
            date: date ? new Date(date) : new Date(),
            category,
            paidBy,
            isRecurring
        };

        // Usar el método del modelo para añadir el gasto correctamente
        await session.addExpense(newExpense);

        // Generar asignaciones para el mes actual
        const expenseDate = newExpense.date;
        const year = expenseDate.getFullYear();
        const month = expenseDate.getMonth(); // 0-11

        try {
            // Verificar que el servicio de asignaciones está disponible
            if (typeof allocationService.generateMonthlyAllocations === 'function') {
                console.log(`Generando asignaciones automáticamente para año=${year}, mes=${month} después de añadir gasto`);
                await allocationService.generateMonthlyAllocations(session, year, month);
                
                // Después de generar asignaciones, ejecutar limpieza y actualización de datos
                try {
                    // Eliminar asignaciones duplicadas
                    await syncService.fixDuplicateAllocations(session._id);
                    console.log('Limpiadas asignaciones duplicadas');
                    
                    // Actualizar nombres de usuario en las asignaciones
                    await syncService.updateUserNamesInAllocations(session._id);
                    console.log('Actualizados nombres de usuario en asignaciones');
                    
                    // Sincronizar las asignaciones con los gastos personales
                    const allocations = await ParticipantAllocation.find({ 
                        sessionId: session._id,
                        year,
                        month
                    });
                    
                    console.log(`Sincronizando ${allocations.length} asignaciones con gastos personales`);
                    
                    // Sincronizar cada asignación
                    for (const allocation of allocations) {
                        try {
                            await syncService.syncAllocationToPersonalExpense(allocation);
                        } catch (syncError) {
                            console.warn(`Error al sincronizar asignación ${allocation._id}:`, syncError.message);
                            // Continuar con las siguientes asignaciones
                        }
                    }
                } catch (cleanupError) {
                    console.error('Error en la limpieza de datos:', cleanupError.message);
                    // No interrumpimos el flujo principal por errores en la limpieza
                }
            }
        } catch (allocError) {
            console.error(`Error al generar asignaciones para año=${year}, mes=${month}:`, allocError);
            // No interrumpir el proceso principal si falla la generación de asignaciones
        }

        // Devolver la sesión actualizada
        res.json(session);
    } catch (error) {
        console.error('Error al añadir gasto:', error);
        res.status(500).json({ msg: 'Error al añadir gasto', error: error.message });
    }
};

// Eliminar un gasto de una sesión
exports.deleteExpense = async (req, res) => {
    // Iniciar una sesión de transacción
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    
    try {
        const sessionId = req.params.id;
        const expenseId = req.params.expenseId;
        
        console.log(`Iniciando eliminación del gasto ${expenseId} en la sesión ${sessionId}`);
        
        // Verificar que el usuario esté autenticado
        if (!req.user || !req.user.id) {
            console.error('Usuario no autenticado o ID de usuario no disponible');
            await dbSession.abortTransaction();
            return res.status(401).json({ msg: 'Usuario no autenticado' });
        }
        
        const userId = req.user.id;
        
        console.log(`Usuario ${userId} intentando eliminar gasto ${expenseId} de la sesión ${sessionId}`);
        
        // Buscar la sesión
        const session = await SharedSession.findOne({
            _id: sessionId,
            $or: [
                { userId: userId },
                { 'participants.userId': userId }
            ]
        }).session(dbSession);

        if (!session) {
            console.log(`Sesión ${sessionId} no encontrada o usuario ${userId} no autorizado`);
            await dbSession.abortTransaction();
            return res.status(404).json({ msg: 'Sesión no encontrada o no autorizada' });
        }

        // Variables para guardar información del gasto
        let amountToSubtract = 0;
        let isRecurring = false;
        let expenseDescription = '';
        let expenseCategory = '';
        let expensePaidBy = null;
        let expenseDate = new Date();
        let gastoEncontrado = false;

        // Buscar el gasto directamente en el array principal de expenses
        let expense = null;
        try {
            expense = session.expenses.id(expenseId);
        } catch (err) {
            console.log(`Error al buscar el gasto en expenses: ${err.message}`);
            expense = null;
        }

        if (expense) {
            console.log(`Gasto encontrado en el array principal de expenses`);
            gastoEncontrado = true;
            amountToSubtract = expense.amount || 0;
            isRecurring = expense.isRecurring || false;
            expenseDescription = expense.description || '';
            expenseCategory = expense.category || '';
            expensePaidBy = expense.paidBy ? expense.paidBy.toString() : null;
            expenseDate = expense.date ? new Date(expense.date) : new Date();
        } else {
            console.log(`Gasto con ID ${expenseId} no encontrado en expenses principal. Buscando en yearlyExpenses...`);
            
            // Intentar buscar en la estructura yearlyExpenses
            for (const yearData of session.yearlyExpenses || []) {
                if (!yearData || !yearData.months) continue;
                
                for (const monthData of yearData.months || []) {
                    if (!monthData || !monthData.expenses) continue;
                    
                    const matchingExpense = monthData.expenses.find(e => 
                        e && e._id && e._id.toString && e._id.toString() === expenseId
                    );
                    
                    if (matchingExpense) {
                        console.log(`Gasto encontrado en yearlyExpenses: año=${yearData.year}, mes=${monthData.month}`);
                        gastoEncontrado = true;
                        amountToSubtract = matchingExpense.amount || 0;
                        isRecurring = matchingExpense.isRecurring || false;
                        expenseDescription = matchingExpense.description || '';
                        expenseCategory = matchingExpense.category || '';
                        expensePaidBy = matchingExpense.paidBy ? matchingExpense.paidBy.toString() : null;
                        expenseDate = matchingExpense.date ? new Date(matchingExpense.date) : new Date();
                        break;
                    }
                }
                if (gastoEncontrado) break;
            }
        }
        
        if (!gastoEncontrado) {
            console.log(`Gasto ${expenseId} no encontrado en ninguna parte de la sesión ${sessionId}`);
            await dbSession.abortTransaction();
            return res.status(404).json({ msg: 'Gasto no encontrado' });
        }
        
        // Verificar que el usuario sea participante
        const isParticipant = session.participants.some(p => 
            p.userId && p.userId.toString() === userId
        );
        
        if (!isParticipant) {
            console.log(`Usuario ${userId} no es participante de la sesión ${sessionId}`);
            await dbSession.abortTransaction();
            return res.status(403).json({ msg: 'No tienes permisos para eliminar este gasto' });
        }

        console.log(`Gasto a eliminar: ID=${expenseId}, monto=${amountToSubtract}, recurrente=${isRecurring}`);
        
        // Eliminar el gasto del array principal de expenses (si existe)
        try {
            // Usar findByIdAndUpdate con un operador $pull directo sobre el array de gastos
            const pullResult = await SharedSession.findByIdAndUpdate(
                sessionId,
                { 
                    $pull: { expenses: { _id: mongoose.Types.ObjectId(expenseId) } },
                    $inc: { totalAmount: -amountToSubtract },
                    $set: { lastActivity: Date.now() }
                },
                { session: dbSession, new: true }  // Devolver el documento actualizado
            );
            
            if (pullResult) {
                const expenseStillExists = pullResult.expenses.some(e => 
                    e._id && e._id.toString() === expenseId
                );
                
                if (!expenseStillExists) {
                    console.log(`✅ Gasto con ID ${expenseId} eliminado correctamente del array principal de expenses`);
                } else {
                    console.log(`⚠️ El gasto con ID ${expenseId} aún existe en el array principal después de la operación $pull`);
                    
                    // Intentar eliminar con método alternativo
                    console.log(`Intentando eliminar con método alternativo mediante filtrado manual...`);
                    pullResult.expenses = pullResult.expenses.filter(e => 
                        !e._id || e._id.toString() !== expenseId
                    );
                    await pullResult.save({ session: dbSession });
                    console.log(`Filtrado manual de expenses completado`);
                }
            } else {
                console.log(`⚠️ No se recibió respuesta al eliminar el gasto del array principal`);
            }
        } catch (pullError) {
            console.error(`❌ Error al eliminar el gasto del array principal: ${pullError.message}`);
            // Continuar con el resto del proceso
        }
        
        // Si NO es recurrente, eliminar solo la instancia específica de yearlyExpenses
        if (!isRecurring) {
            console.log(`El gasto ${expenseId} NO es recurrente, buscando y eliminando solo la instancia específica...`);
            
            // Buscar en qué año/mes está el gasto
            const originalMonth = expenseDate.getMonth(); // 0-11
            const originalYear = expenseDate.getFullYear();
            
            console.log(`Fecha original del gasto: ${expenseDate.toISOString()}, año=${originalYear}, mes=${originalMonth}`);
            
            let gastoEliminado = false;
            
            // Recorrer yearlyExpenses para encontrar y eliminar el gasto exacto
            for (const yearData of session.yearlyExpenses || []) {
                if (!yearData || !yearData.months || yearData.year !== originalYear) continue;
                
                const monthData = yearData.months.find(m => m && m.month === originalMonth);
                if (!monthData || !monthData.expenses) continue;
                
                const expenseIndex = monthData.expenses.findIndex(e => 
                    e && e._id && e._id.toString && e._id.toString() === expenseId
                );
                
                if (expenseIndex !== -1) {
                    console.log(`✅ Gasto normal encontrado en año=${originalYear}, mes=${originalMonth}, eliminándolo...`);
                    const expenseToRemove = monthData.expenses[expenseIndex];
                    monthData.totalAmount -= (expenseToRemove.amount || 0);
                    monthData.expenses.splice(expenseIndex, 1);
                    gastoEliminado = true;
                    break;
                }
            }
            
            if (gastoEliminado) {
                console.log(`✅ Gasto normal eliminado de yearlyExpenses`);
                
                // Actualizar la estructura en la base de datos
                await SharedSession.findByIdAndUpdate(
                    sessionId,
                    { 
                        $set: { 
                            yearlyExpenses: session.yearlyExpenses,
                            lastActivity: Date.now() 
                        }
                    },
                    { session: dbSession }
                );
            } else {
                console.log(`⚠️ No se encontró el gasto normal en yearlyExpenses para eliminarlo`);
                
                // Intentar eliminarlo en todos los meses posibles (por si la fecha es incorrecta)
                console.log(`Buscando el gasto en todos los meses...`);
                
                let totalEliminaciones = 0;
                
                for (const yearData of session.yearlyExpenses || []) {
                    if (!yearData || !yearData.months) continue;
                    
                    for (const monthData of yearData.months || []) {
                        if (!monthData || !monthData.expenses) continue;
                        
                        const expenseIndex = monthData.expenses.findIndex(e => 
                            e && e._id && e._id.toString && e._id.toString() === expenseId
                        );
                        
                        if (expenseIndex !== -1) {
                            console.log(`✅ Gasto encontrado en año=${yearData.year}, mes=${monthData.month}, eliminándolo...`);
                            const expenseToRemove = monthData.expenses[expenseIndex];
                            monthData.totalAmount -= (expenseToRemove.amount || 0);
                            monthData.expenses.splice(expenseIndex, 1);
                            totalEliminaciones++;
                        }
                    }
                }
                
                if (totalEliminaciones > 0) {
                    console.log(`✅ Se eliminaron ${totalEliminaciones} ocurrencias del gasto en yearlyExpenses`);
                    
                    // Actualizar la estructura en la base de datos
                    await SharedSession.findByIdAndUpdate(
                        sessionId,
                        { 
                            $set: { 
                                yearlyExpenses: session.yearlyExpenses,
                                lastActivity: Date.now() 
                            }
                        },
                        { session: dbSession }
                    );
                } else {
                    console.log(`❌ No se encontró el gasto en yearlyExpenses`);
                }
            }
        } else {
            // Si el gasto es recurrente, también eliminar todas las instancias futuras
            console.log(`El gasto ${expenseId} es recurrente, eliminando todas las instancias futuras...`);
            
            // Obtener la fecha del gasto original para determinar mes/año inicial
            const originalMonth = expenseDate.getMonth(); // 0-11
            const originalYear = expenseDate.getFullYear();
            
            console.log(`Fecha original del gasto recurrente: ${expenseDate.toISOString()}, año=${originalYear}, mes=${originalMonth}`);
            
            // Modificación en memoria de yearlyExpenses
            let totalGastosEliminados = 0;
            
            // Para cada año en yearlyExpenses
            for (const yearData of session.yearlyExpenses || []) {
                if (!yearData || !yearData.months) continue;
                
                // Para cada mes en el año
                for (const monthData of yearData.months || []) {
                    if (!monthData || !monthData.expenses) continue;
                    
                    // 1. Eliminar el gasto exacto si existe en este mes
                    const originalExpenseIndex = monthData.expenses.findIndex(e => 
                        e && e._id && e._id.toString && e._id.toString() === expenseId
                    );
                    
                    if (originalExpenseIndex !== -1) {
                        console.log(`✅ Eliminando gasto recurrente exacto en ${yearData.year}-${monthData.month+1}`);
                        const expenseToRemove = monthData.expenses[originalExpenseIndex];
                        monthData.totalAmount -= (expenseToRemove.amount || 0);
                        monthData.expenses.splice(originalExpenseIndex, 1);
                        totalGastosEliminados++;
                    }
                    
                    // 2. Eliminar instancias recurrentes relacionadas (los generados para meses futuros)
                    // Solo procesar meses actuales o futuros respecto a la fecha original
                    if (yearData.year < originalYear || 
                        (yearData.year === originalYear && monthData.month < originalMonth)) {
                        continue;
                    }
                    
                    // Filtrar para encontrar gastos recurrentes con características similares
                    const gastosAntesDeEliminar = monthData.expenses.length;
                    const gastosRecurrentes = monthData.expenses.filter(e => 
                        e && e._id && e._id.toString() !== expenseId && // No es el gasto original
                        e.isRecurring === true && 
                        e.description === expenseDescription && 
                        e.amount === amountToSubtract &&
                        (e.paidBy ? e.paidBy.toString() : null) === expensePaidBy
                    );
                    
                    if (gastosRecurrentes.length > 0) {
                        console.log(`✅ Encontrados ${gastosRecurrentes.length} gastos recurrentes en ${yearData.year}-${monthData.month+1}`);
                        
                        // Reducir el monto total del mes
                        for (const gasto of gastosRecurrentes) {
                            monthData.totalAmount -= (gasto.amount || 0);
                        }
                        
                        // Filtrar para eliminar estos gastos recurrentes
                        monthData.expenses = monthData.expenses.filter(e => 
                            !(e && e.isRecurring === true && 
                              e.description === expenseDescription && 
                              e.amount === amountToSubtract &&
                              (e.paidBy ? e.paidBy.toString() : null) === expensePaidBy)
                        );
                        
                        const gastosEliminados = gastosAntesDeEliminar - monthData.expenses.length;
                        totalGastosEliminados += gastosEliminados;
                        console.log(`✅ Eliminados ${gastosEliminados} gastos recurrentes en ${yearData.year}-${monthData.month+1}`);
                    }
                }
            }
            
            console.log(`✅ Total de gastos recurrentes eliminados: ${totalGastosEliminados}`);
            
            // Actualizar la estructura yearlyExpenses en la base de datos
            await SharedSession.findByIdAndUpdate(
                sessionId,
                { 
                    $set: { 
                        yearlyExpenses: session.yearlyExpenses,
                        lastActivity: Date.now() 
                    }
                },
                { session: dbSession }
            );
            
            console.log(`✅ Estructura yearlyExpenses actualizada en la base de datos`);
        }
        
        console.log(`Gasto ${expenseId} eliminado con éxito de la sesión ${sessionId}`);

        // Obtener la sesión actualizada
        const updatedSession = await SharedSession.findById(sessionId)
            .populate('userId', 'nombre email')
            .populate('participants.userId', 'nombre email')
            .session(dbSession);

        // Recalcular el totalAmount para asegurar consistencia
        let calculatedTotal = 0;
        try {
            calculatedTotal = updatedSession.expenses.reduce((sum, exp) => 
                sum + (exp.amount || 0), 0
            );
            updatedSession.totalAmount = calculatedTotal;
            await updatedSession.save({ session: dbSession });
            console.log(`Total de gastos recalculado: ${calculatedTotal}`);
        } catch (err) {
            console.error(`Error al recalcular el total: ${err.message}`);
            // No interrumpir el proceso por este error
        }

        // Recalcular asignaciones y distribuciones
        try {
            // Eliminar las asignaciones y gastos personales previos
            const deleteAllocationsResult = await ParticipantAllocation.deleteMany({ 
                sessionId 
            }).session(dbSession);
            console.log(`Eliminadas ${deleteAllocationsResult.deletedCount} asignaciones previas`);

            // Eliminar los gastos personales vinculados a la sesión
            const deletePersonalExpensesResult = await PersonalExpense.deleteMany({ 
                'sessionReference.sessionId': sessionId 
            }).session(dbSession);
            console.log(`Eliminados ${deletePersonalExpensesResult.deletedCount} gastos personales previos`);

            // Regenerar asignaciones para el mes del gasto eliminado
            const originalMonth = expenseDate.getMonth();
            const originalYear = expenseDate.getFullYear();
            
            console.log(`Regenerando asignaciones para año=${originalYear}, mes=${originalMonth} después de eliminar gasto`);
            
            if (typeof allocationService.generateMonthlyAllocations === 'function') {
                try {
                    await allocationService.generateMonthlyAllocations(updatedSession, originalYear, originalMonth);
                    console.log(`✅ Asignaciones regeneradas correctamente para ${originalYear}-${originalMonth+1}`);
                } catch (allocError) {
                    console.error(`❌ Error al regenerar asignaciones: ${allocError.message}`);
                }
            } else {
                console.warn('Servicio de asignación no disponible, se omite la regeneración de asignaciones');
            }
        } catch (allocError) {
            console.error('Error al redistribuir montos:', allocError);
            // No interrumpir el proceso si falla la distribución
        }

        // Confirmar la transacción
        await dbSession.commitTransaction();
        console.log(`Transacción completada con éxito`);
        
        // Reorganizar los gastos por mes y año 
        try {
            if (typeof updatedSession.organizeExpenses === 'function') {
                await updatedSession.organizeExpenses();
                console.log('Reorganización de gastos completada con éxito');
            } else {
                console.warn('El método organizeExpenses no está disponible en la sesión');
            }
        } catch (err) {
            console.error('Error al organizar gastos después de la eliminación:', err);
        }
        
        res.json(updatedSession);
    } catch (error) {
        // Revertir transacción en caso de error
        try {
            await dbSession.abortTransaction();
            console.log('Transacción abortada por error');
        } catch (abortError) {
            console.error('Error al abortar la transacción:', abortError);
        }
        
        console.error('Error al eliminar el gasto:', error);
        res.status(500).json({ 
            msg: 'Error al eliminar el gasto',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        try {
            dbSession.endSession();
            console.log('Sesión de base de datos finalizada');
        } catch (endError) {
            console.error('Error al finalizar la sesión de DB:', endError);
        }
    }
};

// Eliminar una sesión compartida
exports.deleteSharedSession = async (req, res) => {
  // Esta función es redundante y está siendo reemplazada por exports.deleteSession
  // Redirigir a deleteSession para garantizar consistencia
  console.log(`Redirigiendo deleteSharedSession a deleteSession para ${req.params.id}`);
  return exports.deleteSession(req, res);
};

// Sincronizar gastos de sesión compartida a gastos personales
exports.syncToPersonal = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;

    console.log(`Solicitando sincronización de gastos para sesión ${sessionId} por usuario ${userId}`);
    
    // Buscar la sesión con todos los datos necesarios
    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId: userId },
        { 'participants.userId': userId }
      ]
    });
    
    if (!session) {
      console.log(`Sesión ${sessionId} no encontrada o no autorizada para usuario ${userId}`);
      return res.status(404).json({ 
        msg: 'Sesión no encontrada',
        details: 'La sesión especificada no existe o no tienes acceso a ella'
      });
    }

    // Iniciar una transacción para asegurar consistencia
    const mongoSession = await mongoose.startSession();
    mongoSession.startTransaction();

    try {
      // Obtener el modelo de gastos personales de manera segura
      let PersonalExpense;
      try {
        PersonalExpense = mongoose.model('PersonalExpense');
      } catch (modelError) {
        console.error('Error al cargar el modelo PersonalExpense:', modelError);
        await mongoSession.abortTransaction();
        return res.status(500).json({ 
          msg: 'Error al sincronizar gastos - modelo no disponible',
          details: 'El modelo de gastos personales no está disponible actualmente'
        });
      }

      console.log(`Iniciando sincronización para sesión ${session.name} (${session._id})`);
      
      // Calcular el monto total de todos los gastos en la sesión
      const totalAmount = session.expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      console.log(`Monto total de gastos en la sesión: ${totalAmount}`);

      // Estadísticas para el resultado
      const syncStats = {
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0
      };

      // Si no hay gastos, no hay nada que sincronizar
      if (totalAmount <= 0) {
        console.log('No hay gastos para sincronizar');
        syncStats.skipped = session.participants?.length || 0;
        
        await mongoSession.commitTransaction();
        return res.json({
          msg: 'Sincronización completada - No hay gastos para sincronizar',
          sync: syncStats
        });
      }

      // Obtener la fecha actual para los nuevos gastos
      const currentDate = new Date();
      
      // Verificar que la asignación (allocations) exista
      if (!session.allocations || session.allocations.length === 0) {
        console.log('No hay asignación de porcentajes, creando una distribución equitativa');
        
        // Crear una distribución equitativa entre todos los participantes
        const participantCount = session.participants?.length || 0;
        if (participantCount === 0) {
          console.log('No hay participantes para distribuir los gastos');
          await mongoSession.abortTransaction();
          return res.status(400).json({
            msg: 'No hay participantes para distribuir los gastos'
          });
        }
        
        const equalShare = 100 / participantCount;
        
        session.allocations = session.participants.map((participant, index) => {
          // Si es el último participante, asignar el resto para que sume exactamente 100%
          const isLast = index === participantCount - 1;
          const percentage = isLast 
            ? 100 - (equalShare * (participantCount - 1)) 
            : equalShare;
            
          return {
            userId: participant.userId,
            name: participant.name,
            percentage: parseFloat(percentage.toFixed(2))
          };
        });
        
        // Guardar la sesión con la nueva asignación
        await session.save({ session: mongoSession });
      }

      // Procesar cada asignación
      for (const allocation of session.allocations) {
        syncStats.processed++;
        
        if (!allocation.userId) {
          console.log(`Saltando asignación sin userId`);
          syncStats.skipped++;
          continue;
        }
        
        const participantId = allocation.userId.toString();
        const participantName = allocation.name || 'Participante';
        const percentage = allocation.percentage || 0;
        
        // Calcular el monto que corresponde a este participante
        const participantAmount = (totalAmount * percentage) / 100;
        console.log(`Participante ${participantName} (${participantId}): ${percentage}% = ${participantAmount}`);
        
        if (participantAmount <= 0) {
          console.log(`Saltando sincronización para ${participantName} - monto cero`);
          syncStats.skipped++;
          continue;
        }

        // Buscar si ya existe un gasto personal para este participante y esta sesión
        const existingExpense = await PersonalExpense.findOne({
          user: participantId,
          'sessionReference.sessionId': sessionId
        }).session(mongoSession);

        if (existingExpense) {
          // Actualizar el gasto existente
          console.log(`Actualizando gasto personal existente para ${participantName}`);
          
          existingExpense.amount = participantAmount;
          existingExpense.name = `Gastos compartidos: ${session.name}`;
          existingExpense.description = `Parte correspondiente (${percentage}%) de gastos compartidos en "${session.name}"`;
          existingExpense.date = currentDate;
          existingExpense.isRecurring = session.sessionType === 'permanent';
          existingExpense.sessionReference = {
            sessionId: session._id,
            sessionName: session.name,
            percentage: percentage,
            isRecurringShare: session.sessionType === 'permanent'
          };
          
          await existingExpense.save({ session: mongoSession });
          syncStats.updated++;
        } else {
          // Crear un nuevo gasto personal
          console.log(`Creando nuevo gasto personal para ${participantName}`);
          
          const newExpense = new PersonalExpense({
            user: participantId,
            name: `Gastos compartidos: ${session.name}`,
            description: `Parte correspondiente (${percentage}%) de gastos compartidos en "${session.name}"`,
            amount: participantAmount,
            category: 'Gastos Compartidos',
            date: currentDate,
            type: 'expense',
            isRecurring: session.sessionType === 'permanent',
            sessionReference: {
              sessionId: session._id,
              sessionName: session.name,
              percentage: percentage,
              isRecurringShare: session.sessionType === 'permanent'
            }
          });
          
          await newExpense.save({ session: mongoSession });
          syncStats.created++;
        }
      }

      await mongoSession.commitTransaction();
      console.log(`Sincronización completada exitosamente: creados=${syncStats.created}, actualizados=${syncStats.updated}`);
      
      res.json({
        msg: 'Sincronización completada con éxito',
        sync: syncStats
      });
    } catch (error) {
      // Revertir transacción en caso de error
      await mongoSession.abortTransaction();
      console.error('Error en la sincronización:', error);
      throw error;
    } finally {
      mongoSession.endSession();
    }
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
    
    // Obtener los nombres reales de los usuarios para cada elemento de la distribución
    const updatedDistribution = [];
    
    for (const item of distribution) {
      try {
        // Buscar el usuario para obtener su nombre real
        const user = await User.findById(item.userId);
        
        // Usar el nombre real si está disponible, de lo contrario usar el nombre proporcionado o "Usuario"
        const realName = user ? 
                         (user.nombre || user.name || user.username || user.email || "Usuario") : 
                         (item.name || "Usuario");
        
        updatedDistribution.push({
          userId: item.userId,
          name: realName,
          percentage: item.percentage
        });
        
        console.log(`Usuario ${item.userId}: nombre actualizado a "${realName}"`);
      } catch (userError) {
        console.warn(`Error al obtener información del usuario ${item.userId}:`, userError.message);
        // Si hay error, usar el nombre proporcionado o "Usuario" como respaldo
        updatedDistribution.push({
          userId: item.userId,
          name: item.name || "Usuario",
          percentage: item.percentage
        });
      }
    }
    
    // Actualizar la distribución con los nombres reales
    session.allocations = updatedDistribution;
    
    await session.save();
    
    // Calcular y distribuir montos entre participantes
    try {
      // Usar el servicio de asignación para distribuir montos
      const allocations = await allocationService.distributeAmount(session);
      console.log(`Distribución de montos actualizada para sesión ${sessionId}`);
      
      // Eliminar duplicados después de actualizar la distribución
      await syncService.fixDuplicateAllocations(sessionId);
      
      // Actualizar los nombres de usuario en las asignaciones
      await syncService.updateUserNamesInAllocations(sessionId);
      
      res.json({
        msg: 'Distribución actualizada correctamente',
        allocations: session.allocations
      });
    } catch (allocError) {
      console.error('Error al distribuir montos:', allocError);
      res.status(500).json({ 
        msg: 'Error al distribuir montos entre participantes',
        details: allocError.message
      });
    }
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

// Actualizar un gasto en una sesión
exports.updateExpense = async (req, res) => {
    // Iniciar una sesión de transacción
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    
    try {
        const sessionId = req.params.id;
        const expenseId = req.params.expenseId;
        const { name, description, amount, date, category, paidBy } = req.body;
        const userId = req.user.id;
        
        console.log(`Intentando actualizar gasto ${expenseId} en sesión ${sessionId}`);
        console.log(`Datos recibidos:`, { name, description, amount, date, category, paidBy });

        // Buscar la sesión
        const session = await SharedSession.findOne({
            _id: sessionId,
            $or: [
                { userId: userId },
                { 'participants.userId': userId }
            ]
        }).session(dbSession);

        if (!session) {
            console.log(`Sesión ${sessionId} no encontrada o usuario ${userId} no autorizado`);
            return res.status(404).json({ msg: 'Sesión no encontrada o no autorizada' });
        }

        // Buscar el gasto específico
        const expense = session.expenses.id(expenseId);
        if (!expense) {
            console.log(`Gasto ${expenseId} no encontrado en la sesión ${sessionId}`);
            return res.status(404).json({ msg: 'Gasto no encontrado' });
        }

        // Verificar que el usuario sea participante (ya verificado en la consulta inicial)
        
        // Guardar el monto anterior para ajustar el total
        const oldAmount = expense.amount;
        const oldDate = expense.date ? new Date(expense.date) : new Date();
        const oldYear = oldDate.getFullYear();
        const oldMonth = oldDate.getMonth();
        
        // Actualizar campos del gasto
        if (name) expense.name = name;
        if (description !== undefined) expense.description = description;
        if (amount) expense.amount = parseFloat(amount);
        if (date) expense.date = new Date(date);
        if (category) expense.category = category;
        if (paidBy) expense.paidBy = paidBy;
        
        // Obtener la nueva fecha para determinar si cambió el mes/año
        const newDate = expense.date ? new Date(expense.date) : new Date();
        const newYear = newDate.getFullYear();
        const newMonth = newDate.getMonth();
        
        // Ajustar el monto total de la sesión
        if (amount && parseFloat(amount) !== oldAmount) {
            const difference = parseFloat(amount) - oldAmount;
            session.totalAmount = (session.totalAmount || 0) + difference;
        }
        
        // Actualizar fecha de última actividad
        session.lastActivity = Date.now();
        
        // Guardar la sesión
        await session.save({ session: dbSession });
        
        console.log(`Gasto ${expenseId} actualizado. Monto anterior: ${oldAmount}, nuevo: ${expense.amount}`);
        
        // Buscar asignaciones relacionadas con este gasto para actualizarlas
        const allocationsToUpdate = await ParticipantAllocation.find({ 
            sessionId,
            expenseId
        }).session(dbSession);
        
        console.log(`Encontradas ${allocationsToUpdate.length} asignaciones relacionadas con el gasto ${expenseId}`);
        
        // Obtener la sesión con datos actualizados para recalcular asignaciones
        const updatedSession = await SharedSession.findById(sessionId)
            .populate('userId', 'nombre email')
            .populate('participants.userId', 'nombre email')
            .session(dbSession);

        // Recalcular y aplicar nuevas asignaciones basadas en los cambios
        try {
            // Si cambió el mes o el año, necesitamos regenerar asignaciones para ambos meses
            const monthChanged = (oldYear !== newYear || oldMonth !== newMonth);
            
            if (monthChanged) {
                console.log(`La fecha del gasto cambió de ${oldYear}-${oldMonth+1} a ${newYear}-${newMonth+1}, regenerando asignaciones para ambos meses`);
                
                // Regenerar asignaciones para el mes anterior
                await allocationService.generateMonthlyAllocations(updatedSession, oldYear, oldMonth);
                console.log(`Regeneradas asignaciones para el mes anterior ${oldYear}-${oldMonth+1}`);
                
                // Regenerar asignaciones para el nuevo mes
                await allocationService.generateMonthlyAllocations(updatedSession, newYear, newMonth);
                console.log(`Regeneradas asignaciones para el nuevo mes ${newYear}-${newMonth+1}`);
            } else {
                // Si no cambió el mes, solo regeneramos las asignaciones del mes actual
                console.log(`Regenerando asignaciones para ${newYear}-${newMonth+1}`);
                await allocationService.generateMonthlyAllocations(updatedSession, newYear, newMonth);
            }
        } catch (allocError) {
            console.error('Error al redistribuir montos:', allocError.message);
            // No interrumpimos el flujo principal si falla la distribución
        }
        
        // Ejecutar limpieza y actualización de datos
        try {
            // Eliminar asignaciones duplicadas
            await syncService.fixDuplicateAllocations(sessionId);
            console.log('Limpiadas asignaciones duplicadas');
            
            // Actualizar nombres de usuario en las asignaciones
            await syncService.updateUserNamesInAllocations(sessionId);
            console.log('Actualizados nombres de usuario en asignaciones');
            
            // Sincronizar las asignaciones con los gastos personales
            const allocations = await ParticipantAllocation.find({ 
                sessionId,
                year: newYear,
                month: newMonth
            }).session(dbSession);
            
            console.log(`Sincronizando ${allocations.length} asignaciones con gastos personales`);
            
            // Sincronizar cada asignación
            for (const allocation of allocations) {
                try {
                    await syncService.syncAllocationToPersonalExpense(allocation);
                } catch (syncError) {
                    console.warn(`Error al sincronizar asignación ${allocation._id}:`, syncError.message);
                    // Continuar con las siguientes asignaciones
                }
            }
        } catch (cleanupError) {
            console.error('Error en la limpieza de datos:', cleanupError.message);
            // No interrumpimos el flujo principal por errores en la limpieza
        }
        
        // Confirmar transacción
        await dbSession.commitTransaction();
        
        res.json(updatedSession);
    } catch (error) {
        // Revertir transacción en caso de error
        await dbSession.abortTransaction();
        
        console.error('Error al actualizar gasto:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                msg: 'Error de validación', 
                details: Object.values(error.errors).map(err => err.message).join(', ') 
            });
        }
        res.status(500).json({ 
            msg: 'Error al actualizar el gasto',
            error: error.message
        });
    } finally {
        dbSession.endSession();
    }
};

// Obtener asignaciones de montos por participante
exports.getSessionAllocations = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    
    console.log(`Obteniendo asignaciones para la sesión ${sessionId}`);
    
    // Verificar que el usuario tenga acceso a la sesión
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
    
    // Obtener asignaciones de la sesión
    const allocations = await allocationService.getSessionAllocations(sessionId);
    
    res.json({
      sessionName: session.name,
      totalAmount: session.totalAmount,
      currency: session.currency || 'EUR',
      allocations
    });
    
  } catch (error) {
    console.error('Error al obtener asignaciones:', error);
    res.status(500).json({ 
      msg: 'Error del servidor al obtener asignaciones',
      details: error.message
    });
  }
};

// Obtener asignaciones de un usuario
exports.getUserAllocations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    
    console.log(`Obteniendo asignaciones para el usuario ${userId}`);
    
    // Obtener asignaciones del usuario
    const allocations = await allocationService.getUserAllocations(userId, status);
    
    res.json({
      allocations
    });
    
  } catch (error) {
    console.error('Error al obtener asignaciones de usuario:', error);
    res.status(500).json({ 
      msg: 'Error del servidor al obtener asignaciones',
      details: error.message
    });
  }
};

// Actualizar estado de una asignación
exports.updateAllocationStatus = async (req, res) => {
  try {
    const { allocationId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    
    if (!status || !['pending', 'accepted', 'paid'].includes(status)) {
      return res.status(400).json({ 
        msg: 'Estado no válido',
        details: 'El estado debe ser uno de: pending, accepted, paid'
      });
    }
    
    // Verificar que la asignación pertenezca al usuario
    const allocation = await allocationService.updateAllocationStatus(allocationId, status);
    
    if (!allocation) {
      return res.status(404).json({ 
        msg: 'Asignación no encontrada'
      });
    }
    
    res.json({
      msg: 'Estado de asignación actualizado correctamente',
      allocation
    });
    
  } catch (error) {
    console.error('Error al actualizar estado de asignación:', error);
    res.status(500).json({ 
      msg: 'Error del servidor al actualizar estado',
      details: error.message
    });
  }
};

// Obtener los gastos de un mes y año específico
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
    
    if (year === undefined || month === undefined) {
      console.warn('Petición sin año o mes especificados');
      return res.status(400).json({ msg: 'Año y mes son requeridos' });
    }
    
    // Convertir a números
    const yearNum = parseInt(year);
    let monthNum = parseInt(month);
    
    // Validar que son números válidos (usando mes en formato 0-11 donde 0 es enero y 11 es diciembre)
    if (isNaN(yearNum) || isNaN(monthNum)) {
      console.warn(`Año o mes inválidos: año=${year}, mes=${month}`);
      return res.status(400).json({ msg: 'Año y mes deben ser números válidos' });
    }
    
    // Ajustar el mes al rango válido 0-11
    if (monthNum < 0 || monthNum > 11) {
      console.warn(`Mes fuera de rango (${monthNum}), ajustando al rango válido 0-11`);
      monthNum = Math.max(0, Math.min(11, monthNum));
    }
    
    const monthName = getMonthName(monthNum);
    console.log(`Buscando sesión ${sessionId} para obtener gastos de ${monthName} (${monthNum}) de ${yearNum}`);
    
    // Verificar que el usuario tenga acceso a la sesión
    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId: userId },
        { 'participants.userId': userId }
      ]
    });
    
    if (!session) {
      console.warn(`Sesión ${sessionId} no encontrada o usuario ${userId} sin acceso`);
      return res.status(404).json({ msg: 'Sesión no encontrada o acceso denegado' });
    }
    
    // Verificar si el método existe
    if (typeof session.getExpensesByMonth !== 'function') {
      console.error('El método getExpensesByMonth no está disponible en la sesión');
      // Enviar una respuesta vacía en lugar de fallar
      return res.json([]);
    }
    
    // Asegurarse de que la estructura de yearlyExpenses existe para el año solicitado
    if (!session.yearlyExpenses || !Array.isArray(session.yearlyExpenses)) {
      console.log(`La sesión no tiene una estructura yearlyExpenses válida`);
      session.yearlyExpenses = [];
      await session.save();
      return res.json([]);
    }
    
    // Verificar si el año existe, y si no, crearlo con una estructura de meses vacía
    let yearData = session.yearlyExpenses.find(y => y.year === yearNum);
    if (!yearData) {
      console.log(`Creando nueva estructura para el año ${yearNum}`);
      yearData = {
        year: yearNum,
        months: Array.from({ length: 12 }, (_, i) => ({
          month: i, // 0-indexed (0-11)
          expenses: [],
          totalAmount: 0
        }))
      };
      session.yearlyExpenses.push(yearData);
      await session.save();
    }
    
    // Obtener gastos utilizando el método del modelo
    // El método getExpensesByMonth ahora recibe el mes directamente en formato 0-11
    try {
      const gastos = session.getExpensesByMonth(yearNum, monthNum);
      console.log(`Devolviendo ${gastos.length} gastos para ${monthName} (mes ${monthNum}) de ${yearNum}`);
      res.json(gastos);
    } catch (methodError) {
      console.error('Error al llamar a getExpensesByMonth:', methodError);
      // Si hay un error al obtener los gastos, devolver un array vacío
      res.json([]);
    }
  } catch (error) {
    console.error('Error al obtener gastos por mes:', error);
    res.status(500).json({ 
      msg: 'Error al obtener gastos por mes', 
      error: error.message 
    });
  }
};

// Función auxiliar para obtener el nombre del mes
function getMonthName(monthIndex) {
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return monthNames[monthIndex] || `Mes ${monthIndex + 1}`;
}

// Reparar fechas de gastos en una sesión
exports.repairExpenseDates = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    
    console.log(`Usuario ${userId} solicitando reparación de fechas para sesión ${sessionId}`);
    
    // Verificar acceso a la sesión
    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId: userId },
        { 'participants.userId': userId, 'participants.status': 'accepted' }
      ]
    });
    
    if (!session) {
      return res.status(404).json({ msg: 'Sesión no encontrada o acceso denegado' });
    }
    
    // Ejecutar reparación de fechas
    const result = await session.fixExpenseDates();
    
    res.json({
      msg: `Reparación completada. Se corrigieron ${result.fixed} gastos.`,
      fixed: result.fixed
    });
  } catch (error) {
    console.error('Error al reparar fechas de gastos:', error);
    res.status(500).json({
      msg: 'Error al reparar fechas de gastos',
      error: error.message
    });
  }
};

// Reparar estructura de meses en todas las sesiones (cambiar de 1-indexed a 0-indexed)
exports.repairAllSessionsMonthStructure = async (req, res) => {
  try {
    // Esta operación debe ser realizada por un administrador
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        msg: 'Operación no autorizada', 
        details: 'Solo administradores pueden ejecutar esta operación' 
      });
    }
    
    console.log('Iniciando reparación de estructura de meses en todas las sesiones...');
    
    // Buscar todas las sesiones
    const sessions = await SharedSession.find({});
    console.log(`Encontradas ${sessions.length} sesiones para procesar`);
    
    let procesadas = 0;
    let actualizadas = 0;
    
    // Procesar cada sesión
    for (const session of sessions) {
      procesadas++;
      let sessionModified = false;
      
      // Verificar si la sesión tiene gastos anuales
      if (session.yearlyExpenses && session.yearlyExpenses.length > 0) {
        // Para cada año de gastos
        for (const yearData of session.yearlyExpenses) {
          if (yearData.months && yearData.months.length > 0) {
            let gastosTotales = 0;
            const mesesIndexados = new Set();
            
            // Verificar si los meses están indexados desde 1 (antiguo) o desde 0 (nuevo)
            for (const monthData of yearData.months) {
              if (monthData.month >= 0 && monthData.month <= 11) {
                mesesIndexados.add('zero-indexed');
              } else if (monthData.month >= 1 && monthData.month <= 12) {
                mesesIndexados.add('one-indexed');
              }
              
              if (monthData.expenses && monthData.expenses.length > 0) {
                gastosTotales += monthData.expenses.length;
              }
            }
            
            // Si hay mezcla de indexaciones o solo 1-indexed, necesita reparación
            if (mesesIndexados.has('one-indexed')) {
              console.log(`Sesión ${session._id}: Reparando estructura de meses (${gastosTotales} gastos totales)`);
              
              // Crear una nueva estructura de meses con 0-indexed
              const newMonths = Array.from({ length: 12 }, (_, i) => ({
                month: i, // 0-indexed (0-11)
                expenses: [],
                totalAmount: 0
              }));
              
              // Mover los gastos de la estructura antigua a la nueva
              for (const oldMonthData of yearData.months) {
                // Convertir índice 1-indexed a 0-indexed
                const newMonthIndex = oldMonthData.month >= 1 && oldMonthData.month <= 12 
                  ? oldMonthData.month - 1  // Convertir de 1-indexed a 0-indexed
                  : oldMonthData.month;     // Mantener si ya es 0-indexed o inválido
                
                // Validar que el índice sea válido (0-11)
                if (newMonthIndex >= 0 && newMonthIndex <= 11) {
                  // Obtener el mes correspondiente en la nueva estructura
                  const newMonthData = newMonths[newMonthIndex];
                  
                  // Añadir los gastos al nuevo mes
                  if (oldMonthData.expenses && oldMonthData.expenses.length > 0) {
                    newMonthData.expenses.push(...oldMonthData.expenses);
                    newMonthData.totalAmount += oldMonthData.totalAmount;
                    console.log(`  Movidos ${oldMonthData.expenses.length} gastos del mes ${oldMonthData.month} al mes ${newMonthIndex}`);
                  }
                } else {
                  console.warn(`  Mes inválido encontrado: ${oldMonthData.month} -> ${newMonthIndex}`);
                }
              }
              
              // Reemplazar la estructura de meses antigua con la nueva
              yearData.months = newMonths;
              sessionModified = true;
            } else {
              console.log(`Sesión ${session._id}: Estructura de meses ya correcta (${gastosTotales} gastos totales)`);
            }
          }
        }
      }
      
      // Guardar la sesión si fue modificada
      if (sessionModified) {
        await session.save();
        actualizadas++;
      }
    }
    
    console.log(`Reparación completada: ${procesadas} sesiones procesadas, ${actualizadas} actualizadas`);
    
    res.json({
      msg: 'Reparación de estructura de meses completada',
      stats: {
        total: procesadas,
        updated: actualizadas
      }
    });
  } catch (error) {
    console.error('Error al reparar estructura de meses:', error);
    res.status(500).json({
      msg: 'Error al reparar estructura de meses',
      error: error.message
    });
  }
};

// Reparar la estructura de datos de una sesión compartida
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
        { 'participants.userId': userId, 'participants.status': 'accepted' }
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
        console.log(`Creando estructura para el año ${year}`);
        yearData = {
          year: year,
          months: []
        };
        session.yearlyExpenses.push(yearData);
      }
      
      // Asegurar que months es un array
      if (!yearData.months || !Array.isArray(yearData.months)) {
        yearData.months = [];
      }
      
      // Crear estructura para cada mes (0-11)
      for (let m = 0; m < 12; m++) {
        if (!yearData.months.some(month => month.month === m)) {
          console.log(`Creando estructura para el mes ${m} (${getMonthName(m)}) del año ${year}`);
          yearData.months.push({
            month: m,
            expenses: [],
            totalAmount: 0
          });
        }
      }
      
      // Ordenar meses
      yearData.months.sort((a, b) => a.month - b.month);
    }
    
    // Asegurarse de que cada gasto está en el mes y año correcto
    let gastosProcesados = 0;
    let gastosMalColocados = 0;
    
    if (session.expenses && session.expenses.length > 0) {
      for (const expense of session.expenses) {
        if (!expense.date) continue;
        
        const expenseDate = new Date(expense.date);
        if (isNaN(expenseDate.getTime())) continue;
        
        const year = expenseDate.getFullYear();
        const month = expenseDate.getMonth(); // 0-indexed
        
        gastosProcesados++;
        
        // Buscar el año en yearlyExpenses
        const yearData = session.yearlyExpenses.find(y => y.year === year);
        if (!yearData) continue;
        
        // Buscar el mes en ese año
        const monthData = yearData.months.find(m => m.month === month);
        if (!monthData) continue;
        
        // Verificar si el gasto ya existe en ese mes
        const existInMonth = monthData.expenses.some(e => e._id.toString() === expense._id.toString());
        
        if (!existInMonth) {
          console.log(`Añadiendo gasto ${expense._id} al mes ${month} (${getMonthName(month)}) del año ${year}`);
          monthData.expenses.push(expense);
          monthData.totalAmount += expense.amount;
          gastosMalColocados++;
        }
      }
    }
    
    // Guardar los cambios
    await session.save();
    
    res.json({
      msg: 'Reparación completada con éxito',
      yearlyExpenses: session.yearlyExpenses.length,
      gastosProcesados,
      gastosMalColocados
    });
  } catch (error) {
    console.error('Error al reparar estructura de sesión:', error);
    res.status(500).json({
      msg: 'Error al reparar estructura de sesión',
      error: error.message
    });
  }
};

// Actualizar nombres de usuarios en asignaciones
exports.updateAllocationUsernames = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Solo permitir a administradores
    if (!req.user.isAdmin) {
      return res.status(403).json({ msg: 'No tiene permiso para realizar esta operación' });
    }
    
    console.log('Iniciando actualización de nombres de usuario en asignaciones...');
    
    // Buscar todas las sesiones
    const sessions = await SharedSession.find({});
    let updatedCount = 0;
    
    // Para cada sesión, actualizar los nombres de usuario en las asignaciones
    for (const session of sessions) {
      let sessionUpdated = false;
      
      // Revisar cada asignación
      if (session.allocations && Array.isArray(session.allocations)) {
        for (const allocation of session.allocations) {
          if (allocation.name === 'Usuario' && allocation.userId) {
            try {
              // Buscar el nombre real del usuario
              const user = await User.findById(allocation.userId);
              if (user) {
                allocation.name = user.nombre || user.email;
                sessionUpdated = true;
                console.log(`Actualizado nombre de usuario ${allocation.userId} a "${allocation.name}" en sesión ${session._id}`);
              }
            } catch (userError) {
              console.error(`Error al buscar usuario ${allocation.userId}:`, userError);
            }
          }
        }
      }
      
      // Si se actualizó alguna asignación, guardar la sesión
      if (sessionUpdated) {
        await session.save();
        updatedCount++;
      }
    }
    
    res.json({ 
      success: true,
      message: `Se actualizaron nombres en ${updatedCount} sesiones`
    });
  } catch (error) {
    console.error('Error al actualizar nombres de usuario:', error);
    res.status(500).json({ msg: 'Error del servidor al actualizar nombres' });
  }
};

// Generar asignaciones mensuales para una sesión
exports.generateMonthlyAllocations = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { year, month } = req.body;
    const userId = req.user.id;
    
    // Validar parámetros
    if (!year || !month && month !== 0) {
      return res.status(400).json({ msg: 'Año y mes son obligatorios' });
    }
    
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
      return res.status(400).json({ msg: 'Año o mes no válido' });
    }
    
    // Verificar que la sesión existe y que el usuario tiene acceso
    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId }, // Es el creador
        { 'participants.userId': userId, 'participants.status': 'accepted', 'participants.canEdit': true } // Es participante con permisos
      ]
    });
    
    if (!session) {
      return res.status(403).json({ msg: 'No tiene permiso para modificar esta sesión' });
    }
    
    // Generar asignaciones mensuales
    const allocations = await allocationService.generateMonthlyAllocations(session, yearNum, monthNum);
    
    res.json({
      success: true,
      message: `Se generaron ${allocations.length} asignaciones para ${yearNum}-${monthNum+1}`,
      allocations
    });
  } catch (error) {
    console.error('Error al generar asignaciones mensuales:', error);
    res.status(500).json({ msg: 'Error del servidor: ' + error.message });
  }
};

// Generar asignaciones mensuales para todas las sesiones
exports.generateAllMonthlyAllocations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Solo permitir a administradores
    if (!req.user.isAdmin) {
      return res.status(403).json({ msg: 'No tiene permiso para realizar esta operación' });
    }
    
    console.log('Iniciando generación de asignaciones mensuales para todas las sesiones...');
    
    // Buscar todas las sesiones
    const sessions = await SharedSession.find({});
    let totalAllocationsCreated = 0;
    let sessionsProcessed = 0;
    
    // Para cada sesión, generar asignaciones para cada año/mes
    for (const session of sessions) {
      console.log(`Procesando sesión: ${session.name} (${session._id})`);
      let allocationsForSession = 0;
      
      // Verificar si la sesión tiene gastos por año/mes
      if (!session.yearlyExpenses || !Array.isArray(session.yearlyExpenses) || session.yearlyExpenses.length === 0) {
        console.log(`  La sesión no tiene gastos registrados, saltando...`);
        continue;
      }
      
      // Verificar si la sesión tiene asignaciones
      if (!session.allocations || !Array.isArray(session.allocations) || session.allocations.length === 0) {
        console.log(`  La sesión no tiene asignaciones de porcentajes, saltando...`);
        continue;
      }
      
      // Procesar cada año y mes en la sesión
      for (const yearData of session.yearlyExpenses) {
        const year = yearData.year;
        
        for (const monthData of yearData.months) {
          const month = monthData.month;
          
          try {
            // Verificar si ya existen asignaciones para esta combinación
            const existingAllocations = await ParticipantAllocation.find({
              sessionId: session._id,
              year,
              month
            });
            
            if (existingAllocations.length > 0) {
              console.log(`  Ya existen ${existingAllocations.length} asignaciones para ${year}-${month+1}, saltando...`);
              continue;
            }
            
            // Generar asignaciones para este mes
            const allocations = await allocationService.generateMonthlyAllocations(session, year, month);
            allocationsForSession += allocations.length;
            totalAllocationsCreated += allocations.length;
            console.log(`  Generadas ${allocations.length} asignaciones para ${year}-${month+1}`);
          } catch (monthError) {
            console.error(`  Error al procesar ${year}-${month+1}:`, monthError.message);
          }
        }
      }
      
      console.log(`  Total para sesión ${session.name}: ${allocationsForSession} asignaciones`);
      if (allocationsForSession > 0) {
        sessionsProcessed++;
      }
    }
    
    res.json({ 
      success: true,
      message: `Se generaron ${totalAllocationsCreated} asignaciones en ${sessionsProcessed} sesiones`
    });
  } catch (error) {
    console.error('Error al generar asignaciones mensuales:', error);
    res.status(500).json({ msg: 'Error del servidor: ' + error.message });
  }
};