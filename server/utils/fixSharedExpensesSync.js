/**
 * Script para sincronizar todas las asignaciones de participantes con gastos personales
 * Este script resuelve problemas donde los gastos personales no se han creado correctamente
 * o están desincronizados con sus asignaciones correspondientes.
 * 
 * Uso: node server/utils/fixSharedExpensesSync.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// Conexión a MongoDB
const connectDB = async () => {
  try {
    // Obtener URL de MongoDB desde .env o usar una URL por defecto
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/controlling_app';
    
    await mongoose.connect(mongoURI);
    console.log('MongoDB conectado...');
    
    // Cargar modelos necesarios para el script
    require('../models/User');
    require('../models/ParticipantAllocation');
    require('../models/PersonalExpense');
    require('../models/SharedSession');
    
    console.log('Modelos cargados correctamente.');
  } catch (err) {
    console.error('Error al conectar a MongoDB:', err.message);
    process.exit(1);
  }
};

// Función para sincronizar todas las asignaciones
const syncAllAllocations = async () => {
  console.log('\n==== INICIANDO SINCRONIZACIÓN DE TODAS LAS ASIGNACIONES ====\n');
  
  try {
    // Obtener modelos
    const ParticipantAllocation = mongoose.model('ParticipantAllocation');
    const PersonalExpense = mongoose.model('PersonalExpense');
    
    // Buscar todas las asignaciones
    const allocations = await ParticipantAllocation.find()
      .sort({ updatedAt: -1 });
    
    if (!allocations || allocations.length === 0) {
      console.log('No se encontraron asignaciones para sincronizar');
      return;
    }
    
    console.log(`Encontradas ${allocations.length} asignaciones para sincronizar`);
    
    // Verificar y corregir asignaciones duplicadas
    console.log('\n=== CORRIGIENDO ASIGNACIONES DUPLICADAS ===\n');
    
    // Agrupar por combinación de userId + sessionId + year + month
    const groupedAllocations = {};
    
    allocations.forEach(allocation => {
      const key = `${allocation.userId}_${allocation.sessionId}_${allocation.year}_${allocation.month}`;
      
      if (!groupedAllocations[key]) {
        groupedAllocations[key] = [];
      }
      
      groupedAllocations[key].push(allocation);
    });
    
    // Identificar y corregir duplicados
    let duplicateCount = 0;
    
    for (const key in groupedAllocations) {
      const items = groupedAllocations[key];
      
      if (items.length > 1) {
        console.log(`Encontradas ${items.length} asignaciones duplicadas para ${key}`);
        duplicateCount += items.length - 1;
        
        // Ordenar por fecha de actualización (más reciente primero)
        items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        
        // Mantener la más reciente, eliminar las demás
        const keepAllocation = items[0];
        console.log(`Manteniendo asignación: ${keepAllocation._id} (más reciente)`);
        
        for (let i = 1; i < items.length; i++) {
          const duplicateAllocation = items[i];
          
          // Si la duplicada tiene una referencia a un gasto personal, actualizar la principal
          if (duplicateAllocation.personalExpenseId && !keepAllocation.personalExpenseId) {
            console.log(`Actualizando referencia de gasto personal ${duplicateAllocation.personalExpenseId} a asignación principal ${keepAllocation._id}`);
            
            // Actualizar la asignación principal
            await ParticipantAllocation.findByIdAndUpdate(
              keepAllocation._id,
              { personalExpenseId: duplicateAllocation.personalExpenseId }
            );
            
            // Actualizar el gasto personal para que apunte a la asignación principal
            await PersonalExpense.findByIdAndUpdate(
              duplicateAllocation.personalExpenseId,
              { allocationId: keepAllocation._id }
            );
          }
          
          // Eliminar la asignación duplicada
          console.log(`Eliminando asignación duplicada: ${duplicateAllocation._id}`);
          await ParticipantAllocation.findByIdAndDelete(duplicateAllocation._id);
        }
      }
    }
    
    console.log(`\nCorregidas ${duplicateCount} asignaciones duplicadas`);
    
    // Volver a obtener las asignaciones después de eliminar duplicados
    const cleanedAllocations = await ParticipantAllocation.find()
      .sort({ updatedAt: -1 });
    
    console.log(`\nQuedan ${cleanedAllocations.length} asignaciones únicas para sincronizar`);
    
    // Sincronizar cada asignación con su gasto personal
    console.log('\n=== SINCRONIZANDO ASIGNACIONES CON GASTOS PERSONALES ===\n');
    
    let successCount = 0;
    let errorCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const allocation of cleanedAllocations) {
      try {
        console.log(`\nSincronizando asignación: ${allocation._id}`);
        console.log(`Usuario: ${allocation.userId}, Sesión: ${allocation.sessionId}, Monto: ${allocation.amount}`);
        console.log(`Año: ${allocation.year}, Mes: ${allocation.month}`);
        
        // Verificar si ya existe un gasto personal asociado
        let personalExpense = null;
        
        if (allocation.personalExpenseId) {
          personalExpense = await PersonalExpense.findById(allocation.personalExpenseId);
          console.log(`Gasto personal encontrado por ID: ${personalExpense ? 'Sí' : 'No'}`);
        }
        
        if (!personalExpense) {
          // Buscar por referencia de asignación
          personalExpense = await PersonalExpense.findOne({ allocationId: allocation._id });
          console.log(`Gasto personal encontrado por allocationId: ${personalExpense ? 'Sí' : 'No'}`);
          
          if (!personalExpense) {
            // Buscar por combinación de usuario, sesión, año y mes
            personalExpense = await PersonalExpense.findOne({
              user: allocation.userId.toString(),
              'sessionReference.sessionId': allocation.sessionId,
              year: allocation.year,
              month: allocation.month
            });
            console.log(`Gasto personal encontrado por criterios combinados: ${personalExpense ? 'Sí' : 'No'}`);
          }
        }
        
        // Obtener información de la sesión
        const SharedSession = mongoose.model('SharedSession');
        const session = await SharedSession.findById(allocation.sessionId);
        
        if (!session) {
          console.log(`No se encontró la sesión ${allocation.sessionId}, saltando...`);
          continue;
        }
        
        // Obtener información del usuario
        const User = mongoose.model('User');
        const user = await User.findById(allocation.userId);
        
        if (!user) {
          console.log(`No se encontró el usuario ${allocation.userId}, saltando...`);
          continue;
        }
        
        const userName = user.nombre || user.email || 'Usuario';
        
        // Formatear información para el gasto personal
        const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const monthName = monthNames[allocation.month];
        const formattedPercentage = allocation.percentage.toFixed(2);
        const expenseDate = new Date(allocation.year, allocation.month, 15);
        
        // Verificar si la sesión es recurrente
        const isRecurringSession = session.sessionType === 'permanent';
        
        if (personalExpense) {
          // Actualizar el gasto existente
          personalExpense.name = session.name;
          personalExpense.description = `Parte correspondiente (${formattedPercentage}%) de gastos compartidos en "${session.name}" para ${monthName} ${allocation.year}`;
          personalExpense.amount = allocation.amount;
          personalExpense.currency = allocation.currency || 'EUR';
          personalExpense.date = expenseDate;
          personalExpense.year = allocation.year;
          personalExpense.month = allocation.month;
          personalExpense.allocationId = allocation._id;
          personalExpense.category = 'Gastos Compartidos';
          // Marcar como recurrente si la sesión es recurrente
          personalExpense.isRecurring = isRecurringSession;
          // Marcar como no editable ni borrable
          personalExpense.isFromSharedSession = true;
          
          // Actualizar o crear referencia de sesión
          if (!personalExpense.sessionReference) {
            personalExpense.sessionReference = {};
          }
          
          personalExpense.sessionReference = {
            sessionId: allocation.sessionId,
            sessionName: session.name,
            percentage: allocation.percentage,
            totalAmount: allocation.totalAmount || 0,
            year: allocation.year,
            month: allocation.month,
            participantName: userName,
            isRecurringShare: isRecurringSession
          };
          
          await personalExpense.save();
          console.log(`Gasto personal actualizado: ${personalExpense._id}`);
          updatedCount++;
          
          // Actualizar referencia en la asignación si es necesario
          if (!allocation.personalExpenseId || !allocation.personalExpenseId.equals(personalExpense._id)) {
            await ParticipantAllocation.findByIdAndUpdate(
              allocation._id,
              { personalExpenseId: personalExpense._id }
            );
            console.log(`Actualizada referencia en asignación: ${allocation._id} -> ${personalExpense._id}`);
          }
        } else {
          // Crear un nuevo gasto personal
          personalExpense = new PersonalExpense({
            user: allocation.userId.toString(),
            name: session.name,
            description: `Parte correspondiente (${formattedPercentage}%) de gastos compartidos en "${session.name}" para ${monthName} ${allocation.year}`,
            amount: allocation.amount,
            currency: allocation.currency || 'EUR',
            category: 'Gastos Compartidos',
            date: expenseDate,
            year: allocation.year,
            month: allocation.month,
            type: 'expense',
            allocationId: allocation._id,
            // Marcar como recurrente si la sesión es recurrente
            isRecurring: isRecurringSession,
            // Marcar como no editable ni borrable
            isFromSharedSession: true,
            sessionReference: {
              sessionId: allocation.sessionId,
              sessionName: session.name,
              percentage: allocation.percentage,
              totalAmount: allocation.totalAmount || 0,
              year: allocation.year,
              month: allocation.month,
              participantName: userName,
              isRecurringShare: isRecurringSession
            }
          });
          
          const savedExpense = await personalExpense.save();
          console.log(`Nuevo gasto personal creado: ${savedExpense._id}`);
          createdCount++;
          
          // Actualizar la asignación con el ID del gasto personal
          await ParticipantAllocation.findByIdAndUpdate(
            allocation._id,
            { personalExpenseId: savedExpense._id }
          );
          
          console.log(`Actualizada referencia en asignación: ${allocation._id} -> ${savedExpense._id}`);
        }
        
        successCount++;
      } catch (error) {
        console.error(`Error sincronizando asignación ${allocation._id}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n=== SINCRONIZACIÓN COMPLETADA ===');
    console.log(`Total asignaciones: ${cleanedAllocations.length}`);
    console.log(`Sincronizadas correctamente: ${successCount}`);
    console.log(`Gastos personales creados: ${createdCount}`);
    console.log(`Gastos personales actualizados: ${updatedCount}`);
    console.log(`Errores: ${errorCount}`);
    
  } catch (error) {
    console.error('Error en sincronización global:', error);
  }
};

// Función principal
const main = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();
    
    // Sincronizar todas las asignaciones
    await syncAllAllocations();
    
    console.log('\nProceso completado');
    
    // Cerrar conexión
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error en proceso principal:', error);
    process.exit(1);
  }
};

// Ejecutar script
main(); 