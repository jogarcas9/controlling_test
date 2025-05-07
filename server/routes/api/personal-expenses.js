const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const auth = require('../../middleware/auth');
const { PersonalExpense, Category } = require('../../models');

// @route   GET api/personal-expenses/monthly
// @desc    Obtener gastos personales del mes actual
// @access  Private
router.get('/monthly', auth, async (req, res) => {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    console.log(`Buscando gastos mensuales para usuario ${req.user.id} entre ${firstDayOfMonth.toISOString()} y ${lastDayOfMonth.toISOString()}`);

    const expenses = await PersonalExpense.find({
      user: req.user.id,
      date: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth
      }
    }).sort({ date: -1 });

    console.log(`Se encontraron ${expenses.length} gastos personales para el mes actual`);
    
    // Formatear respuesta para debug
    const expensesSummary = expenses.map(exp => ({
      _id: exp._id,
      name: exp.name,
      description: exp.description,
      amount: exp.amount,
      date: exp.date
    }));
    console.log('Resumen de gastos encontrados:', JSON.stringify(expensesSummary, null, 2));
    
    res.json(expenses);
  } catch (err) {
    console.error('Error al obtener gastos mensuales:', err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   GET api/personal-expenses/generate-shared-month
// @desc    Generar resumen de gastos compartidos del mes
// @access  Private
router.get('/generate-shared-month', auth, async (req, res) => {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const expenses = await PersonalExpense.find({
      user: req.user.id,
      type: 'shared',
      date: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth
      }
    }).sort({ date: -1 });

    // Aquí podrías agregar lógica adicional para procesar los gastos compartidos
    const summary = {
      total: expenses.reduce((sum, exp) => sum + exp.amount, 0),
      count: expenses.length,
      byCategory: expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
        return acc;
      }, {}),
      expenses
    };

    res.json(summary);
  } catch (err) {
    console.error('Error al generar resumen de gastos compartidos:', err.message);
    res.status(500).send('Error del servidor');
  }
});

// @route   GET api/personal-expenses
// @desc    Obtener gastos personales filtrados por mes y año
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    console.log('Solicitud de gastos personales con filtros:', { month, year, userId: req.user.id });

    if (!month || !year) {
      return res.status(400).json({ msg: 'Se requieren los parámetros month y year' });
    }

    // Convertir los parámetros a números
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Validar que son números válidos
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12 || isNaN(yearNum)) {
      return res.status(400).json({ msg: 'Parámetros month y year deben ser números válidos' });
    }

    // Crear fechas de inicio y fin del mes
    const firstDayOfMonth = new Date(yearNum, monthNum - 1, 1);
    const lastDayOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

    console.log(`Buscando gastos para usuario ${req.user.id} entre ${firstDayOfMonth.toISOString()} y ${lastDayOfMonth.toISOString()}`);

    // Buscar gastos en el rango de fechas
    const expenses = await PersonalExpense.find({
      user: req.user.id,
      date: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth
      }
    }).sort({ date: -1 });

    console.log(`Se encontraron ${expenses.length} gastos para el período seleccionado`);
    
    // Formatear respuesta para debug
    if (expenses.length > 0) {
      const expensesSummary = expenses.map(exp => ({
        _id: exp._id,
        name: exp.name,
        description: exp.description,
        amount: exp.amount,
        date: exp.date,
        allocationId: exp.allocationId
      }));
      console.log('Resumen de gastos encontrados:', JSON.stringify(expensesSummary, null, 2));
    }
    
    res.json(expenses);
  } catch (err) {
    console.error('Error al obtener gastos filtrados:', err.message);
    res.status(500).json({ msg: 'Error del servidor', error: err.message });
  }
});

