const SharedSession = require('../models/SharedSession');
const User = require('../models/User');
const mongoose = require('mongoose');
const allocationService = require('../services/allocationService');

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
    
    if (!['accept', 'reject'].includes(response)) {
      return res.status(400).json({ msg: 'Respuesta no válida. Use "accept" o "reject"' });
    }
    
    // Buscar la sesión
    const sharedSession = await SharedSession.findById(id).session(dbSession);
    
    if (!sharedSession) {
      return res.status(404).json({ msg: 'Sesión compartida no encontrada' });
    }
    
    // Verificar que el usuario no sea el creador de la sesión
    if (sharedSession.userId.toString() === userId) {
      return res.status(400).json({ 
        msg: 'No puedes responder a esta invitación',
        details: 'Eres el creador de esta sesión y ya estás incluido automáticamente'
      });
    }
    
    // Buscar al participante por email
    const participantIndex = sharedSession.participants.findIndex(
      p => p.email.toLowerCase() === userEmail
    );
    
    if (participantIndex === -1) {
      return res.status(403).json({ msg: 'No eres participante de esta sesión' });
    }
    
    // Verificar que la invitación esté pendiente
    if (sharedSession.participants[participantIndex].status !== 'pending') {
      return res.status(400).json({ msg: 'Ya has respondido a esta invitación anteriormente' });
    }
    
    // Actualizar el estado del participante
    sharedSession.participants[participantIndex].status = response === 'accept' ? 'accepted' : 'rejected';
    sharedSession.participants[participantIndex].responseDate = new Date();
    
    // Si el usuario acepta, vincular su userId
    if (response === 'accept') {
      sharedSession.participants[participantIndex].userId = userId;
      
      // Verificar si todos los participantes han aceptado
      const allAccepted = sharedSession.participants.every(p => 
        p.status === 'accepted' || p.userId?.toString() === sharedSession.userId.toString()
      );
      
      if (allAccepted) {
        sharedSession.isLocked = false; // Desbloquear la sesión
        console.log(`Todos los participantes han aceptado. Desbloqueando sesión ${id}`);
      }
    }
    
    await sharedSession.save({ session: dbSession });
    await dbSession.commitTransaction();
    
    const responseMessage = response === 'accept' 
      ? 'Has aceptado la invitación a la sesión compartida'
      : 'Has rechazado la invitación a la sesión compartida';
    
    res.json({
      message: responseMessage,
      status: response === 'accept' ? 'accepted' : 'rejected',
      sessionId: sharedSession._id
    });
    
  } catch (error) {
    await dbSession.abortTransaction();
    console.error('Error al responder a la invitación:', error);
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

    // Usar findByIdAndDelete en lugar de remove()
    const deleteResult = await SharedSession.findByIdAndDelete(sessionId);
    
    console.log(`Sesión ${sessionId} eliminada con éxito:`, deleteResult ? 'Sí' : 'No');
    
    return res.json({ 
      msg: 'Sesión eliminada exitosamente', 
      success: true 
    });

  } catch (error) {
    console.error(`Error al eliminar sesión ${req.params.id}:`, error.message);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        msg: 'ID de sesión inválido',
        error: error.message
      });
    }
    return res.status(500).json({ 
      msg: 'Error del servidor al eliminar sesión',
      error: error.message
    });
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
        const { description, amount, date, paidBy, name = 'Gasto', category = 'Otros' } = req.body;
        
        console.log(`Iniciando adición de gasto a sesión ${req.params.id}. Datos:`, req.body);
        
        // Buscar la sesión
        const session = await SharedSession.findOne({
            _id: req.params.id,
            $or: [
                { userId: req.user.id },
                { 'participants.userId': req.user.id }
            ]
        });

        if (!session) {
            console.log(`Sesión ${req.params.id} no encontrada o no autorizada para usuario ${req.user.id}`);
            return res.status(404).json({ msg: 'Sesión no encontrada o no autorizada' });
        }

        // Verificar que el usuario que pagó sea parte de la sesión
        const isParticipant = session.participants.some(p => 
            p.userId && p.userId.toString() === paidBy
        );
        
        if (!isParticipant) {
            console.log(`Usuario ${paidBy} no es un participante válido de la sesión ${req.params.id}`);
            return res.status(400).json({ msg: 'Usuario no válido para el pago' });
        }

        // Crear un nuevo documento de gasto embebido (como subdocumento)
        const newExpense = {
            name: name || 'Gasto',
            description: description || '',
            amount: Number(amount) || 0,
            date: date ? new Date(date) : new Date(),
            category: category || 'Otros',
            paidBy: paidBy
        };
        
        console.log(`Creando nuevo gasto para sesión ${req.params.id}:`, newExpense);
        
        // Actualizar la sesión con el nuevo gasto usando findByIdAndUpdate
        // para evitar problemas con el middleware pre-save
        const updatedSession = await SharedSession.findByIdAndUpdate(
            session._id,
            { 
                $push: { expenses: newExpense },
                $set: { lastActivity: Date.now() },
                $inc: { totalAmount: Number(amount) || 0 }
            },
            { 
                new: true, // Devolver el documento actualizado
                runValidators: true // Ejecutar validadores de esquema
            }
        )
            .populate('userId', 'nombre email')
        .populate('participants.userId', 'nombre email');
        
        if (!updatedSession) {
            console.log(`Error al actualizar la sesión ${req.params.id}`);
            return res.status(500).json({ msg: 'Error al actualizar la sesión' });
        }
        
        // Calcular y distribuir montos entre participantes
        try {
            await allocationService.distributeAmount(updatedSession);
            console.log(`Distribución de montos actualizada para sesión ${req.params.id}`);
        } catch (allocError) {
            console.error('Error al distribuir montos:', allocError);
            // No interrumpir el proceso si falla la distribución
        }
        
        console.log(`Sesión ${req.params.id} actualizada con nuevo gasto. Total gastos: ${updatedSession.expenses.length}`);
        res.json(updatedSession);
    } catch (error) {
        console.error('Error al agregar gasto:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                msg: 'Error de validación', 
                details: Object.values(error.errors).map(err => err.message).join(', ') 
            });
        }
        res.status(500).json({ 
            msg: 'Error al agregar el gasto',
            error: error.message
        });
    }
};

