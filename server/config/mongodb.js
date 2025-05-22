const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const environment = process.env.NODE_ENV || 'development';
    console.log(`Ambiente actual: ${environment}`);
    console.log('Intentando conectar a MongoDB...');
    
    const conn = await mongoose.connect(process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_URI_PRODUCTION 
      : process.env.MONGODB_URI_QUALITY, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Base de datos actual: ${conn.connection.db.databaseName}`);
    console.log(`Ambiente: ${environment}`);
    return true;
  } catch (error) {
    console.error(`Error de conexión: ${error.message}`);
    console.error(`Ambiente actual: ${process.env.NODE_ENV || 'development'}`);
    console.error('Por favor verifica las variables de entorno MONGODB_URI_PRODUCTION y MONGODB_URI_QUALITY');
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