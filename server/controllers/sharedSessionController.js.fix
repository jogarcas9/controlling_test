// Imports corregidos
const mongoose = require('mongoose');
const { SharedSession, PersonalExpense, ParticipantAllocation, User } = require('../models');
const { allocationService, syncService } = require('../services');
const { ObjectId } = mongoose.Types;
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const generatePDF = require('../utils/generatePDF');

// Sincronizar gastos de sesión compartida a gastos personales (versión corregida)
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