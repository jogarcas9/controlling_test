const mongoose = require('mongoose');
const { ParticipantAllocation, PersonalExpense, SharedSession, User } = require('../models');

/**
 * Sincroniza una asignación de participante con su correspondiente gasto personal
 * @param {Object} allocation - Objeto de asignación de participante
 * @param {Object} existingSession - Sesión de MongoDB existente (opcional)
 * @returns {Object} Resultado de la operación con el gasto creado/actualizado
 */
const syncAllocationToPersonalExpense = async (allocation, existingSession = null) => {
  if (!allocation || !allocation._id) {
    throw new Error('Asignación inválida');
  }

  console.log(`Iniciando sincronización para asignación: ${allocation._id}`);
  console.log(`Datos de asignación: userId=${allocation.userId}, amount=${allocation.amount}, percentage=${allocation.percentage}%, sessionId=${allocation.sessionId}`);

  // Verificar si ya está en progreso una sincronización para esta asignación
  const syncKey = `sync_${allocation._id.toString()}`;
  if (global[syncKey]) {
    console.log(`Sincronización ya en progreso para asignación: ${allocation._id}, evitando duplicación`);
    return { success: true, skipped: true };
  }

  // Marcar esta asignación como en proceso de sincronización
  global[syncKey] = true;

  let session;
  try {
    session = await mongoose.startSession();
    await session.startTransaction();

    // Obtener información de la sesión compartida
    const sharedSession = existingSession || await SharedSession.findById(allocation.sessionId).session(session);
    if (!sharedSession) {
      throw new Error(`No se encontró la sesión compartida con ID: ${allocation.sessionId}`);
    }

    // Obtener información del usuario
    const user = await User.findById(allocation.userId).session(session);
    const userName = user ? (user.nombre || user.name || user.email) : "Usuario";

    // Crear fecha específica para el gasto: día 15 del mes correspondiente
    const expenseDate = new Date(allocation.year, allocation.month, 15);

    // Formatear el nombre del mes
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const monthName = monthNames[allocation.month];

    // Buscar gasto personal existente
    let personalExpense = await PersonalExpense.findOne({
      user: allocation.userId.toString(),
      'sessionReference.sessionId': allocation.sessionId,
      year: allocation.year,
      month: allocation.month
    }).session(session);

    const expenseData = {
      user: allocation.userId.toString(),
      name: `${sharedSession.name} - ${monthName} ${allocation.year}`,
      description: `Parte correspondiente (${allocation.percentage.toFixed(2)}%) de gastos compartidos en "${sharedSession.name}" para ${monthName} ${allocation.year}`,
      amount: allocation.amount,
      currency: allocation.currency || 'EUR',
      category: 'Gastos Compartidos',
      date: expenseDate,
      type: 'expense',
      year: allocation.year,
      month: allocation.month,
      allocationId: allocation._id,
      isFromSharedSession: true,
      isRecurring: sharedSession.sessionType === 'permanent',
      sessionReference: {
        sessionId: allocation.sessionId,
        sessionName: sharedSession.name,
        percentage: allocation.percentage,
        totalAmount: allocation.totalAmount || 0,
        year: allocation.year,
        month: allocation.month,
        isRecurringShare: sharedSession.sessionType === 'permanent',
        participantName: userName
      }
    };

    if (personalExpense) {
      // Actualizar gasto existente
      Object.assign(personalExpense, expenseData);
      await personalExpense.save({ session });
      console.log(`Gasto personal actualizado: ${personalExpense._id}`);
    } else {
      // Crear nuevo gasto
      personalExpense = new PersonalExpense(expenseData);
      await personalExpense.save({ session });
      console.log(`Nuevo gasto personal creado: ${personalExpense._id}`);

      // Actualizar la referencia en la asignación
      await ParticipantAllocation.findByIdAndUpdate(
        allocation._id,
        { personalExpenseId: personalExpense._id },
        { session }
      );
    }

    await session.commitTransaction();
    return { success: true, personalExpense };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    console.error('Error al sincronizar asignación con gasto personal:', error);
    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
    delete global[syncKey];
  }
};

/**
 * Procesa automáticamente una nueva asignación de participante
 * @param {Object} allocation - Objeto de asignación recién creado
 * @returns {Object} Resultado de la operación
 */
const processNewAllocation = async (allocation) => {
  try {
    console.log(`Procesando nueva asignación: ${allocation._id}`);
    return await syncAllocationToPersonalExpense(allocation);
  } catch (error) {
    console.error('Error procesando nueva asignación:', error);
    throw error;
  }
};

/**
 * Procesa la actualización de una asignación existente
 * @param {Object} allocation - Objeto de asignación actualizado
 * @returns {Object} Resultado de la operación
 */
const processUpdatedAllocation = async (allocation) => {
  try {
    console.log(`Procesando actualización de asignación: ${allocation._id}`);
    return await syncAllocationToPersonalExpense(allocation);
  } catch (error) {
    console.error('Error procesando actualización de asignación:', error);
    throw error;
  }
};

/**
 * Actualiza los nombres de usuario en asignaciones existentes para sesiones específicas
 * @param {string} sessionId - ID de la sesión compartida a actualizar
 * @returns {Object} Resultado de la operación con asignaciones actualizadas
 */
const updateUserNamesInAllocations = async (sessionId) => {
  try {
    // Buscar todas las asignaciones para esta sesión
    const allocations = await ParticipantAllocation.find({ sessionId });
    
    // Actualizar el nombre de cada asignación
    for (const allocation of allocations) {
      try {
        const user = await User.findById(allocation.userId);
        if (user) {
          const realName = user.nombre || user.name || user.username || user.email || "Usuario";
          
          if (realName !== allocation.name) {
            allocation.name = realName;
            allocation.username = realName;
            await allocation.save();
          }
        }
      } catch (userError) {
        console.warn(`Error al actualizar nombre de usuario para asignación ${allocation._id}:`, userError.message);
      }
    }
  } catch (error) {
    throw new Error(`Error al actualizar nombres de usuario: ${error.message}`);
  }
};

/**
 * Función para corregir asignaciones duplicadas en sesiones compartidas
 * @param {string} sessionId - ID de la sesión compartida a verificar
 * @returns {Object} Resultado con estadísticas de la corrección
 */
const fixDuplicateAllocations = async (sessionId) => {
  const allocations = await ParticipantAllocation.find({ sessionId });
  const seen = new Set();
  const duplicates = [];

  for (const allocation of allocations) {
    const key = `${allocation.userId}-${allocation.year}-${allocation.month}`;
    if (seen.has(key)) {
      duplicates.push(allocation._id);
    } else {
      seen.add(key);
    }
  }

  if (duplicates.length > 0) {
    await ParticipantAllocation.deleteMany({
      _id: { $in: duplicates }
    });
  }

  return duplicates.length;
};

module.exports = {
  syncAllocationToPersonalExpense,
  processNewAllocation,
  processUpdatedAllocation,
  updateUserNamesInAllocations,
  fixDuplicateAllocations
}; 