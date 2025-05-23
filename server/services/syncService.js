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
  console.log(`Datos de asignación: userId=${allocation.userId}, amount=${allocation.amount}, percentage=${allocation.percentage}%, sessionId=${allocation.sessionId}`);

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
    
    // Obtener información del usuario para usar el nombre real
    let userName = "Usuario";
    let userNameUpdated = false;
    
    try {
      const user = await User.findById(allocation.userId);
      if (user) {
        // Priorizar campos de nombre en este orden
        userName = user.nombre || user.name || user.username || user.email || "Usuario";
        userNameUpdated = true;
        console.log(`Información de usuario obtenida: ${userName} (ID: ${user._id})`);
      } else {
        console.warn(`No se encontró el usuario con ID: ${allocation.userId}`);
      }
    } catch (userError) {
      console.warn(`Error al obtener información de usuario: ${userError.message}`);
    }

    // Si tenemos el nombre real del usuario y es diferente al de la asignación, actualizar la asignación
    if (userNameUpdated && userName !== allocation.name && userName !== allocation.username) {
      console.log(`Actualizando nombre de usuario en asignación: ${allocation._id}`);
      console.log(`Nombre anterior: ${allocation.name || allocation.username}, Nombre nuevo: ${userName}`);
      
      // Actualizar tanto name como username para mayor compatibilidad
      if (allocation.name !== undefined) {
        allocation.name = userName;
      }
      if (allocation.username !== undefined) {
        allocation.username = userName;
      }
      
      // Guardar la actualización del nombre en la asignación
      try {
        await ParticipantAllocation.findByIdAndUpdate(
          allocation._id,
          { 
            name: userName,
            username: userName
          },
          { session }
        );
        console.log(`Nombre de usuario actualizado en asignación con ID: ${allocation._id}`);
      } catch (updateError) {
        console.warn(`Error al actualizar nombre en asignación: ${updateError.message}`);
        // Continuamos con el proceso a pesar del error
      }
    }

    // Verificar si ya existe un gasto personal asociado - BÚSQUEDA MEJORADA
    let personalExpense = null;
    
    // Conjunto de criterios para buscar un gasto existente con la combinación de sessionId, userId, year y month
    const matchCriteria = {
      user: allocation.userId.toString(),
      'sessionReference.sessionId': allocation.sessionId,
      'sessionReference.year': allocation.year,
      'sessionReference.month': allocation.month
    };
    
    // 1. Buscar primero por personalExpenseId si existe (método más directo)
    if (allocation.personalExpenseId) {
      personalExpense = await PersonalExpense.findById(allocation.personalExpenseId);
      console.log(`Búsqueda por personalExpenseId: ${allocation.personalExpenseId}, encontrado: ${!!personalExpense}`);
    }
    
    // 2. Si no encontramos por personalExpenseId, buscar por allocationId
    if (!personalExpense) {
      personalExpense = await PersonalExpense.findOne({ allocationId: allocation._id });
      console.log(`Búsqueda por allocationId: ${allocation._id}, encontrado: ${!!personalExpense}`);
    }
    
    // 3. Si aún no encontramos, buscar por la combinación exacta de sessionId, userId, year y month
    if (!personalExpense) {
      personalExpense = await PersonalExpense.findOne(matchCriteria);
      console.log(`Búsqueda por criterios combinados (sessionId=${allocation.sessionId}, userId=${allocation.userId}, year=${allocation.year}, month=${allocation.month}): encontrado: ${!!personalExpense}`);
      
      // Si encontramos un gasto por estos criterios, actualizar la asociación explícita con allocationId
      if (personalExpense && !personalExpense.allocationId) {
        personalExpense.allocationId = allocation._id;
        console.log(`Actualizando la referencia de allocationId en gasto personal: ${personalExpense._id}`);
      }
    }
    
    // Actualizar referencias cruzadas si es necesario
    if (personalExpense && !personalExpense.allocationId) {
      personalExpense.allocationId = allocation._id;
      console.log(`Actualizada referencia de asignación en gasto personal: ${personalExpense._id}`);
    }
    
    if (personalExpense && !allocation.personalExpenseId) {
      allocation.personalExpenseId = personalExpense._id;
      await ParticipantAllocation.findByIdAndUpdate(
        allocation._id,
        { personalExpenseId: personalExpense._id },
        { session }
      );
      console.log(`Actualizada referencia de gasto personal en asignación: ${personalExpense._id}`);
    }

    // Crear fecha específica para el gasto: día 15 del mes correspondiente
    const expenseDate = new Date(allocation.year, allocation.month, 15);
    console.log(`Fecha asignada al gasto: ${expenseDate.toISOString()}`);

    // Formatear el nombre del mes para mostrar en la descripción
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const monthName = monthNames[allocation.month];
    
    // Calcular el porcentaje con 2 decimales para mostrar
    const formattedPercentage = allocation.percentage.toFixed(2);
    
    // Formatear el monto con 2 decimales para mostrar
    const formattedAmount = allocation.amount.toFixed(2);

    if (personalExpense) {
      // Actualizar el gasto existente con información más detallada
      personalExpense.name = `${sharedSession.name} - ${monthName} ${allocation.year}`;
      personalExpense.description = `Parte correspondiente (${formattedPercentage}%) de gastos compartidos en "${sharedSession.name}" para ${monthName} ${allocation.year}`;
      personalExpense.amount = allocation.amount;
      personalExpense.currency = allocation.currency || 'EUR';
      personalExpense.date = expenseDate;
      personalExpense.allocationId = allocation._id;
      personalExpense.user = allocation.userId.toString();
      personalExpense.year = allocation.year;
      personalExpense.month = allocation.month;
      
      // Usar el nombre real del usuario en la referencia a la sesión
      personalExpense.sessionReference = {
        sessionId: allocation.sessionId,
        sessionName: sharedSession.name,
        percentage: allocation.percentage,
        totalAmount: allocation.totalAmount || 0,
        year: allocation.year,
        month: allocation.month,
        isRecurringShare: sharedSession.sessionType === 'permanent',
        participantName: userName  // Añadir el nombre real del usuario
      };
      
      await personalExpense.save({ session });
      
      console.log(`Gasto personal ACTUALIZADO: ${personalExpense._id} - Monto: ${formattedAmount} € (${formattedPercentage}% de ${allocation.totalAmount || 0} €)`);
    } else {
      // Crear un nuevo gasto personal solo si no existe uno previo para esta combinación
      console.log(`Creando nuevo gasto personal para usuario ${allocation.userId}, nombre: ${userName}`);
      
      const expenseData = {
        user: allocation.userId.toString(),
        name: `${sharedSession.name} - ${monthName} ${allocation.year}`,
        description: `Parte correspondiente (${formattedPercentage}%) de gastos compartidos en "${sharedSession.name}" para ${monthName} ${allocation.year}`,
        amount: allocation.amount,
        currency: allocation.currency || 'EUR',
        category: 'Gastos Compartidos',
        date: expenseDate,
        type: 'expense',
        isRecurring: false,
        year: allocation.year,
        month: allocation.month,
        allocationId: allocation._id,
        // Usar el nombre real del usuario en la referencia a la sesión
        sessionReference: {
          sessionId: allocation.sessionId,
          sessionName: sharedSession.name,
          percentage: allocation.percentage,
          totalAmount: allocation.totalAmount || 0,
          year: allocation.year,
          month: allocation.month,
          isRecurringShare: sharedSession.sessionType === 'permanent',
          participantName: userName  // Añadir el nombre real del usuario
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
      await ParticipantAllocation.findByIdAndUpdate(
        allocation._id,
        { personalExpenseId: personalExpense._id },
        { session }
      );
      
      console.log(`Nuevo gasto personal CREADO con ID: ${personalExpense._id} - Monto: ${formattedAmount} € (${formattedPercentage}% de ${allocation.totalAmount || 0} €)`);
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
          date: savedExpense.date,
          year: savedExpense.year,
          month: savedExpense.month,
          sessionReference: savedExpense.sessionReference
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
  try {
    // Buscar todas las asignaciones para esta sesión
    const allocations = await ParticipantAllocation.find({ sessionId });
    
    // Agrupar por userId y mes/año
    const groupedAllocations = {};
    allocations.forEach(alloc => {
      const key = `${alloc.userId}-${alloc.year}-${alloc.month}`;
      if (!groupedAllocations[key]) {
        groupedAllocations[key] = [];
      }
      groupedAllocations[key].push(alloc);
    });
    
    // Eliminar duplicados manteniendo la asignación más reciente
    for (const key in groupedAllocations) {
      const duplicates = groupedAllocations[key];
      if (duplicates.length > 1) {
        // Ordenar por fecha de actualización, el más reciente primero
        duplicates.sort((a, b) => b.updatedAt - a.updatedAt);
        
        // Mantener el más reciente y eliminar el resto
        const [keep, ...remove] = duplicates;
        const removeIds = remove.map(d => d._id);
        
        await ParticipantAllocation.deleteMany({
          _id: { $in: removeIds }
        });
      }
    }
  } catch (error) {
    throw new Error(`Error al eliminar duplicados: ${error.message}`);
  }
};

module.exports = {
  syncAllocationToPersonalExpense,
  processNewAllocation,
  processUpdatedAllocation,
  updateUserNamesInAllocations,
  fixDuplicateAllocations
}; 