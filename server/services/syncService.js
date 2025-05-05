const mongoose = require('mongoose');
const { ParticipantAllocation, PersonalExpense, SharedSession, User } = require('../models');

/**
 * Sincroniza una asignación de participante con su correspondiente gasto personal
 * @param {Object} allocation - Objeto de asignación de participante
 * @returns {Object} Resultado de la operación con el gasto creado/actualizado
 */
const syncAllocationToPersonalExpense = async (allocation) => {
  if (!allocation || !allocation._id) {
    throw new Error('Asignación inválida');
  }

  console.log(`Iniciando sincronización para asignación: ${allocation._id}`);
  console.log(`Datos de asignación: userId=${allocation.userId}, amount=${allocation.amount}`);

  // Verificar si ya está en progreso una sincronización para esta asignación
  // Esto evita llamadas recursivas desde los hooks
  const syncKey = `sync_${allocation._id.toString()}`;
  if (global[syncKey]) {
    console.log(`Sincronización ya en progreso para asignación: ${allocation._id}, evitando duplicación`);
    return { success: true, skipped: true };
  }

  // Marcar esta asignación como en proceso de sincronización
  global[syncKey] = true;

  // Iniciar una sesión de transacción de MongoDB
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    // Obtener información de la sesión compartida para el nombre
    const sharedSession = await SharedSession.findById(allocation.sessionId);
    if (!sharedSession) {
      throw new Error(`No se encontró la sesión compartida con ID: ${allocation.sessionId}`);
    }

    console.log(`Sesión compartida encontrada: ${sharedSession.name}`);
    
    // Obtener información del usuario para mejorar el nombre
    let userName = allocation.name;
    try {
      const user = await User.findById(allocation.userId);
      if (user) {
        userName = user.username || user.nombre || user.name || allocation.name;
        console.log(`Información de usuario obtenida: ${userName}`);
      }
    } catch (userError) {
      console.warn(`No se pudo obtener información de usuario: ${userError.message}`);
      // Continuar con el nombre que ya tenemos
    }

    // Verificar si ya existe un gasto personal asociado
    let personalExpense = null;
    
    // 1. Buscar primero por personalExpenseId si existe
    if (allocation.personalExpenseId) {
      personalExpense = await PersonalExpense.findById(allocation.personalExpenseId);
      console.log(`Buscando gasto personal por ID: ${allocation.personalExpenseId}, encontrado: ${!!personalExpense}`);
    }
    
    // 2. Si no encontramos por personalExpenseId, buscar por allocationId
    if (!personalExpense) {
      personalExpense = await PersonalExpense.findOne({ allocationId: allocation._id });
      console.log(`Buscando gasto personal por allocationId: ${allocation._id}, encontrado: ${!!personalExpense}`);
    }
    
    // 3. Si aún no encontramos, buscar por la referencia a la sesión
    if (!personalExpense) {
      personalExpense = await PersonalExpense.findOne({ 
        user: allocation.userId.toString(),
        'sessionReference.sessionId': allocation.sessionId
      });
      console.log(`Buscando gasto personal por referencia a sesión, encontrado: ${!!personalExpense}`);
    }
    
    // Si encontramos el gasto pero no tiene la referencia a la asignación, actualizar
    if (personalExpense && !personalExpense.allocationId) {
      personalExpense.allocationId = allocation._id;
      console.log(`Actualizada referencia de asignación en gasto personal: ${personalExpense._id}`);
    }
    
    // Si encontramos el gasto pero la asignación no tiene la referencia, actualizar
    if (personalExpense && !allocation.personalExpenseId) {
      allocation.personalExpenseId = personalExpense._id;
      await allocation.save({ session });
      console.log(`Actualizada referencia de gasto personal en asignación: ${personalExpense._id}`);
    }

    const currentDate = new Date();

    if (personalExpense) {
      // Actualizar el gasto existente
      personalExpense.name = sharedSession.name;
      personalExpense.description = `Gasto compartido - ${sharedSession.name} (${userName})`;
      personalExpense.amount = allocation.amount;
      personalExpense.currency = allocation.currency || 'EUR';
      personalExpense.date = currentDate;
      personalExpense.allocationId = allocation._id;
      personalExpense.user = allocation.userId.toString();
      personalExpense.sessionReference = {
        sessionId: allocation.sessionId,
        sessionName: sharedSession.name,
        percentage: allocation.percentage,
        isRecurringShare: sharedSession.sessionType === 'permanent'
      };
      
      await personalExpense.save({ session });
      
      console.log(`Gasto personal actualizado: ${personalExpense._id}`);
    } else {
      // Crear un nuevo gasto personal
      console.log(`Creando nuevo gasto personal para usuario ${allocation.userId}, nombre: ${userName}`);
      
      const expenseData = {
        user: allocation.userId.toString(), // Convertir explícitamente a string
        name: sharedSession.name,
        description: `Gasto compartido - ${sharedSession.name} (${userName})`,
        amount: allocation.amount,
        currency: allocation.currency || 'EUR',
        category: 'Gastos compartidos',
        date: currentDate,
        type: 'expense', // Asegurar que el tipo es correcto
        isRecurring: false,
        allocationId: allocation._id,
        sessionReference: {
          sessionId: allocation.sessionId,
          sessionName: sharedSession.name,
          percentage: allocation.percentage,
          isRecurringShare: sharedSession.sessionType === 'permanent'
        }
      };
      
      console.log(`Nuevo gasto a guardar:`, JSON.stringify(expenseData, null, 2));
      
      personalExpense = new PersonalExpense(expenseData);
      
      // Verificar que el objeto es válido antes de guardar
      const validationError = personalExpense.validateSync();
      if (validationError) {
        console.error('Error de validación:', validationError);
        throw new Error(`Error de validación: ${validationError.message}`);
      }
      
      await personalExpense.save({ session });
      
      // Actualizar la asignación con la referencia al gasto personal
      allocation.personalExpenseId = personalExpense._id;
      await allocation.save({ session });
      
      console.log(`Nuevo gasto personal creado con ID: ${personalExpense._id}`);
    }

    // Verificar el gasto guardado
    try {
      const savedExpense = await PersonalExpense.findById(personalExpense._id);
      if (savedExpense) {
        console.log('Gasto guardado:', JSON.stringify({
          id: savedExpense._id.toString(),
          user: savedExpense.user.toString(),
          name: savedExpense.name,
          amount: savedExpense.amount,
          date: savedExpense.date
        }, null, 2));
      } else {
        console.log('Advertencia: No se pudo verificar el gasto guardado');
      }
    } catch (verifyError) {
      console.warn('Error al verificar el gasto guardado:', verifyError.message);
      // Continuar a pesar del error de verificación
    }

    // Confirmar la transacción
    await session.commitTransaction();
    session.endSession();
    
    return { success: true, personalExpense };
  } catch (error) {
    // Revertir la transacción en caso de error
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    
    console.error('Error al sincronizar asignación con gasto personal:', error);
    throw error;
  } finally {
    // Marcar la sincronización como finalizada
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

module.exports = {
  syncAllocationToPersonalExpense,
  processNewAllocation,
  processUpdatedAllocation
}; 