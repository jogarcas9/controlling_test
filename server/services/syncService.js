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

  let personalExpense = null;
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  try {
    // Buscar gasto personal existente por sesión y usuario
    personalExpense = await PersonalExpense.findOne({
      user: allocation.userId.toString(),
      'sessionReference.sessionId': allocation.sessionId,
      'sessionReference.year': allocation.year,
      'sessionReference.month': allocation.month,
      isFromSharedSession: true
    });

    // Obtener la sesión compartida si no se proporcionó
    const sharedSession = existingSession || await SharedSession.findById(allocation.sessionId)
      .select('name sessionType');

    if (!sharedSession) {
      throw new Error(`No se encontró la sesión compartida: ${allocation.sessionId}`);
    }

    // Formatear fecha
    const expenseDate = new Date(allocation.year, allocation.month, 15);
    const monthName = monthNames[allocation.month];

    // Preparar datos del gasto
    const expenseData = {
      user: allocation.userId.toString(),
      name: sharedSession.name || 'Gasto Compartido',
      description: `Parte correspondiente (${allocation.percentage.toFixed(2)}%) de gastos compartidos en "${sharedSession.name || 'Sesión Compartida'}" para ${monthName} ${allocation.year}`,
      amount: allocation.amount,
      currency: allocation.currency || 'EUR',
      category: 'Gastos Compartidos',
      date: expenseDate,
      type: 'expense',
      year: allocation.year,
      month: allocation.month,
      isFromSharedSession: true,
      isRecurring: true,
      sessionReference: {
        sessionId: allocation.sessionId,
        sessionName: sharedSession.name || 'Sesión Compartida',
        percentage: allocation.percentage,
        totalAmount: allocation.totalAmount || 0,
        year: allocation.year,
        month: allocation.month,
        isRecurringShare: true,
        participantName: allocation.name
      }
    };

    if (personalExpense) {
      // Actualizar gasto existente
      console.log(`Actualizando gasto personal existente para sesión ${allocation.sessionId}, mes ${monthName} ${allocation.year}`);
      await PersonalExpense.findByIdAndUpdate(
        personalExpense._id,
        { $set: expenseData },
        { new: true, runValidators: true }
      );
    } else {
      // Crear nuevo gasto solo si no existe
      console.log(`Creando nuevo gasto personal para sesión ${allocation.sessionId}, mes ${monthName} ${allocation.year}`);
      personalExpense = await PersonalExpense.create(expenseData);
    }

    // Actualizar la referencia en la asignación
    await ParticipantAllocation.findByIdAndUpdate(
      allocation._id,
      { 
        $set: { 
          personalExpenseId: personalExpense._id,
          amount: allocation.amount,
          totalAmount: allocation.totalAmount
        } 
      },
      { new: true }
    );

    return { success: true, personalExpense };
  } catch (error) {
    console.error('Error en sincronización:', error);
    throw error;
  }
};

/**
 * Procesa automáticamente una nueva asignación de participante
 * @param {Object} allocation - Objeto de asignación recién creado
 * @returns {Object} Resultado de la operación
 */
const processNewAllocation = async (allocation) => {
  try {
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
    const allocations = await ParticipantAllocation.find({ sessionId })
      .select('userId name');
    
    const updates = allocations.map(allocation => ({
      updateOne: {
        filter: { _id: allocation._id },
        update: { $set: { name: allocation.name } }
      }
    }));

    if (updates.length > 0) {
      await ParticipantAllocation.bulkWrite(updates, { ordered: false });
    }

    return { success: true, updatedCount: updates.length };
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
  const duplicates = await ParticipantAllocation.aggregate([
    { $match: { sessionId: new mongoose.Types.ObjectId(sessionId) } },
    {
      $group: {
        _id: {
          userId: '$userId',
          year: '$year',
          month: '$month'
        },
        count: { $sum: 1 },
        docs: { $push: '$_id' }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]);

  if (duplicates.length > 0) {
    const deleteIds = duplicates.flatMap(dup => 
      dup.docs.slice(1) // Mantener el primer documento, eliminar los demás
    );

    await ParticipantAllocation.deleteMany({
      _id: { $in: deleteIds }
    });
  }

  return { removedCount: duplicates.reduce((sum, dup) => sum + dup.count - 1, 0) };
};

module.exports = {
  syncAllocationToPersonalExpense,
  processNewAllocation,
  processUpdatedAllocation,
  updateUserNamesInAllocations,
  fixDuplicateAllocations
}; 