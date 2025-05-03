const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
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
    required: true,
    default: Date.now
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['personal', 'shared'],
    default: 'personal'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    share: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  }],
  notes: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPeriod: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: function() {
      return this.isRecurring;
    }
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ type: 1, date: -1 });
expenseSchema.index({ category: 1 });

// Método para calcular el total de gastos en un período
expenseSchema.statics.getTotalExpenses = async function(userId, startDate, endDate) {
  const total = await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);
  return total.length > 0 ? total[0].total : 0;
};

// Método para obtener gastos por categoría
expenseSchema.statics.getExpensesByCategory = async function(userId, startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { total: -1 }
    }
  ]);
};

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense; 