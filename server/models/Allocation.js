const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SharedSession',
    required: true
  },
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SharedExpense',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'EUR'
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'paid'],
    default: 'pending'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Índices para mejorar la eficiencia de las consultas
allocationSchema.index({ sessionId: 1, expenseId: 1 });
allocationSchema.index({ userId: 1, status: 1 });
allocationSchema.index({ expenseId: 1 });

const Allocation = mongoose.model('Allocation', allocationSchema);

module.exports = Allocation; 