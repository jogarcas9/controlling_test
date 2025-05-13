const mongoose = require('mongoose');

// Configuración optimizada para entornos serverless (Vercel)
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 60000,
  serverSelectionTimeoutMS: 60000,
  socketTimeoutMS: 60000,
  // Para entornos serverless, establecer un tiempo máximo de conexión inactiva
  // que sea menor que el tiempo de inactividad de la función de Vercel
  maxIdleTimeMS: 10000, // 10 segundos para plan hobby
  heartbeatFrequencyMS: 5000, // Detectar cambios en la topología más rápido
  retryWrites: true,
  w: 'majority',
};

// Variable global para la conexión
let cachedConnection = null;

const connectDB = async () => {
  try {
    if (cachedConnection) {
      console.log('Usando conexión a MongoDB en caché');
      return true;
    }

    console.log('Intentando conectar a MongoDB con URI:', process.env.MONGODB_URI);
    
    // En lugar de almacenar la conexión, almacenamos la instancia de mongoose
    // Lo que evita problemas de conexión estancada en entornos serverless
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Base de datos actual: ${conn.connection.db.databaseName}`);
    
    // Guardar la conexión en caché
    cachedConnection = mongoose;
    
    // Evento para manejar errores de conexión
    mongoose.connection.on('error', (err) => {
      console.error('Error de conexión MongoDB:', err);
      // Resetear la conexión en caché para intentar reconectar en la próxima llamada
      cachedConnection = null;
    });
    
    // Evento para identificar cuándo la conexión se cierra
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB desconectado');
      // No resetear la conexión en caché aquí para evitar múltiples reconexiones
    });
    
    return true;
  } catch (error) {
    console.error(`Error de conexión MongoDB: ${error.message}`);
    // Resetear la conexión en caché para intentar reconectar en la próxima llamada
    cachedConnection = null;
    return false;
  }
};

const retryConnection = async (maxRetries = 5, delay = 5000) => {
  for (let i = 0; i < maxRetries; i++) {
    const connected = await connectDB();
    if (connected) return true;
    
    console.log(`Intento ${i + 1} fallido. Reintentando en ${delay/1000} segundos...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return false;
};

module.exports = { connectDB, retryConnection }; 