// @route   POST api/personal-expenses
// @desc    Crear un nuevo gasto personal
// @access  Private
router.post('/',
  auth,
  [
    check('name', 'El nombre es obligatorio').not().isEmpty(),
    check('amount', 'El monto es obligatorio').not().isEmpty(),
    check('type', 'El tipo es obligatorio').isIn(['expense', 'income']),
    check('date', 'La fecha es obligatoria').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, description, amount, category, date, type, isRecurring, recurringDay, tags, recurringMonths = 12 } = req.body;

      // Validar datos requeridos
      if (!name || !amount || !category) {
        return res.status(400).json({ msg: 'Se requieren nombre, monto y categoría' });
      }

      // Fecha base para el gasto
      const baseDate = date ? new Date(date) : new Date();
      
      // Crear el gasto actual
      const newExpense = new PersonalExpense({
        user: req.user.id,
        name,
        description,
        amount,
        category,
        date: baseDate,
        type: type || 'expense',
        isRecurring: isRecurring || false,
        recurringDay: recurringDay || (baseDate.getDate()),
        tags
      });

      // Guardar el gasto inicial
      const createdExpense = await newExpense.save();
      console.log(`Gasto creado: ${createdExpense._id}, recurrente: ${isRecurring}`);
      
      // Si es recurrente, crear instancias para meses futuros
      if (isRecurring) {
        console.log(`Creando ${recurringMonths} instancias recurrentes para el gasto ${createdExpense._id}`);
        const recurringExpenses = [];
        
        // Determinar el día de recurrencia (usar el día especificado o el día del mes de la fecha original)
        const effectiveRecurringDay = recurringDay || baseDate.getDate();
        
        // Crear instancias para los meses futuros (hasta 12 meses por defecto)
        for (let i = 1; i <= recurringMonths; i++) {
          // Calcular la fecha para el mes futuro
          const futureDate = new Date(baseDate);
          futureDate.setMonth(futureDate.getMonth() + i);
          
          // Ajustar al día de recurrencia, manejando meses con menos días
          const maxDayInMonth = new Date(futureDate.getFullYear(), futureDate.getMonth() + 1, 0).getDate();
          futureDate.setDate(Math.min(effectiveRecurringDay, maxDayInMonth));
          
          // Crear la instancia recurrente
          const recurringExpense = new PersonalExpense({
            user: req.user.id,
            name,
            description,
            amount,
            category,
            date: futureDate,
            type: type || 'expense',
            isRecurring: true,
            recurringDay: effectiveRecurringDay,
            tags,
            // Vincular con el gasto original para facilitar actualizaciones futuras
            originalExpenseId: createdExpense._id
          });
          
          recurringExpenses.push(recurringExpense);
        }
        
        // Guardar todas las instancias recurrentes
        if (recurringExpenses.length > 0) {
          await PersonalExpense.insertMany(recurringExpenses);
          console.log(`${recurringExpenses.length} instancias recurrentes creadas`);
        }
      }
      
      // Notificar a los clientes del cambio
      const io = req.app.get('io');
      if (io) {
        // Notificar al usuario específico
        io.to(`user-${req.user.id}`).emit('expense-added', { 
          _id: createdExpense._id,
          name: createdExpense.name,
          amount: createdExpense.amount,
          date: createdExpense.date
        });
        
        // Notificación general para todos
        io.emit('data-update', { 
          type: 'personal-expense', 
          action: 'create',
          userId: req.user.id
        });
        
        // Enviar notificación
        io.to(`user-${req.user.id}`).emit('notification', {
          message: `Gasto "${createdExpense.name}" añadido correctamente`,
          severity: 'success',
          updateTime: true
        });
      }
      
      // Devolver el gasto creado inicialmente
      res.status(201).json(createdExpense);
    } catch (err) {
      console.error('Error al crear gasto personal:', err.message);
      res.status(500).json({ msg: 'Error del servidor', error: err.message });
    }
  }
);

