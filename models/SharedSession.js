const mongoose = require('mongoose');

const sharedSessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  sessionType: {
    type: String,
    enum: ['single', 'permanent'],
    default: 'single'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    canEdit: {
      type: Boolean,
      default: false
    },
    canDelete: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    }
  }],
  yearlyExpenses: [{
    year: {
      type: Number,
      required: true
    },
    months: [{
      month: {
        type: Number,
        required: true,
        min: 0,
        max: 11
      },
      expenses: [{
        description: {
          type: String,
          required: true,
          trim: true
        },
        amount: {
          type: Number,
          required: true,
          min: 0
        },
        date: {
          type: Date,
          required: true
        },
        category: {
          type: String,
          required: true
        },
        paidBy: {
          type: String,
          required: true
        },
        attachments: [{
          url: String,
          name: String,
          type: String
        }]
      }],
      allocations: [{
        email: {
          type: String,
          required: true,
          lowercase: true
        },
        percentage: {
          type: Number,
          required: true,
          min: 0,
          max: 100
        },
        status: {
          type: String,
          enum: ['pending', 'accepted', 'rejected'],
          default: 'pending'
        }
      }],
      metadata: {
        isRecurring: {
          type: Boolean,
          default: false
        },
        originalConfig: {
          type: Map,
          of: mongoose.Schema.Types.Mixed
        }
      }
    }]
  }],
  recurringConfig: {
    percentagePerParticipant: {
      type: Number,
      min: 0,
      max: 100
    },
    participantsCount: {
      type: Number,
      min: 1
    },
    lastGeneratedMonth: {
      type: Number,
      min: 0,
      max: 11
    },
    lastGeneratedYear: {
      type: Number
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento
sharedSessionSchema.index({ 'participants.email': 1 });
sharedSessionSchema.index({ creator: 1 });
sharedSessionSchema.index({ createdAt: -1 });

// Middleware para actualizar lastUpdated
sharedSessionSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Método para verificar si un usuario tiene acceso a la sesión
sharedSessionSchema.methods.hasAccess = function(userEmail) {
  return this.participants.some(p => 
    p.email.toLowerCase() === userEmail.toLowerCase() && 
    p.status === 'accepted'
  );
};

// Método para verificar si un usuario puede editar la sesión
sharedSessionSchema.methods.canEdit = function(userEmail) {
  const participant = this.participants.find(p => 
    p.email.toLowerCase() === userEmail.toLowerCase()
  );
  return participant && participant.canEdit;
};

const SharedSession = mongoose.model('SharedSession', sharedSessionSchema);

module.exports = SharedSession; 