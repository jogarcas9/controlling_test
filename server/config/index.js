require('dotenv').config();

module.exports = {
  // Configuración de la base de datos
  mongoURI: process.env.NODE_ENV === 'production' 
    ? process.env.MONGODB_URI_PRODUCTION 
    : process.env.MONGODB_URI_QUALITY || 'mongodb://localhost:27017/controlling_app',
  
  // Configuración del servidor
  port: process.env.PORT || 5000,
  
  // Configuración de JWT
  jwtSecret: process.env.JWT_SECRET || 'xJ3!k9$mP2#nQ7@vR4*tL8%wY5&zU6',
  
  // Configuración de cors
  corsOrigin: process.env.CORS_ORIGIN || '*',
  corsAllowedDomains: [
    'http://localhost:3000', 
    'https://controling-client.vercel.app',
    'https://controling-v3-b33cnejyd-jogarcas9s-projects.vercel.app',
    /\.vercel\.app$/
  ],
  
  // Otras configuraciones
  env: process.env.NODE_ENV || 'development',
  
  // Configuración de límites de API
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // límite de 100 peticiones por ventana por IP
  }
}; 