// Eliminar un gasto de una sesión
exports.deleteExpense = async (req, res) => {
    try {
        const sessionId = req.params.id;
        const expenseId = req.params.expenseId;
        const userId = req.user.id;
        
        console.log(`Intentando eliminar gasto ${expenseId} de la sesión ${sessionId}`);
        
        // Buscar la sesión
        const session = await SharedSession.findOne({
            _id: sessionId,
            $or: [
                { userId: userId },
                { 'participants.userId': userId }
            ]
        });

        if (!session) {
            console.log(`Sesión ${sessionId} no encontrada o usuario ${userId} no autorizado`);
            return res.status(404).json({ msg: 'Sesión no encontrada o no autorizada' });
        }

        // Buscar el gasto
        const expense = session.expenses.id(expenseId);
        if (!expense) {
            console.log(`Gasto ${expenseId} no encontrado en la sesión ${sessionId}`);
            return res.status(404).json({ msg: 'Gasto no encontrado' });
        }

        // CAMBIO: Permitir que cualquier participante pueda eliminar gastos
        // Verificar que el usuario sea participante (esto ya se comprobó en la búsqueda de la sesión)
        const isParticipant = session.participants.some(p => 
            p.userId && p.userId.toString() === userId
        );
        
        if (!isParticipant) {
            console.log(`Usuario ${userId} no es participante de la sesión ${sessionId}`);
            return res.status(403).json({ msg: 'No tienes permisos para eliminar este gasto' });
        }

        // Guardar el monto antes de eliminarlo para ajustar el total
        const amountToSubtract = expense.amount;
        
        // Eliminar el gasto (usando pull)
        await SharedSession.findByIdAndUpdate(
            sessionId,
            { 
                $pull: { expenses: { _id: expenseId } },
                $inc: { totalAmount: -amountToSubtract },
                $set: { lastActivity: Date.now() }
            }
        );
        
        console.log(`Gasto ${expenseId} eliminado con éxito de la sesión ${sessionId}`);

        // Obtener la sesión actualizada
        const updatedSession = await SharedSession.findById(sessionId)
            .populate('userId', 'nombre email')
            .populate('participants.userId', 'nombre email');

        // Calcular y distribuir montos entre participantes
        try {
            await allocationService.distributeAmount(updatedSession);
            console.log(`Distribución de montos actualizada para sesión ${sessionId}`);
        } catch (allocError) {
            console.error('Error al distribuir montos:', allocError);
            // No interrumpir el proceso si falla la distribución
        }

        res.json(updatedSession);
    } catch (error) {
        console.error('Error al eliminar el gasto:', error);
        res.status(500).json({ 
            msg: 'Error al eliminar el gasto',
            error: error.message
        });
    }
};

