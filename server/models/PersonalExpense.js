const mongoose = require('mongoose');

const personalExpenseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['expense', 'income'],
    default: 'expense'
  },
  paymentMethod: {
    type: String
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringDay: {
    type: Number
  },
  tags: [{
    type: String
  }],
  notes: {
    type: String
  },
  sessionReference: {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SharedSession'
    },
    sessionName: String,
    percentage: Number,
    isRecurringShare: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Índices
personalExpenseSchema.index({ user: 1 });
personalExpenseSchema.index({ date: 1 });
personalExpenseSchema.index({ category: 1 });
personalExpenseSchema.index({ type: 1 });
personalExpenseSchema.index({ 'sessionReference.sessionId': 1 });

const PersonalExpense = mongoose.model('PersonalExpense', personalExpenseSchema);

module.exports = PersonalExpense; 