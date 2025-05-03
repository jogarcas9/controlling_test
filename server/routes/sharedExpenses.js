const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SharedExpense = require('../models/SharedExpense');

// @route   GET /api/shared-expenses
// @desc    Obtener todos los gastos compartidos del usuario
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const expenses = await SharedExpense.find({
      $or: [
        { owner: req.user.id },
        { 'participants.user': req.user.id }
      ]
    }).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   POST /api/shared-expenses
// @desc    Crear un nuevo gasto compartido
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { description, amount, category, date, participants } = req.body;

    const newExpense = new SharedExpense({
      description,
      amount,
      category,
      date,
      owner: req.user.id,
      participants: participants || []
    });

    const expense = await newExpense.save();
    res.json(expense);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   PUT /api/shared-expenses/:id
// @desc    Actualizar un gasto compartido
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { description, amount, category, date, participants } = req.body;
    const expense = await SharedExpense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ msg: 'Gasto no encontrado' });
    }

    if (expense.owner.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'No autorizado' });
    }

    expense.description = description;
    expense.amount = amount;
    expense.category = category;
    expense.date = date;
    if (participants) {
      expense.participants = participants;
    }

    await expense.save();
    res.json(expense);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   DELETE /api/shared-expenses/:id
// @desc    Eliminar un gasto compartido
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await SharedExpense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ msg: 'Gasto no encontrado' });
    }

    if (expense.owner.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'No autorizado' });
    }

    await expense.deleteOne();
    res.json({ msg: 'Gasto eliminado' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

module.exports = router; 