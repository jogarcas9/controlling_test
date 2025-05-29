const mongoose = require('mongoose');

const sharedExpenseSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SharedSession',
    required: true,
    index: true
  },
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
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Campos explícitos para año y mes para facilitar búsquedas
  year: {
    type: Number,
    index: true
  },
  month: {
    type: Number,
    min: 0,
    max: 11,
    index: true
  },
  createdBy: {
    type: String,
    required: true,
    trim: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  // Campo para indicar si es un gasto por período
  isPeriodic: {
    type: Boolean,
    default: false,
    index: true
  },
  // Campos para el rango de fechas del gasto por período
  periodStartDate: {
    type: Date,
    required: function() {
      return this.isPeriodic === true;
    }
  },
  periodEndDate: {
    type: Date,
    required: function() {
      return this.isPeriodic === true;
    }
  },
  // Campos para el control de versiones y auditoría
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Campo para almacenar las asignaciones de gastos a participantes
  allocations: [{
    participantId: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    }
  }]
});

// Índices
sharedExpenseSchema.index({ sessionId: 1, year: 1, month: 1 });
sharedExpenseSchema.index({ isPeriodic: 1 });
sharedExpenseSchema.index({ isRecurring: 1 });
sharedExpenseSchema.index({ sessionId: 1, isPeriodic: 1 });
sharedExpenseSchema.index({ sessionId: 1, isRecurring: 1 });

// Middleware pre-save para validar gastos periódicos
sharedExpenseSchema.pre('save', function(next) {
  if (this.isPeriodic) {
    if (!this.periodStartDate || !this.periodEndDate) {
      next(new Error('Los gastos periódicos requieren fechas de inicio y fin'));
    }
    
    if (this.periodStartDate > this.periodEndDate) {
      next(new Error('La fecha de inicio debe ser anterior a la fecha de fin'));
    }
  }
  next();
});

module.exports = mongoose.model('SharedExpense', sharedExpenseSchema); 