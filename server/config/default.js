require('dotenv').config();

// Función para validar la URI de MongoDB
const validateMongoURI = (uri) => {
  if (!uri) return false;
  try {
    const mongoDBPattern = /^mongodb(\+srv)?:\/\/.+/;
    return mongoDBPattern.test(uri);
  } catch (error) {
    return false;
  }
};

// Obtener y validar la URI de MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/controlling';
if (!validateMongoURI(mongoURI)) {
  console.error('ERROR CRÍTICO: MONGODB_URI no es válida');
}

const config = {
  // Configuración de MongoDB
  mongoURI,
  mongodb: {
    uri: mongoURI,
    dataApiKey: process.env.MONGODB_DATA_API_KEY,
    appId: process.env.MONGODB_APP_ID,
    database: process.env.MONGODB_DATABASE || 'controlling'
  },
  jwtSecret: process.env.JWT_SECRET || 'mysecrettoken',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000
};

// Validación detallada de variables de entorno críticas
if (!config.mongodb.dataApiKey) {
  console.error('ERROR CRÍTICO: MONGODB_DATA_API_KEY no está configurada');
}

if (!config.mongodb.appId) {
  console.error('ERROR CRÍTICO: MONGODB_APP_ID no está configurada');
}

if (!validateMongoURI(config.mongoURI)) {
  console.error('ERROR CRÍTICO: MONGODB_URI no es válida');
}

if (!process.env.JWT_SECRET) {
  console.warn('ADVERTENCIA: JWT_SECRET no está configurada, usando valor por defecto');
}

// Log de configuración (sin información sensible)
console.log('Configuración cargada:', {
  nodeEnv: config.nodeEnv,
  dataApiConfigured: !!config.mongodb.dataApiKey && !!config.mongodb.appId,
  database: config.mongodb.database,
  mongoURIConfigured: validateMongoURI(config.mongoURI),
  jwtSecretConfigured: !!config.jwtSecret
});

module.exports = config; 