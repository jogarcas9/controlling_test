const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const sharedSessionController = require('../../controllers/sharedSessionController');

// @route   GET api/shared-sessions
// @desc    Obtener todas las sesiones del usuario
// @access  Private
router.get('/', auth, sharedSessionController.getAllSessions);

// @route   POST api/shared-sessions
// @desc    Crear una nueva sesión compartida
// @access  Private
router.post('/', [
  auth,
  [
    check('name', 'El nombre es requerido').not().isEmpty(),
    check('participants', 'Los participantes deben ser un array').isArray(),
    check('description', 'La descripción es opcional').optional()
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
], sharedSessionController.createSession);

// @route   GET api/shared-sessions/:id
// @desc    Obtener detalles de una sesión
// @access  Private
router.get('/:id', auth, sharedSessionController.getSharedSessionDetails);

// @route   PUT api/shared-sessions/:id
// @desc    Actualizar una sesión
// @access  Private
router.put('/:id', auth, sharedSessionController.updateSession);

// @route   DELETE api/shared-sessions/:id
// @desc    Eliminar una sesión
// @access  Private
router.delete('/:id', auth, sharedSessionController.deleteSession);

// @route   POST api/shared-sessions/:id/respond
// @desc    Responder a una invitación (aceptar o rechazar)
// @access  Private
router.post('/:id/respond', auth, sharedSessionController.respondToInvitation);

// @route   POST api/shared-sessions/:id/invite
// @desc    Compatible con método anterior - redirige a respondToInvitation
// @access  Private
router.post('/:id/invite', auth, sharedSessionController.inviteParticipants);

// @route   POST api/shared-sessions/:id/sync-to-personal
// @desc    Sincronizar gastos compartidos a personales
// @access  Private
router.post('/:id/sync-to-personal', auth, sharedSessionController.syncToPersonal);

// @route   PUT api/shared-sessions/:id/update-distribution
// @desc    Actualizar la distribución de gastos
// @access  Private
router.put('/:id/update-distribution', auth, sharedSessionController.updateDistribution);

module.exports = router; 