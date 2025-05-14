/**
 * Script para corregir los nombres de los gastos compartidos,
 * eliminando la parte "- mes año" que se está mostrando incorrectamente.
 * 
 * Uso: node server/utils/fixExpenseNames.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Conexión a MongoDB
const connectDB = async () => {
  try {
    // Obtener URL de MongoDB desde .env o usar una URL por defecto
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/controlling_app';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB conectado...');
    
    // Cargar modelos necesarios para el script
    require('../models/PersonalExpense');
    require('../models/SharedSession');
    
    console.log('Modelos cargados correctamente.');
  } catch (err) {
    console.error('Error al conectar a MongoDB:', err.message);
    process.exit(1);
  }
};

// Función para corregir los nombres de gastos
const fixExpenseNames = async () => {
  console.log('\n==== CORRIGIENDO NOMBRES DE GASTOS COMPARTIDOS ====\n');
  
  try {
    // Obtener modelos
    const PersonalExpense = mongoose.model('PersonalExpense');
    const SharedSession = mongoose.model('SharedSession');
    
    // 1. Buscar todos los gastos compartidos
    const sharedExpenses = await PersonalExpense.find({
      $or: [
        { isFromSharedSession: true },
        { 'sessionReference.sessionId': { $ne: null } }
      ]
    });
    
    console.log(`Encontrados ${sharedExpenses.length} gastos compartidos para revisar`);
    
    // Crear un mapa de sesiones para no tener que consultar la base de datos por cada gasto
    const sessions = {};
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const expense of sharedExpenses) {
      try {
        // Verificar si el nombre contiene un guión (posible formato "nombre - mes año")
        if (expense.name && expense.name.includes(' - ')) {
          console.log(`\nGasto con nombre incorrecto: "${expense.name}"`);
          
          let correctName = '';
          
          // Si tiene sessionReference, obtener el nombre de la sesión
          if (expense.sessionReference && expense.sessionReference.sessionId) {
            const sessionId = expense.sessionReference.sessionId.toString();
            
            // Buscar la sesión en el mapa o en la base de datos
            if (!sessions[sessionId]) {
              const session = await SharedSession.findById(sessionId);
              if (session) {
                sessions[sessionId] = session.name;
              }
            }
            
            if (sessions[sessionId]) {
              correctName = sessions[sessionId];
            } else {
              // Si no podemos encontrar la sesión, simplemente quitamos la parte de la fecha
              correctName = expense.name.split(' - ')[0];
            }
          } else {
            // Si no tiene referencia a sesión, simplemente quitamos la parte de la fecha
            correctName = expense.name.split(' - ')[0];
          }
          
          console.log(`Cambiando nombre de "${expense.name}" a "${correctName}"`);
          
          // Actualizamos el nombre
          expense.name = correctName;
          await expense.save();
          
          fixedCount++;
          console.log(`Nombre corregido exitosamente: ${expense._id}`);
        }
      } catch (error) {
        console.error(`Error al procesar gasto ${expense._id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`\n==== RESUMEN ====`);
    console.log(`Total de gastos compartidos: ${sharedExpenses.length}`);
    console.log(`Nombres corregidos: ${fixedCount}`);
    console.log(`Errores: ${errorCount}`);
    
  } catch (error) {
    console.error('Error al corregir nombres de gastos:', error);
  }
};

// Función principal
const main = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();
    
    // Corregir los nombres
    await fixExpenseNames();
    
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