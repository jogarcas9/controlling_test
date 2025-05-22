const express = require('express');
const router = express.Router();

// Importar rutas
const authRoutes = require('./auth');
const sharedSessionRoutes = require('./shared-sessions');
const notificationRoutes = require('./notifications');

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de sesiones compartidas
router.use('/shared-sessions', sharedSessionRoutes);

// Rutas de notificaciones
router.use('/notifications', notificationRoutes);

module.exports = router; 