// @route   PUT api/personal-expenses/:id
// @desc    Actualizar un gasto personal
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, amount, category, date, type, isRecurring, recurringDay, tags, updateFuture = true } = req.body;

    // Buscar gasto existente
    const expense = await PersonalExpense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ msg: 'Gasto no encontrado' });
    }

    // Verificar que el gasto pertenece al usuario
    if (expense.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'No autorizado' });
    }

    // Verificar si el gasto está vinculado a una asignación
    if (expense.allocationId) {
      return res.status(400).json({ 
        msg: 'No se puede modificar un gasto vinculado a una asignación de sesión compartida',
        details: 'Este gasto fue creado automáticamente por una asignación de sesión compartida y no puede ser modificado directamente'
      });
    }

    // Actualizar campos
    if (name) expense.name = name;
    if (description !== undefined) expense.description = description;
    if (amount) expense.amount = amount;
    if (category) expense.category = category;
    if (date) expense.date = new Date(date);
    if (type) expense.type = type;
    if (isRecurring !== undefined) expense.isRecurring = isRecurring;
    if (recurringDay) expense.recurringDay = recurringDay;
    if (tags) expense.tags = tags;

    const updatedExpense = await expense.save();
    console.log(`Gasto actualizado: ${updatedExpense._id}, recurrente: ${updatedExpense.isRecurring}`);

    // Si el gasto es recurrente y el usuario desea actualizar gastos futuros
    if (isRecurring && updateFuture) {
      // Fecha actual para comparar, usamos el primer día del mes actual para asegurarnos que
      // las actualizaciones afecten al mes actual (el gasto que acabamos de actualizar) y a los futuros
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Buscar todos los gastos relacionados que sean del mes actual o futuros
      // Pueden estar vinculados al gasto actual o compartir el mismo original
      const idsToMatch = [updatedExpense._id];
      if (updatedExpense.originalExpenseId) {
        idsToMatch.push(updatedExpense.originalExpenseId);
      }
      
      console.log(`Actualizando gastos recurrentes futuros relacionados con IDs: ${idsToMatch.join(', ')}`);
      
      const relatedExpenses = await PersonalExpense.find({
        user: req.user.id,
        $or: [
          { originalExpenseId: { $in: idsToMatch } },
          { _id: { $in: idsToMatch } }
        ],
        date: { $gte: currentMonthStart }
      });
      
      console.log(`Encontrados ${relatedExpenses.length} gastos recurrentes relacionados`);
      
      // Actualizar cada gasto futuro, excluyendo el que acabamos de actualizar
      for (const relatedExpense of relatedExpenses) {
        if (relatedExpense._id.toString() === updatedExpense._id.toString()) {
          continue; // Saltarse el gasto que ya actualizamos
        }
        
        // Actualizar campos pero mantener la fecha original
        if (name) relatedExpense.name = name;
        if (description !== undefined) relatedExpense.description = description;
        if (amount) relatedExpense.amount = amount;
        if (category) relatedExpense.category = category;
        if (type) relatedExpense.type = type;
        if (tags) relatedExpense.tags = tags;
        
        // Mantener o actualizar la recurrencia
        relatedExpense.isRecurring = isRecurring;
        if (recurringDay) {
          // Si se cambia el día de recurrencia, ajustar la fecha del gasto futuro
          relatedExpense.recurringDay = recurringDay;
          
          // Ajustar el día del mes, respetando el límite de días del mes
          const currentDate = new Date(relatedExpense.date);
          const maxDaysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          const newDay = Math.min(recurringDay, maxDaysInMonth);
          
          // Crear nueva fecha manteniendo año y mes, pero cambiando el día
          const newDate = new Date(currentDate);
          newDate.setDate(newDay);
          relatedExpense.date = newDate;
        }
        
        await relatedExpense.save();
        console.log(`Gasto recurrente actualizado: ${relatedExpense._id}`);
      }
    }
    
    // Notificar a los clientes del cambio
    const io = req.app.get('io');
    if (io) {
      // Notificar al usuario específico
      io.to(`user-${req.user.id}`).emit('expense-updated', { 
        _id: updatedExpense._id,
        name: updatedExpense.name,
        amount: updatedExpense.amount,
        date: updatedExpense.date
      });
      
      // Notificación general
      io.emit('data-update', { 
        type: 'personal-expense', 
        action: 'update',
        userId: req.user.id
      });
      
      // Enviar notificación
      io.to(`user-${req.user.id}`).emit('notification', {
        message: `Gasto "${updatedExpense.name}" actualizado correctamente`,
        severity: 'success',
        updateTime: true
      });
    }
    
    res.json(updatedExpense);
  } catch (err) {
    console.error('Error al actualizar gasto personal:', err.message);
    res.status(500).json({ msg: 'Error del servidor', error: err.message });
  }
});

