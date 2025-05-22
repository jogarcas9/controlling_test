const mongoose = require('mongoose');
const { SharedSession, PersonalExpense, ParticipantAllocation, User } = require('../models');
const allocationService = require('../services/allocationService');
const syncService = require('../services/syncService');
const allocationSyncService = require('../services/allocationSyncService');
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
    const validParticipants = [];
    const invalidParticipants = [];

    for (const participant of participants) {
      if (!participant.email || typeof participant.email !== 'string') {
        continue;
      }
      const email = participant.email.toLowerCase().trim();
      
      // No incluir al creador como participante adicional
      if (email === creatorEmail) {
        console.log(`Excluyendo al creador ${creatorEmail} de la lista de participantes invitados`);
        continue;
      }
      
      // No duplicar emails
      if (emailsSet.has(email)) {
        continue;
      }
      
      // Buscar si el usuario existe
      const existingUser = await User.findOne({ 
        $or: [
          { email: email },
          { email: email.replace(/([^@]+)@/, '$1e@') }, // Intentar con una 'e' adicional
          { email: email.replace(/([^@]+)e@/, '$1@') }  // Intentar sin la 'e'
        ]
      }).session(dbSession);

      if (!existingUser) {
        console.log(`Usuario no encontrado para el email: ${email}`);
        invalidParticipants.push({
          email: email,
          reason: 'Usuario no registrado en el sistema'
        });
        continue;
      }
      
      emailsSet.add(email);
      validParticipants.push({
        ...participant,
        email: email,
        userId: existingUser._id,
        name: existingUser.name || existingUser.nombre || email
      });
    }

    if (invalidParticipants.length > 0) {
      console.log('Participantes inválidos encontrados:', invalidParticipants);
    }

    console.log(`Procesados ${validParticipants.length} participantes válidos`);

    // Crear la sesión compartida
    const newSession = new SharedSession({
      userId: req.user.id,
      name: name.trim(),
      description: description ? description.trim() : '',
      sessionType,
      status: 'active',
      // Bloquear solo si hay otros participantes
      isLocked: validParticipants.length > 0,
      participants: [],
      // Establecer fechas a null o a valores constantes
      date: null,
      startDate: null,
      endDate: null,
      yearlyExpenses: [] // Inicializar array de gastos anuales
    });

    // Añadir al creador como primer participante con estado aceptado
    newSession.participants.push({
      userId: req.user.id,
      name: creator.nombre || creator.name || creator.email,
      email: creatorEmail,
      status: 'accepted',
      role: 'admin',
      canEdit: true,
      canDelete: true,
      responseDate: new Date()
    });

    // Procesar y añadir participantes válidos
    for (const participant of validParticipants) {
      newSession.participants.push({
        userId: participant.userId,
        name: participant.name,
        email: participant.email,
        status: 'pending',
        role: 'member',
        canEdit: participant.canEdit || false,
        canDelete: participant.canDelete || false,
        invitationDate: new Date()
      });
    }

    // Si no hay otros participantes además del creador, desbloquear la sesión
    if (newSession.participants.length === 1) {
      console.log(`Solo hay un participante (el creador). Desbloqueando sesión.`);
      newSession.isLocked = false;
    }

    // Guardar la sesión
    await newSession.save({ session: dbSession });

    // Inicializar la asignación de porcentajes equitativamente
    const participantCount = newSession.participants.length;
    const equalPercentage = Math.floor(100 / participantCount);
    let remainingPercentage = 100 - (equalPercentage * participantCount);
    
    newSession.allocations = newSession.participants.map((participant, index) => {
      return {
        userId: participant.userId,
        name: participant.name,
        percentage: index === 0 ? equalPercentage + remainingPercentage : equalPercentage
      };
    });

    await newSession.save({ session: dbSession });

    const populatedSession = await SharedSession.findById(newSession._id)
      .session(dbSession)
      .populate('userId', 'nombre email')
      .populate('participants.userId', 'nombre email');

    await dbSession.commitTransaction();

    // Devolver la sesión con información sobre participantes inválidos
    res.status(201).json({
      session: populatedSession,
      warnings: invalidParticipants.length > 0 ? {
        invalidParticipants,
        message: 'Algunos participantes no pudieron ser agregados porque no están registrados en el sistema'
      } : null
    });
  } catch (error) {
    await dbSession.abortTransaction();
    console.error('Error al crear sesión:', error);
    res.status(500).json({ 
      msg: 'Error al crear la sesión compartida',
      error: error.message 
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
    console.log(`Iniciando proceso de eliminación para la sesión: ${sessionId} por usuario: ${req.user.id}`);
    
    // Verificar si la sesión existe y pertenece al usuario
    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId: req.user.id },
        { 'participants.userId': req.user.id, 'participants.role': 'admin' }
      ]
    }).session(dbSession);

    if (!session) {
      console.log(`Sesión ${sessionId} no encontrada o no autorizada para usuario ${req.user.id}`);
      return res.status(404).json({ msg: 'Sesión no encontrada o no tienes permisos para eliminarla' });
    }

    // 1. Buscar todas las asignaciones vinculadas a esta sesión
    const allocations = await ParticipantAllocation.find({ 
      sessionId 
    }).session(dbSession);
    
    const allocationIds = allocations.map(allocation => allocation._id);
    console.log(`Encontradas ${allocations.length} asignaciones relacionadas con la sesión ${sessionId}`);

    // 2. Eliminar todos los gastos personales vinculados a la sesión
    const deletePersonalExpensesBySession = await PersonalExpense.deleteMany({ 
      $or: [
        { allocationId: { $in: allocationIds } },
        { 'sessionReference.sessionId': sessionId }
      ]
    }, { session: dbSession });
    
    console.log(`Eliminados ${deletePersonalExpensesBySession.deletedCount} gastos personales relacionados con la sesión`);

    // 3. Eliminar todas las asignaciones vinculadas a esta sesión
    const deleteAllocationResult = await ParticipantAllocation.deleteMany({ 
      sessionId 
    }, { session: dbSession });
    
    console.log(`Eliminadas ${deleteAllocationResult.deletedCount} asignaciones relacionadas con la sesión ${sessionId}`);

    // 4. Eliminar la sesión compartida
    const deleteResult = await SharedSession.findByIdAndDelete(sessionId, { session: dbSession });
    
    if (!deleteResult) {
      throw new Error('Error al eliminar la sesión compartida');
    }
    
    console.log(`Sesión ${sessionId} eliminada con éxito`);
    
    // Confirmar la transacción
    await dbSession.commitTransaction();
    
    res.json({ 
      msg: 'Sesión y todos sus datos relacionados eliminados exitosamente',
      success: true,
      details: {
        sessionId: sessionId,
        deletedAllocations: deleteAllocationResult.deletedCount,
        deletedPersonalExpenses: deletePersonalExpensesBySession.deletedCount
      }
    });
  } catch (err) {
    // Revertir la transacción en caso de error
    await dbSession.abortTransaction();
    
    console.error(`Error al eliminar sesión ${req.params.id}:`, err);
    
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
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try {
        const { description, amount, date, paidBy, name = 'Gasto', category = 'Otros', isRecurring = false } = req.body;
        
        // Buscar la sesión con los campos necesarios
        const session = await SharedSession.findOne({
            _id: req.params.id,
            $or: [
                { userId: req.user.id },
                { 'participants.userId': req.user.id }
            ]
        })
        .select('_id participants yearlyExpenses userId currency name allocations')
        .session(dbSession);

        if (!session) {
            await dbSession.abortTransaction();
            return res.status(404).json({ msg: 'Sesión no encontrada o no autorizada' });
        }

        // Verificar que el usuario que pagó sea parte de la sesión
        const isParticipant = session.participants.some(p =>
            p.userId && p.userId.toString() === paidBy
        );

        if (!isParticipant) {
            await dbSession.abortTransaction();
            return res.status(400).json({ msg: 'Usuario no válido para el pago' });
        }

        // Crear el objeto de gasto base
        const baseExpense = {
            name,
            description,
            amount: Number(amount) || 0,
            category,
            paidBy,
            isRecurring
        };

        // Obtener la fecha inicial del gasto
        const expenseDate = date ? new Date(date) : new Date();
        const currentYear = expenseDate.getFullYear();
        const currentMonth = expenseDate.getMonth();

        // Si es recurrente, obtener la fecha final de la sesión o usar 3 años por defecto
        let endDate;
        if (isRecurring) {
            // Buscar la fecha más lejana en yearlyExpenses
            const maxYear = Math.max(...session.yearlyExpenses.map(y => y.year));
            endDate = new Date(maxYear, 11, 31); // Último día del año más lejano
            
            // Si no hay yearlyExpenses o la fecha es menor que 3 años, usar 3 años
            const threeYearsFromNow = new Date();
            threeYearsFromNow.setFullYear(threeYearsFromNow.getFullYear() + 3);
            
            if (!maxYear || endDate < threeYearsFromNow) {
                endDate = threeYearsFromNow;
            }
        }

        // Agregar el gasto al mes actual
        await session.addExpense(baseExpense, expenseDate, endDate);

        // Actualizar las asignaciones para reflejar el nuevo gasto
        await allocationService.distributeAmount(session);

        await dbSession.commitTransaction();

        // Sincronizar con gastos personales en segundo plano
        process.nextTick(async () => {
            try {
                await syncService.syncSessionToPersonal(session._id);
            } catch (syncError) {
                console.error('Error en sincronización:', syncError);
            }
        });

        res.json({ msg: 'Gasto agregado correctamente' });
    } catch (error) {
        await dbSession.abortTransaction();
        console.error('Error al agregar gasto:', error);
        res.status(500).json({ msg: 'Error al agregar el gasto', error: error.message });
    } finally {
        dbSession.endSession();
    }
};

