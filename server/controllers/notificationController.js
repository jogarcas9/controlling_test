const Notification = require('../models/Notification');
const User = require('../models/User');
const SharedSession = require('../models/SharedSession');

// Enviar notificaciones de invitación
exports.sendInvitationNotifications = async (req, res) => {
  try {
    const { sessionId, participants } = req.body;

    // Verificar que la sesión existe
    const session = await SharedSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Sesión no encontrada' });
    }

    // Crear notificaciones para cada participante
    const notificationPromises = participants.map(async (participant) => {
      // Buscar si el usuario ya existe
      let user = await User.findOne({ email: participant.email.toLowerCase() });
      
      // Crear la notificación
      const notification = new Notification({
        type: 'invitation',
        recipient: user ? user._id : null,
        recipientEmail: participant.email.toLowerCase(),
        sender: req.user.id,
        sessionId: session._id,
        message: `Has sido invitado a participar en la sesión compartida "${session.name}"`,
        status: 'pending'
      });

      // Guardar la notificación
      await notification.save();
      return notification;
    });

    const notifications = await Promise.all(notificationPromises);

    res.json({ message: 'Notificaciones enviadas con éxito', notifications });
  } catch (error) {
    console.error('Error al enviar notificaciones:', error);
    res.status(500).json({ message: 'Error al enviar notificaciones' });
  }
};

// Obtener notificaciones pendientes
exports.getPendingNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { recipient: req.user.id },
        { recipientEmail: req.user.email }
      ],
      status: 'pending'
    })
    .populate('sender', 'nombre email')
    .populate('sessionId', 'name');

    res.json(notifications);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ message: 'Error al obtener notificaciones' });
  }
};

// Marcar notificación como leída
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }

    // Verificar que el usuario es el destinatario
    if (notification.recipient?.toString() !== req.user.id && 
        notification.recipientEmail !== req.user.email) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    notification.status = 'read';
    notification.readDate = new Date();
    await notification.save();

    res.json(notification);
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(500).json({ message: 'Error al marcar notificación' });
  }
}; 