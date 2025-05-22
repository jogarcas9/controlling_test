const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Todas las rutas requieren autenticación
router.use(auth);

// Enviar notificaciones de invitación
router.post('/send-invitations', notificationController.sendInvitationNotifications);

// Obtener notificaciones pendientes
router.get('/pending', notificationController.getPendingNotifications);

// Marcar notificación como leída
router.put('/:id/read', notificationController.markAsRead);

module.exports = router; 