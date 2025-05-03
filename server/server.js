require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { connectDB, retryConnection } = require('./config/mongodb');

const app = express();

// Logging en todos los ambientes
app.use(morgan('combined'));

// Configuración optimizada de CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'https://controling.vercel.app',
  'https://controling-jogarcas9.vercel.app'
];

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log('Origin bloqueado por CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Authorization'],
  credentials: true,
  maxAge: 600
};

app.use(cors(corsOptions));

// Aumentar límites de payload
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configurar timeouts más largos para requests
app.use((req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  next();
});

// Middlewares
app.use(helmet());
app.use(compression());

// Inicializar base de datos con reintentos
const initializeDatabase = async () => {
  try {
    console.log('Iniciando conexión a MongoDB Atlas...');
    
    // Intentar conexión con reintentos
    const isConnected = await retryConnection();
    
    if (!isConnected) {
      throw new Error('No se pudo establecer conexión después de varios intentos');
    }
    
    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

// Inicializar base de datos
initializeDatabase();

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = await connectDB();
  res.json({ 
    status: 'ok', 
    environment: process.env.NODE_ENV,
    database: dbStatus ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Rutas de la API
app.use('/api/users', require('./routes/api/users'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/personal-expenses', require('./routes/api/personal-expenses'));
app.use('/api/income', require('./routes/api/income'));
app.use('/api/reports', require('./routes/api/reports'));
app.use('/api/shared-sessions', require('./routes/api/shared-sessions'));

// Middleware para manejo de errores mejorado
app.use((err, req, res, next) => {
  console.error('[ERROR]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query
  });
  
  res.status(500).json({ 
    msg: 'Error en el servidor',
    error: err.message,
    path: req.path
  });
});

// Manejo de 404
app.use((req, res) => {
  console.log('404 Not Found:', req.path);
  res.status(404).json({ 
    message: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 peticiones por ventana
});
app.use(limiter);

// Si estamos en el entorno de Vercel, exportamos la app
// Si no, iniciamos el servidor
if (process.env.VERCEL) {
  module.exports = app;
} else {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}