// Eliminar un gasto de una sesión
exports.deleteExpense = async (req, res) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    // Obtener los parámetros de la URL
    const { id, expenseId } = req.params;
    const sessionId = id; // Para mantener compatibilidad con el código existente
    const userId = req.user.id;
    
    console.log(`Iniciando eliminación de gasto - SessionID: ${sessionId}, ExpenseID: ${expenseId}, UserID: ${userId}`);
    
    // Validación básica de IDs
    if (!sessionId || !expenseId) {
      console.error('IDs de sesión o gasto no proporcionados');
      await dbSession.abortTransaction();
      return res.status(400).json({ msg: 'Se requieren IDs de sesión y gasto válidos' });
    }

    // Convertir los IDs a ObjectId y validar
    let sessionObjectId, expenseObjectId;
    try {
      sessionObjectId = new mongoose.Types.ObjectId(sessionId);
      expenseObjectId = new mongoose.Types.ObjectId(expenseId);
    } catch (error) {
      console.error('Error al convertir IDs a ObjectId:', error);
      await dbSession.abortTransaction();
      return res.status(400).json({ msg: 'ID de sesión o gasto inválido' });
    }

    // Buscar la sesión incluyendo el usuario actual
    const session = await SharedSession.findOne({
      _id: sessionObjectId,
      $or: [
        { userId: userId },
        { 'participants.userId': userId }
      ]
    }).session(dbSession);

    if (!session) {
      console.error(`Sesión ${sessionId} no encontrada o usuario ${userId} no autorizado`);
      await dbSession.abortTransaction();
      return res.status(404).json({ msg: 'Sesión no encontrada o no autorizada' });
    }

    // Verificar si el usuario es participante
    const isParticipant = session.participants.some(p => 
      p.userId && p.userId.toString() === userId.toString()
    );

    if (!isParticipant) {
      console.error(`Usuario ${userId} no es participante de la sesión ${sessionId}`);
      await dbSession.abortTransaction();
      return res.status(403).json({ msg: 'No tienes permisos para eliminar este gasto' });
    }

    // Buscar el gasto en la estructura yearlyExpenses
    let gastoEncontrado = false;
    let amountToSubtract = 0;
    let expenseYear, expenseMonth;
    let isRecurringExpense = false;
    let expenseName = '';

    // Recorrer la estructura yearlyExpenses para encontrar el gasto
    if (!session.yearlyExpenses) {
      session.yearlyExpenses = [];
    }

    // Primero, encontrar el gasto para determinar si es recurrente y obtener sus datos
    let targetExpense = null;
    for (const yearData of session.yearlyExpenses) {
      if (!yearData.months) continue;
      
      for (const monthData of yearData.months) {
        if (!monthData.expenses) continue;
        
        const expense = monthData.expenses.find(exp => 
          exp && exp._id && exp._id.toString() === expenseId
        );
        
        if (expense) {
          targetExpense = expense;
          isRecurringExpense = expense.isRecurring;
          expenseName = expense.name;
          expenseYear = yearData.year;
          expenseMonth = monthData.month;
          console.log(`Gasto encontrado en año=${yearData.year}, mes=${monthData.month}, recurrente=${isRecurringExpense ? 'Sí' : 'No'}`);
          break;
        }
      }
      if (targetExpense) break;
    }

    if (!targetExpense) {
      console.error(`Gasto ${expenseId} no encontrado en la sesión ${sessionId}`);
      await dbSession.abortTransaction();
      return res.status(404).json({ msg: 'Gasto no encontrado en la sesión' });
    }

    // Importar el servicio de sincronización de asignaciones
    const allocationSyncService = require('../services/allocationSyncService');
    
    // Almacenar los meses que deben actualizarse
    const monthsToSync = new Set();

    // Si es un gasto normal (no recurrente), eliminar solo ese gasto
    if (!isRecurringExpense) {
      console.log(`Eliminando gasto normal: ${expenseName} (${expenseId})`);
      
      // Eliminar el gasto específico
      for (const yearData of session.yearlyExpenses) {
        if (!yearData.months) continue;
        
        for (const monthData of yearData.months) {
          if (!monthData.expenses) continue;
          
          const expenseIndex = monthData.expenses.findIndex(exp => 
            exp && exp._id && exp._id.toString() === expenseId
          );
          
          if (expenseIndex !== -1) {
            amountToSubtract = monthData.expenses[expenseIndex].amount || 0;
            
            // Eliminar el gasto del array de gastos del mes
            monthData.expenses.splice(expenseIndex, 1);
            // Actualizar el total del mes
            monthData.totalAmount = Math.max(0, (monthData.totalAmount || 0) - amountToSubtract);
            
            // Añadir este mes a la lista para sincronizar
            monthsToSync.add({year: yearData.year, month: monthData.month});
            
            gastoEncontrado = true;
            break;
          }
        }
        if (gastoEncontrado) break;
      }
    } 
    // Si es un gasto recurrente, eliminar todas las instancias futuras
    else {
      console.log(`Eliminando gasto recurrente: ${expenseName} (${expenseId}) desde mes ${expenseMonth} año ${expenseYear} en adelante`);
      
      let totalEliminados = 0;
      
      // Eliminar instancias del mismo gasto recurrente desde el mes actual hacia adelante
      // Necesitamos mantener expenseId como referencia, pero encontraremos gastos con el mismo nombre y monto
      for (const yearData of session.yearlyExpenses) {
        if (!yearData.months || yearData.year < expenseYear) continue;
        
        for (const monthData of yearData.months) {
          if (!monthData.expenses) continue;
          
          // Si estamos en un año posterior al del gasto o 
          // en el mismo año pero en un mes igual o posterior
          if (yearData.year > expenseYear || (yearData.year === expenseYear && monthData.month >= expenseMonth)) {
            // Buscar gastos con el mismo nombre que son recurrentes
            const recurringExpenses = monthData.expenses.filter(exp => 
              exp && exp.name === expenseName && exp.isRecurring === true
            );
            
            if (recurringExpenses.length > 0) {
              for (const recExp of recurringExpenses) {
                const amountToRemove = recExp.amount || 0;
                
                // Filtrar los gastos para eliminar los recurrentes con el mismo nombre
                monthData.expenses = monthData.expenses.filter(exp => 
                  !(exp && exp.name === expenseName && exp.isRecurring === true)
                );
                
                // Actualizar el total del mes
                monthData.totalAmount = Math.max(0, (monthData.totalAmount || 0) - amountToRemove);
                
                // Añadir este mes a la lista para sincronizar
                monthsToSync.add({year: yearData.year, month: monthData.month});
                
                totalEliminados++;
              }
            }
          }
        }
      }
      
      gastoEncontrado = totalEliminados > 0;
      console.log(`Total de gastos recurrentes eliminados: ${totalEliminados}`);
    }

    if (!gastoEncontrado) {
      console.error(`No se pudieron eliminar gastos para ${expenseId} en la sesión ${sessionId}`);
      await dbSession.abortTransaction();
      return res.status(404).json({ msg: 'No se pudieron eliminar los gastos' });
    }

    // Guardar los cambios en la sesión
    await session.save({ session: dbSession });
    
    // Sincronizar asignaciones para todos los meses afectados
    console.log(`Sincronizando asignaciones para ${monthsToSync.size} meses afectados`);
    for (const {year, month} of monthsToSync) {
      try {
        console.log(`Sincronizando asignaciones para ${year}-${month+1}`);
        await allocationSyncService.syncMonthlyAllocations(sessionId, year, month, dbSession);
      } catch (error) {
        console.error(`Error al sincronizar asignaciones para ${year}-${month+1}:`, error);
        // Continuar con los siguientes meses incluso si hay error
      }
    }

    // Si es un gasto recurrente, eliminar todas las asignaciones relacionadas con este gasto desde el mes actual
    if (isRecurringExpense) {
      // Eliminar asignaciones desde el mes actual en adelante
      const allocationsFilter = { 
        sessionId: sessionObjectId,
        $or: [
          { year: { $gt: expenseYear } },
          { year: expenseYear, month: { $gte: expenseMonth } }
        ]
      };
      
      // Eliminar los gastos personales relacionados con este gasto recurrente
      await PersonalExpense.deleteMany(
        {
          'sessionReference.sessionId': sessionObjectId,
          $or: [
            { year: { $gt: expenseYear } },
            { year: expenseYear, month: { $gte: expenseMonth } }
          ]
        },
        { session: dbSession }
      );
    }

    await dbSession.commitTransaction();
    res.json({ msg: 'Gasto eliminado correctamente' });
  } catch (error) {
    await dbSession.abortTransaction();
    console.error('Error al eliminar gasto:', error);
    res.status(500).json({ msg: 'Error al eliminar el gasto' });
  } finally {
    dbSession.endSession();
  }
};

