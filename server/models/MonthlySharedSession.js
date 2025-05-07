const mongoose = require('mongoose');

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
  },
  originalExpenseId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
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

const monthlySharedSessionSchema = new mongoose.Schema({
  // Referencia a la sesión compartida principal
  parentSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SharedSession',
    required: true
  },
  // Año y mes de esta instancia (por ejemplo: 2025-06 para junio 2025)
  yearMonth: {
    type: String,
    required: true,
    index: true
  },
  // Año y mes como números para facilitar consultas
  year: {
    type: Number,
    required: true,
    index: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
    index: true
  },
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
  allocations: [allocationSchema]
}, {
  timestamps: true
});

// Índices
monthlySharedSessionSchema.index({ parentSessionId: 1, yearMonth: 1 }, { unique: true });
monthlySharedSessionSchema.index({ userId: 1 });
monthlySharedSessionSchema.index({ 'participants.userId': 1 });

// Métodos para facilitar la búsqueda de instancias mensuales
monthlySharedSessionSchema.statics.findByYearMonth = function(parentSessionId, year, month) {
  const monthStr = month.toString().padStart(2, '0');
  const yearMonth = `${year}-${monthStr}`;
  
  return this.findOne({
    parentSessionId,
    yearMonth
  });
};

// Método para crear futuras instancias mensuales
monthlySharedSessionSchema.statics.createFutureInstances = async function(
  parentSession,
  startYear,
  startMonth,
  count = 12
) {
  const futureInstances = [];
  const existingInstances = await this.find({ parentSessionId: parentSession._id });
  
  // Crear mapa de instancias existentes para búsqueda rápida
  const existingMap = {};
  existingInstances.forEach(instance => {
    existingMap[instance.yearMonth] = instance;
  });
  
  // Generar o actualizar instancias futuras
  for (let i = 0; i < count; i++) {
    // Calcular año y mes para esta instancia
    const targetDate = new Date(startYear, startMonth - 1 + i, 1);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;
    const yearMonth = `${targetYear}-${targetMonth.toString().padStart(2, '0')}`;
    
    // Verificar si ya existe
    if (existingMap[yearMonth]) {
      // Actualizar la instancia existente
      const instance = existingMap[yearMonth];
      instance.name = parentSession.name;
      instance.description = parentSession.description;
      instance.participants = [...parentSession.participants];
      instance.allocations = [...parentSession.allocations];
      instance.currency = parentSession.currency;
      
      await instance.save();
      futureInstances.push(instance);
    } else {
      // Crear nueva instancia
      const newInstance = new this({
        parentSessionId: parentSession._id,
        yearMonth,
        year: targetYear,
        month: targetMonth,
        name: parentSession.name,
        description: parentSession.description,
        userId: parentSession.userId,
        participants: [...parentSession.participants],
        allocations: [...parentSession.allocations],
        currency: parentSession.currency,
        isActive: true
      });
      
      await newInstance.save();
      futureInstances.push(newInstance);
    }
  }
  
  return futureInstances;
};

const MonthlySharedSession = mongoose.model('MonthlySharedSession', monthlySharedSessionSchema);

module.exports = MonthlySharedSession; 