const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Email inválido']
    },
    name: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    responseDate: {
      type: Date,
      default: null
    }
  }],
  isLocked: {
    type: Boolean,
    default: true
  },
  expenses: [{
    description: String,
    amount: Number,
    date: Date,
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sharedWith: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      amount: Number
    }]
  }],
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar updatedAt antes de cada actualización
SessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Método para verificar si todos los participantes han aceptado
SessionSchema.methods.allParticipantsAccepted = function() {
  if (!this.participants || this.participants.length === 0) return true;
  return this.participants.every(participant => participant.status === 'accepted');
};

// Método para verificar si un usuario tiene participación pendiente
SessionSchema.methods.hasPendingParticipation = function(userId) {
  if (!userId || !this.participants) return false;
  
  return this.participants.some(participant => 
    (participant.user && participant.user.toString() === userId.toString()) && 
    participant.status === 'pending'
  );
};

module.exports = mongoose.model('Session', SessionSchema); 