// Método auxiliar para encontrar un gasto en la estructura yearlyExpenses
exports._findExpenseInSession = function(session, expenseId) {
  for (const yearData of session.yearlyExpenses) {
    for (const monthData of yearData.months) {
      const expense = monthData.expenses.find(exp => exp._id.toString() === expenseId);
      if (expense) return expense;
    }
  }
  return null;
};

// Método auxiliar para eliminar un gasto de la estructura yearlyExpenses
exports._removeExpenseFromSession = function(session, expenseId) {
  for (const yearData of session.yearlyExpenses) {
    for (const monthData of yearData.months) {
      const expenseIndex = monthData.expenses.findIndex(exp => exp._id.toString() === expenseId);
      if (expenseIndex !== -1) {
        monthData.expenses.splice(expenseIndex, 1);
        return true;
      }
    }
  }
  return false;
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
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    const { distribution } = req.body;
    
    console.log(`Iniciando actualización de distribución para sesión ${sessionId}`);
    
    if (!distribution || !Array.isArray(distribution)) {
      await dbSession.abortTransaction();
      return res.status(400).json({ 
        msg: 'Formato de distribución inválido',
        details: 'La distribución debe ser un array de objetos con userId y percentage'
      });
    }
    
    // Validar que la suma de porcentajes sea 100
    const totalPercentage = distribution.reduce((sum, item) => sum + (item.percentage || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      await dbSession.abortTransaction();
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
    }).session(dbSession);
    
    if (!session) {
      await dbSession.abortTransaction();
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
        const user = await User.findById(item.userId).session(dbSession);
        
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
    
    await session.save({ session: dbSession });
    
    // Calcular y distribuir montos entre participantes
    try {
      // Importar servicios de manera segura
      let allocationService, syncService;
      try {
        allocationService = require('../services/allocationService');
        syncService = require('../services/syncService');
      } catch (importError) {
        console.error('Error al importar servicios:', importError);
        throw new Error('Error interno del servidor: servicios no disponibles');
      }
      
      // Verificar que los servicios necesarios estén disponibles
      if (!allocationService || typeof allocationService.distributeAmount !== 'function') {
        throw new Error('Servicio de asignación no disponible');
      }
      
      // Usar el servicio de asignación para distribuir montos
      const allocations = await allocationService.distributeAmount(session);
      console.log(`Distribución de montos actualizada para sesión ${sessionId}`);
      
      // Eliminar duplicados y actualizar nombres solo si los servicios están disponibles
      if (syncService) {
        if (typeof syncService.fixDuplicateAllocations === 'function') {
          await syncService.fixDuplicateAllocations(sessionId);
        }
        if (typeof syncService.updateUserNamesInAllocations === 'function') {
          await syncService.updateUserNamesInAllocations(sessionId);
        }
      }
      
      await dbSession.commitTransaction();
      
      res.json({
        msg: 'Distribución actualizada correctamente',
        allocations: session.allocations
      });
    } catch (serviceError) {
      await dbSession.abortTransaction();
      console.error('Error en servicios de asignación:', serviceError);
      res.status(500).json({ 
        msg: 'Error al distribuir montos entre participantes',
        details: serviceError.message
      });
    }
  } catch (error) {
    await dbSession.abortTransaction();
    console.error('Error al actualizar distribución:', error);
    res.status(500).json({ 
      msg: 'Error del servidor al actualizar distribución',
      details: error.message
    });
  } finally {
    dbSession.endSession();
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
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const { sessionId, expenseId } = req.params;
    const { amount, date, category, paidBy } = req.body;

    const session = await SharedSession.findById(sessionId).session(dbSession);
    if (!session) {
      await dbSession.abortTransaction();
      return res.status(404).json({ msg: 'Sesión no encontrada' });
    }

    // Encontrar y actualizar el gasto
    const expense = exports._findExpenseInSession(session, expenseId);
    if (!expense) {
      await dbSession.abortTransaction();
      return res.status(404).json({ msg: 'Gasto no encontrado' });
    }

    // Guardar valores anteriores para comparación
    const oldDate = expense.date ? new Date(expense.date) : new Date();
    const oldYear = oldDate.getFullYear();
    const oldMonth = oldDate.getMonth();
    const oldAmount = expense.amount;

    // Actualizar campos del gasto
    if (amount) expense.amount = parseFloat(amount);
    if (date) expense.date = new Date(date);
    if (category) expense.category = category;
    if (paidBy) expense.paidBy = paidBy;

    // Obtener nueva fecha para comparación
    const newDate = expense.date ? new Date(expense.date) : new Date();
    const newYear = newDate.getFullYear();
    const newMonth = newDate.getMonth();

    // Guardar la sesión actualizada
    await session.save({ session: dbSession });

    // Sincronizar asignaciones
    if (oldYear !== newYear || oldMonth !== newMonth) {
      // Si cambió el mes/año, sincronizar ambos períodos
      await allocationSyncService.syncMonthlyAllocations(sessionId, oldYear, oldMonth, dbSession);
      await allocationSyncService.syncMonthlyAllocations(sessionId, newYear, newMonth, dbSession);
    } else {
      // Si no cambió, solo sincronizar el mes actual
      await allocationSyncService.syncMonthlyAllocations(sessionId, newYear, newMonth, dbSession);
    }

    await dbSession.commitTransaction();
    res.json({ msg: 'Gasto actualizado correctamente' });
  } catch (error) {
    await dbSession.abortTransaction();
    console.error('Error al actualizar gasto:', error);
    res.status(500).json({ msg: 'Error al actualizar el gasto' });
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