// Eliminar una sesión compartida
exports.deleteSharedSession = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user.id;
    
    console.log(`Intentando eliminar sesión compartida: ${sessionId} por usuario: ${userId}`);

    const session = await SharedSession.findOne({
      _id: sessionId,
      $or: [
        { userId: userId },
        { 'participants.userId': userId, 'participants.role': 'admin' }
      ]
    });

    if (!session) {
      console.log(`Sesión compartida ${sessionId} no encontrada o no autorizada para usuario ${userId}`);
      return res.status(404).json({ 
        msg: 'Sesión no encontrada o no tienes permisos para eliminarla'
      });
    }

    // Eliminar usando findByIdAndDelete
    const deleteResult = await SharedSession.findByIdAndDelete(sessionId);
    
    console.log(`Sesión compartida ${sessionId} eliminada con éxito:`, deleteResult ? 'Sí' : 'No');

    res.json({ 
      msg: 'Sesión eliminada exitosamente',
      success: true
    });
  } catch (err) {
    console.error(`Error al eliminar sesión compartida ${req.params.id}:`, err.message);
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
  }
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
      // Obtener el modelo de gastos personales
      const PersonalExpense = mongoose.model('PersonalExpense');
      if (!PersonalExpense) {
        throw new Error('Modelo PersonalExpense no encontrado');
      }

      console.log(`Iniciando sincronización para sesión ${session.name} (${session._id})`);
      
      // Calcular el monto total de todos los gastos en la sesión
      const totalAmount = session.expenses.reduce((sum, expense) => sum + expense.amount, 0);
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
        syncStats.skipped = session.participants.length;
        
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
        const participantCount = session.participants.length;
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
    
    // Actualizar la distribución
    session.allocations = distribution.map(item => ({
      userId: item.userId,
      name: item.name || 'Usuario',
      percentage: item.percentage
    }));
    
    await session.save();
    
    // Calcular y distribuir montos entre participantes
    try {
      await allocationService.distributeAmount(session);
      console.log(`Distribución de montos actualizada para sesión ${sessionId}`);
    } catch (allocError) {
      console.error('Error al distribuir montos:', allocError);
      // No interrumpir el proceso si falla la distribución
    }
    
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

// Actualizar un gasto de una sesión
exports.updateExpense = async (req, res) => {
  try {
    const { description, amount, date, paidBy } = req.body;
    const sessionId = req.params.id;
    const expenseId = req.params.expenseId;
    const userId = req.user.id;
    
    console.log(`Actualizando gasto ${expenseId} en sesión ${sessionId} por usuario ${userId}`);
    
    const session = await SharedSession.findOne({
      _id: sessionId,
      isActive: true,
      $or: [
        { userId: userId },
        { 'participants.userId': userId }
      ]
    });

    if (!session) {
      console.log(`Sesión ${sessionId} no encontrada o no autorizada para usuario ${userId}`);
      return res.status(404).json({ msg: 'Sesión no encontrada o no autorizada' });
    }

    // Encontrar el gasto a actualizar
    const expense = session.expenses.id(expenseId);
    if (!expense) {
      console.log(`Gasto ${expenseId} no encontrado en sesión ${sessionId}`);
      return res.status(404).json({ msg: 'Gasto no encontrado' });
    }

    // CAMBIO: Permitir que cualquier participante pueda actualizar gastos
    // Verificar que el usuario sea participante (esto ya se comprobó en la búsqueda de la sesión)
    const isParticipant = session.participants.some(p => 
      p.userId && p.userId.toString() === userId
    );
    
    if (!isParticipant) {
      console.log(`Usuario ${userId} no es participante de la sesión ${sessionId}`);
      return res.status(401).json({ msg: 'No autorizado para actualizar este gasto' });
    }

    // Verificar que el paidBy sea un participante válido
    if (paidBy) {
      const isParticipant = session.participants.some(p => 
        p.userId && p.userId.toString() === paidBy
      );
      
      if (!isParticipant) {
        console.log(`Usuario ${paidBy} no es un participante válido de la sesión ${sessionId}`);
        return res.status(400).json({ msg: 'Usuario no válido para el pago' });
      }
    }

    // Guardar el monto anterior para cálculo del total
    const oldAmount = expense.amount;
    const amountDifference = (Number(amount) || 0) - oldAmount;

    // Actualizar los campos del gasto
    if (description !== undefined) expense.description = description;
    if (amount !== undefined) expense.amount = Number(amount);
    if (date !== undefined) expense.date = new Date(date);
    if (paidBy !== undefined) expense.paidBy = paidBy;

    // Actualizar el monto total de la sesión
    if (amountDifference !== 0) {
      session.totalAmount = (session.totalAmount || 0) + amountDifference;
    }

    // Registrar la fecha de última actividad
    session.lastActivity = Date.now();
    await session.save();

    // Calcular y distribuir montos entre participantes si cambió el importe
    if (amountDifference !== 0) {
      try {
        await allocationService.distributeAmount(session);
        console.log(`Distribución de montos actualizada para sesión ${sessionId}`);
      } catch (allocError) {
        console.error('Error al distribuir montos:', allocError);
        // No interrumpir el proceso si falla la distribución
      }
    }

    // Devolver la sesión actualizada con población de datos
    const updatedSession = await SharedSession.findById(sessionId)
      .populate('userId', 'nombre email')
      .populate('participants.userId', 'nombre email')
      .populate('expenses.paidBy', 'nombre email');

    console.log(`Gasto ${expenseId} actualizado correctamente`);
    res.json(updatedSession);
  } catch (error) {
    console.error('Error al actualizar el gasto:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        msg: 'Error de validación', 
        details: Object.values(error.errors).map(err => err.message).join(', ') 
      });
    }
    
    res.status(500).json({ msg: 'Error al actualizar el gasto' });
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