// @route   DELETE api/personal-expenses/:id
// @desc    Eliminar un gasto personal
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    // Parámetros opcionales para controlar el comportamiento de eliminación
    const { deleteAllRecurring = false, deleteFutureOnly = true } = req.query;
    
    // Buscar gasto existente
    const expense = await PersonalExpense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ msg: 'Gasto no encontrado' });
    }

    // Verificar que el gasto pertenece al usuario
    if (expense.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'No autorizado' });
    }

    // Verificar si el gasto está vinculado a una asignación
    if (expense.allocationId) {
      return res.status(400).json({ 
        msg: 'No se puede eliminar un gasto vinculado a una asignación de sesión compartida',
        details: 'Este gasto fue creado automáticamente por una asignación de sesión compartida y no puede ser eliminado directamente'
      });
    }

    // Si el gasto es recurrente y se solicitó eliminar todas las instancias
    if (expense.isRecurring && deleteAllRecurring === 'true') {
      console.log(`Eliminando todas las instancias recurrentes del gasto ${expense._id}`);
      
      // Determinar la fecha límite para la eliminación
      const now = new Date();
      let dateFilter = {};
      
      if (deleteFutureOnly === 'true') {
        // Solo eliminar recurrencias futuras (incluyendo el mes actual)
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { date: { $gte: currentMonthStart } };
      }
      
      // Identificar todos los gastos relacionados
      const idsToMatch = [expense._id];
      if (expense.originalExpenseId) {
        idsToMatch.push(expense.originalExpenseId);
      }
      
      // Eliminar todas las recurrencias relacionadas
      const deleteResult = await PersonalExpense.deleteMany({
        user: req.user.id,
        $or: [
          { originalExpenseId: { $in: idsToMatch } },
          { _id: { $in: idsToMatch } }
        ],
        ...dateFilter
      });
      
      console.log(`Eliminadas ${deleteResult.deletedCount} instancias recurrentes`);
      
      res.json({ 
        msg: 'Gastos recurrentes eliminados',
        count: deleteResult.deletedCount
      });
    } else {
      // Eliminar solo el gasto específico
      await PersonalExpense.findByIdAndDelete(req.params.id);
      console.log(`Gasto eliminado: ${expense._id}`);
      
      res.json({ msg: 'Gasto eliminado' });
    }

    // Notificar a los clientes del cambio
    const io = req.app.get('io');
    if (io) {
      // Notificar al usuario específico
      io.to(`user-${req.user.id}`).emit('expense-deleted', { 
        _id: expense._id
      });
      
      // Notificación general
      io.emit('data-update', { 
        type: 'personal-expense', 
        action: 'delete',
        userId: req.user.id
      });
      
      // Enviar notificación
      io.to(`user-${req.user.id}`).emit('notification', {
        message: `Gasto "${expense.name}" eliminado correctamente`,
        severity: 'info',
        updateTime: true
      });
    }
  } catch (err) {
    console.error('Error al eliminar gasto personal:', err.message);
    res.status(500).json({ msg: 'Error del servidor', error: err.message });
  }
});

module.exports = router; 