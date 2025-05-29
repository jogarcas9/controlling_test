const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SharedSession',
    required: true
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  type: {
    type: String,
    enum: ['session'],
    default: 'session'
  },
  responseDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para mejorar el rendimiento de las búsquedas
invitationSchema.index({ sessionId: 1, to: 1, status: 1 });
invitationSchema.index({ to: 1, status: 1 });
invitationSchema.index({ from: 1 });
invitationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Invitation', invitationSchema); 