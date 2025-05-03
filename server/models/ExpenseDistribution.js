const mongoose = require('mongoose');

const expenseDistributionSchema = new mongoose.Schema({
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
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  paidAt: {
    type: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Índices
expenseDistributionSchema.index({ expenseId: 1, userId: 1 }, { unique: true });
expenseDistributionSchema.index({ status: 1 });

const ExpenseDistribution = mongoose.model('ExpenseDistribution', expenseDistributionSchema);

module.exports = ExpenseDistribution; 