/**
 * Script para probar la adición de un gasto y verificar la sincronización automática
 * 
 * Ejecutar: node server/scripts/testExpenseAddition.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Configurar la URI de MongoDB
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://jogarcas29:7JAw4tGRRjos9I8d@homeexpenses.acabyfv.mongodb.net/controlling_app';

// Importar modelos
let SharedSession, ParticipantAllocation, User, PersonalExpense;

// Función para inicializar la conexión y modelos
async function init() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB conectado...');

    // Cargar modelos
    SharedSession = require('../models/SharedSession');
    ParticipantAllocation = require('../models/ParticipantAllocation');
    User = require('../models/User');
    PersonalExpense = require('../models/PersonalExpense');
    console.log('Modelos cargados correctamente...');
  } catch (err) {
    console.error('Error al inicializar:', err);
    process.exit(1);
  }
}

// Función para añadir un gasto de prueba a una sesión compartida
async function addTestExpense() {
  try {
    console.log('Buscando sesión compartida activa...');
    
    // Buscar una sesión existente para pruebas
    const session = await SharedSession.findOne({ name: 'Hogar' });
    
    if (!session) {
      console.error('No se encontró la sesión de prueba "Hogar"');
      return;
    }
    
    console.log(`Sesión encontrada: ${session.name} (${session._id})`);
    
    // Verificar participantes
    if (!session.allocations || session.allocations.length === 0) {
      console.error('La sesión no tiene asignaciones de porcentajes');
      return;
    }
    
    // Obtener el primer participante para asignarle el gasto
    const firstParticipant = session.allocations[0];
    const paidBy = firstParticipant.userId;
    
    console.log(`Asignando gasto al participante: ${firstParticipant.name} (${paidBy})`);
    
    // Preparar datos del gasto
    const currentDate = new Date();
    const testExpense = {
      name: 'Gasto de prueba',
      description: 'Gasto creado desde el script de prueba',
      amount: 100, // monto de prueba
      date: currentDate,
      category: 'Prueba',
      paidBy: paidBy.toString(),
      isRecurring: false
    };
    
    console.log('Añadiendo gasto:', testExpense);
    
    // Usar el método del modelo para añadir el gasto
    await session.addExpense(testExpense);
    
    console.log('Gasto añadido correctamente');
    
    // Extraer año y mes del gasto
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    console.log(`Gasto agregado para año=${year}, mes=${month+1} (${month})`);
    
    // Buscar el servicio de asignaciones
    const allocationService = require('../services/allocationService');
    
    // Generar asignaciones mensuales para este año y mes
    console.log('Generando asignaciones mensuales...');
    const allocations = await allocationService.generateMonthlyAllocations(session, year, month);
    
    console.log(`Se generaron ${allocations.length} asignaciones`);
    
    // Verificar si se crearon los gastos personales correspondientes
    console.log('Verificando gastos personales creados...');
    
    // Esperar 2 segundos para permitir que los hooks asíncronos se completen
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const personalExpenses = await PersonalExpense.find({
      'sessionReference.sessionId': session._id,
      year: year,
      month: month
    });
    
    console.log(`Se encontraron ${personalExpenses.length} gastos personales para ${year}-${month+1}`);
    
    personalExpenses.forEach(expense => {
      console.log(`  - Usuario: ${expense.user}, cantidad: ${expense.amount}, nombre: ${expense.name}`);
    });
    
    console.log('\nPrueba completada con éxito');
    
  } catch (error) {
    console.error('Error durante la prueba:', error);
  }
}

// Ejecutar la prueba
async function run() {
  try {
    await init();
    await addTestExpense();
  } catch (error) {
    console.error('Error en la prueba:', error);
  } finally {
    // Cerrar conexión a MongoDB
    mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada');
  }
}

run(); 