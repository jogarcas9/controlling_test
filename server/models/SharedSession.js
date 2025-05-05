const mongoose = require('mongoose');

// Función auxiliar para validar y formatear fechas
const validateAndFormatDate = (date) => {
  if (!date) return new Date();
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
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
  invitationDate: {
    type: Date,
    default: Date.now
  },
  responseDate: {
    type: Date
  },
  canEdit: {
    type: Boolean,
    default: false
  },
  canDelete: {
    type: Boolean,
    default: false
  }
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Definición del esquema de gastos como subdocumento
const expenseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: 'Gasto'
  },
  description: {
    type: String,
    default: ''
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  category: {
    type: String,
    default: 'Otros'
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const allocationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  }
});

const sharedSessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: null,
    required: false
  },
  participants: [participantSchema],
  expenses: [expenseSchema],
  totalAmount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'EUR'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: null,
    required: false
  },
  endDate: {
    type: Date,
    default: null,
    required: false
  },
  sessionType: {
    type: String,
    enum: ['single', 'permanent'],
    default: 'single'
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active'
  },
  isLocked: {
    type: Boolean,
    default: true
  },
  allocations: [allocationSchema]
}, {
  timestamps: true,
  toJSON: { 
    getters: true,
    transform: function(doc, ret) {
      // Convertir fechas a null
      ret.date = null;
      ret.startDate = null;
      ret.endDate = null;
      ret.createdAt = null;
      ret.updatedAt = null;
      
      // Para cada participante, establecer las fechas a null
      if (ret.participants && Array.isArray(ret.participants)) {
        ret.participants.forEach(p => {
          p.invitationDate = null;
          p.responseDate = null;
        });
      }
      
      return ret;
    }
  }
});

// Índices
sharedSessionSchema.index({ userId: 1 });
sharedSessionSchema.index({ 'participants.email': 1, '_id': 1 });
sharedSessionSchema.index({ 'participants.userId': 1, '_id': 1 });
sharedSessionSchema.index({ status: 1 });

// Middleware para asegurarse de que el creador siempre es un participante
sharedSessionSchema.pre('save', async function(next) {
  try {
    // Obtener el creador
    const creator = await mongoose.model('User').findById(this.userId);
    if (!creator) {
      throw new Error('Usuario creador no encontrado');
    }

    const creatorEmail = creator.email.toLowerCase();
    
    // Si es una nueva sesión, añadir al creador como participante con estado aceptado
    if (this.isNew) {
      console.log('Añadiendo al creador como participante en una nueva sesión');
      
      // Verificar si el creador ya está en la lista de participantes
      const creatorExists = this.participants.some(p => 
        p.email.toLowerCase() === creatorEmail
      );

      // Si no existe, añadirlo como primer participante
      if (!creatorExists) {
        console.log(`Añadiendo creador ${creator._id} (${creatorEmail}) como participante aceptado`);
        this.participants.unshift({
          userId: creator._id,
          email: creatorEmail,
          role: 'admin',
          name: creator.nombre || creator.email,
          status: 'accepted', // El creador siempre acepta automáticamente
          canEdit: true,
          canDelete: true,
          responseDate: new Date() // Con fecha de respuesta
        });
      } else {
        // Si ya existe, asegurarnos de que tiene estado "accepted"
        const creatorParticipant = this.participants.find(p => 
          p.email.toLowerCase() === creatorEmail
        );
        
        if (creatorParticipant && creatorParticipant.status !== 'accepted') {
          console.log(`Actualizando estado del creador ${creator._id} a 'accepted'`);
          creatorParticipant.status = 'accepted';
          creatorParticipant.responseDate = new Date(); // Con fecha de respuesta
        }
      }
      
      // Si no hay más participantes que el creador, desbloquear la sesión
      if (this.participants.length === 1) {
        this.isLocked = false;
      }
    } else {
      // Para sesiones existentes, asegurarse de que el creador siempre tiene estado 'accepted'
      const creatorParticipant = this.participants.find(p => 
        p.email.toLowerCase() === creatorEmail || 
        (p.userId && p.userId.toString() === this.userId.toString())
      );
      
      if (creatorParticipant && creatorParticipant.status !== 'accepted') {
        console.log(`Forzando estado 'accepted' para el creador en sesión existente`);
        creatorParticipant.status = 'accepted';
        
        if (!creatorParticipant.responseDate) {
          creatorParticipant.responseDate = new Date();
        }
      }
    }

    // Si el totalAmount ha cambiado y tenemos allocations
    if (this.isModified('totalAmount') && this.allocations && this.allocations.length > 0) {
      try {
        // Importar el servicio de asignaciones
        const allocationService = require('../services/allocationService');
        
        // Calcular y distribuir montos entre participantes
        console.log(`Pre-save: actualizando distribuciones para sesión ${this._id}`);
        
        // Usamos nextTick para hacer la asignación asincrónica (no bloquea el guardado)
        process.nextTick(async () => {
          try {
            await allocationService.distributeAmount(this);
            console.log(`Distribuciones actualizadas automáticamente para sesión ${this._id}`);
          } catch (error) {
            console.error(`Error al distribuir montos en middleware pre-save: ${error.message}`);
          }
        });
      } catch (error) {
        console.error(`Error en middleware pre-save: ${error.message}`);
        // No interrumpimos el guardado en caso de error en las distribuciones
      }
    }

    next();
  } catch (error) {
    console.error('Error en pre-save de SharedSession:', error);
    next(error);
  }
});

// Método para verificar si un usuario es participante
sharedSessionSchema.methods.isParticipant = function(userId) {
  return this.participants.some(p => 
    p.userId?.toString() === userId?.toString()
  );
};

// Método para obtener los permisos de un usuario
sharedSessionSchema.methods.getUserPermissions = function(userId) {
  const participant = this.participants.find(p => 
    p.userId?.toString() === userId?.toString()
  );
  if (!participant) return null;
  
  return {
    canEdit: participant.canEdit,
    canDelete: participant.canDelete,
    role: participant.role
  };
};

// Método para obtener la asignación de un usuario
sharedSessionSchema.methods.getUserAllocation = function(userId) {
  return this.allocations.find(a => a.userId.toString() === userId.toString());
};

// Método para verificar si todos los participantes han aceptado
sharedSessionSchema.methods.allParticipantsAccepted = function() {
  return this.participants.every(p => p.status === 'accepted');
};

// Método para actualizar el estado de la invitación de un participante
sharedSessionSchema.methods.updateParticipantStatus = function(userId, status) {
  const participant = this.participants.find(p => 
    p.userId?.toString() === userId?.toString()
  );
  
  if (participant) {
    participant.status = status;
    participant.responseDate = null; // Sin fecha de respuesta
    return true;
  }
  return false;
};

module.exports = mongoose.model('SharedSession', sharedSessionSchema);