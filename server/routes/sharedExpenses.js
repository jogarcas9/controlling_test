const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SharedExpense = require('../models/SharedExpense');

// @route   GET /api/shared-expenses
// @desc    Obtener todos los gastos compartidos del usuario
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Verificar si hay parámetros de filtro por mes
    const { month, year } = req.query;
    let dateFilter = {};
    
    if (month && year) {
      // Si se especifican mes y año, filtrar por ese período
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      if (!isNaN(monthNum) && !isNaN(yearNum) && monthNum >= 1 && monthNum <= 12) {
        const firstDayOfMonth = new Date(yearNum, monthNum - 1, 1);
        const lastDayOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
        
        console.log(`Filtrando gastos compartidos entre ${firstDayOfMonth.toISOString()} y ${lastDayOfMonth.toISOString()}`);
        
        dateFilter = {
          date: {
            $gte: firstDayOfMonth,
            $lte: lastDayOfMonth
          }
        };
      }
    }
    
    const expenses = await SharedExpense.find({
      $or: [
        { owner: req.user.id },
        { 'participants.user': req.user.id }
      ],
      ...dateFilter
    }).sort({ date: -1 });
    
    // Registrar información sobre los gastos encontrados
    console.log(`Encontrados ${expenses.length} gastos compartidos para el usuario ${req.user.id}`);
    if (expenses.length > 0) {
      console.log('Ejemplo del primer gasto encontrado:');
      console.log(`ID: ${expenses[0]._id}, Fecha: ${expenses[0].date}, Monto: ${expenses[0].amount}`);
    }
    
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

    // Asegurar que la fecha sea válida
    let validDate;
    if (date) {
      validDate = new Date(date);
      // Verificar si la fecha es válida
      if (isNaN(validDate.getTime())) {
        validDate = new Date(); // Si la fecha es inválida, usar la fecha actual
      }
    } else {
      validDate = new Date(); // Si no hay fecha, usar la fecha actual
    }
    
    console.log(`Creando gasto compartido con fecha: ${validDate.toISOString()}`);

    const newExpense = new SharedExpense({
      description,
      amount,
      category,
      date: validDate,
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