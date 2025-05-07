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

const monthlyExpensesSchema = new mongoose.Schema({
  month: {
    type: Number,
    required: true,
    min: 0,
    max: 11
  },
  expenses: [expenseSchema],
  totalAmount: {
    type: Number,
    default: 0
  }
});

const yearlyExpensesSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true
  },
  months: [monthlyExpensesSchema]
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
  yearlyExpenses: [yearlyExpensesSchema],
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
          status: 'accepted',
          canEdit: true,
          canDelete: true,
          responseDate: new Date()
        });
      } else {
        // Si ya existe, asegurarnos de que tiene estado "accepted"
        const creatorParticipant = this.participants.find(p => 
          p.email.toLowerCase() === creatorEmail
        );
        
        if (creatorParticipant && creatorParticipant.status !== 'accepted') {
          console.log(`Actualizando estado del creador ${creator._id} a 'accepted'`);
          creatorParticipant.status = 'accepted';
          creatorParticipant.responseDate = new Date();
        }
      }
      
      // Si no hay más participantes que el creador, desbloquear la sesión
      if (this.participants.length === 1) {
        this.isLocked = false;
      }

      // Inicializar la estructura de años y meses para los próximos 3 años
      this.initializeYearlyExpenses();
    }

    // Si hay gastos nuevos o modificados, organizarlos en la estructura de años y meses
    if (this.isModified('expenses')) {
      await this.organizeExpenses();
    }

    // Si el totalAmount ha cambiado y tenemos allocations
    if (this.isModified('totalAmount') && this.allocations && this.allocations.length > 0) {
      try {
        const allocationService = require('../services/allocationService');
        console.log(`Pre-save: actualizando distribuciones para sesión ${this._id}`);
        
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
      }
    }

    next();
  } catch (error) {
    console.error('Error en pre-save de SharedSession:', error);
    next(error);
  }
});

// Método para inicializar la estructura de años y meses
sharedSessionSchema.methods.initializeYearlyExpenses = function() {
  const currentYear = new Date().getFullYear();
  this.yearlyExpenses = [];

  // Crear estructura para los próximos 3 años
  for (let year = currentYear; year < currentYear + 3; year++) {
    const yearData = {
      year: year,
      months: Array.from({ length: 12 }, (_, i) => ({
        month: i, // Cambio aquí: usar 0-indexed (0-11) para los meses
        expenses: [],
        totalAmount: 0
      }))
    };
    this.yearlyExpenses.push(yearData);
  }
};

// Método para organizar los gastos en la estructura de años y meses
sharedSessionSchema.methods.organizeExpenses = async function() {
  // Reinicializar la estructura de años y meses
  this.initializeYearlyExpenses();

  // Organizar cada gasto en su mes correspondiente
  for (const expense of this.expenses) {
    const expenseDate = new Date(expense.date);
    const year = expenseDate.getFullYear();
    const month = expenseDate.getMonth(); // 0-indexed (0-11)

    // Encontrar o crear el año correspondiente
    let yearData = this.yearlyExpenses.find(y => y.year === year);
    if (!yearData) {
      yearData = {
        year: year,
        months: Array.from({ length: 12 }, (_, i) => ({
          month: i, // 0-indexed (0-11)
          expenses: [],
          totalAmount: 0
        }))
      };
      this.yearlyExpenses.push(yearData);
    }

    // Encontrar el mes correspondiente
    const monthData = yearData.months.find(m => m.month === month);
    if (monthData) {
      // Verificar si el gasto ya existe en el mes
      const existingExpense = monthData.expenses.find(e => e._id.toString() === expense._id.toString());
      if (!existingExpense) {
        monthData.expenses.push(expense);
        monthData.totalAmount += expense.amount;
      }
    }

    // Si el gasto es recurrente, crear instancias futuras
    if (expense.isRecurring) {
      const currentDate = new Date(expense.date);
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 3); // 3 años en el futuro

      while (currentDate < endDate) {
        currentDate.setMonth(currentDate.getMonth() + 1);
        const futureYear = currentDate.getFullYear();
        const futureMonth = currentDate.getMonth(); // 0-indexed (0-11)

        // Encontrar o crear el año futuro
        let futureYearData = this.yearlyExpenses.find(y => y.year === futureYear);
        if (!futureYearData) {
          futureYearData = {
            year: futureYear,
            months: Array.from({ length: 12 }, (_, i) => ({
              month: i, // 0-indexed (0-11)
              expenses: [],
              totalAmount: 0
            }))
          };
          this.yearlyExpenses.push(futureYearData);
        }

        // Encontrar el mes futuro
        const futureMonthData = futureYearData.months.find(m => m.month === futureMonth);
        if (futureMonthData) {
          // Crear una copia del gasto para el mes futuro
          const futureExpense = {
            ...expense.toObject(),
            _id: new mongoose.Types.ObjectId(),
            date: new Date(currentDate)
          };
          futureMonthData.expenses.push(futureExpense);
          futureMonthData.totalAmount += expense.amount;
        }
      }
    }
  }
};

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
  if (!this.participants || this.participants.length === 0) return true;
  
  return this.participants.every(p => 
    p.status === 'accepted' || 
    (p.userId && this.userId && p.userId.toString() === this.userId.toString())
  );
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

// Método para obtener o crear el año actual
sharedSessionSchema.methods.getOrCreateYear = function() {
  const currentYear = new Date().getFullYear();
  let yearData = this.yearlyExpenses.find(y => y.year === currentYear);
  
  if (!yearData) {
    yearData = {
      year: currentYear,
      months: Array.from({ length: 12 }, (_, i) => ({
        month: i, // 0-indexed (0-11)
        expenses: [],
        totalAmount: 0
      }))
    };
    this.yearlyExpenses.push(yearData);
  }
  
  return yearData;
};

// Método para añadir un gasto (puntual o recurrente) a yearlyExpenses
sharedSessionSchema.methods.addExpense = async function(expense) {
  // Asegurar que la fecha sea un objeto Date válido
  let expenseDate;
  if (expense.date) {
    // Parsear la fecha en formato ISO o string
    if (typeof expense.date === 'string') {
      // Si es un string ISO, extraer los componentes de fecha explícitamente
      // para evitar problemas de zona horaria
      const dateParts = expense.date.split('T')[0].split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Meses en JS son 0-indexed
        const day = parseInt(dateParts[2]);
        expenseDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        console.log(`Fecha ISO parseada: ${expense.date} -> ${expenseDate.toISOString()}`);
      } else {
        // Si no podemos parsear el formato ISO, intentar con el constructor Date normal
        expenseDate = new Date(expense.date);
      }
    } else if (expense.date instanceof Date) {
      expenseDate = new Date(expense.date);
    } else {
      expenseDate = new Date();
    }
  } else {
    expenseDate = new Date();
  }
  
  // Verificar si la fecha es válida
  if (isNaN(expenseDate.getTime())) {
    console.error('Fecha inválida, usando fecha actual');
    expenseDate = new Date();
  }
  
  // Extraer año y mes explícitamente desde la fecha original
  // en lugar de depender de una conversión que pueda ser afectada por la zona horaria
  const year = expenseDate.getUTCFullYear();
  const month = expenseDate.getUTCMonth(); // 0-indexed (0-11)
  
  console.log(`Añadiendo gasto para fecha: ${expenseDate.toISOString()}, año: ${year}, mes: ${month}`);

  // Limpiar y asegurar los campos del gasto
  const cleanExpense = {
    name: expense.name || 'Gasto',
    description: expense.description || '',
    amount: typeof expense.amount === 'number' ? expense.amount : Number(expense.amount) || 0,
    date: expenseDate,
    category: expense.category || 'Otros',
    paidBy: expense.paidBy,
    isRecurring: !!expense.isRecurring
  };

  // Encontrar o crear el año correspondiente
  let yearData = this.yearlyExpenses.find(y => y.year === year);
  if (!yearData) {
    yearData = {
      year: year,
      months: Array.from({ length: 12 }, (_, i) => ({
        month: i, // 0-indexed (0-11)
        expenses: [],
        totalAmount: 0
      }))
    };
    this.yearlyExpenses.push(yearData);
  }

  // Encontrar el mes correspondiente
  const monthData = yearData.months.find(m => m.month === month);
  if (monthData) {
    monthData.expenses.push(cleanExpense);
    monthData.totalAmount += cleanExpense.amount;
    console.log(`Gasto añadido al mes ${month} (${getMonthName(month)}) del año ${year}`);
  } else {
    console.error(`No se encontró el mes ${month} en el año ${year}`);
  }

  // Si es recurrente, crear instancias futuras hasta 3 años
  if (cleanExpense.isRecurring) {
    // Usar UTC para evitar problemas de zona horaria
    const originalDate = new Date(Date.UTC(
      expenseDate.getUTCFullYear(),
      expenseDate.getUTCMonth(),
      expenseDate.getUTCDate()
    ));
    const endDate = new Date(Date.UTC(
      expenseDate.getUTCFullYear() + 3,
      expenseDate.getUTCMonth(),
      expenseDate.getUTCDate()
    ));
    
    let i = 1;
    while (true) {
      // Crear una fecha para el mes siguiente usando UTC
      const futureDate = new Date(Date.UTC(
        originalDate.getUTCFullYear(),
        originalDate.getUTCMonth() + i,
        originalDate.getUTCDate()
      ));
      
      if (futureDate > endDate) break;
      
      const futureYear = futureDate.getUTCFullYear();
      const futureMonth = futureDate.getUTCMonth(); // 0-indexed (0-11)
      
      console.log(`Creando gasto recurrente: ${futureDate.toISOString()}, año: ${futureYear}, mes: ${futureMonth} (${getMonthName(futureMonth)})`);
      
      let futureYearData = this.yearlyExpenses.find(y => y.year === futureYear);
      if (!futureYearData) {
        futureYearData = {
          year: futureYear,
          months: Array.from({ length: 12 }, (_, idx) => ({
            month: idx, // 0-indexed (0-11)
            expenses: [],
            totalAmount: 0
          }))
        };
        this.yearlyExpenses.push(futureYearData);
      }
      
      const futureMonthData = futureYearData.months.find(m => m.month === futureMonth);
      if (futureMonthData) {
        const futureExpense = {
          ...cleanExpense,
          _id: new mongoose.Types.ObjectId(),
          date: new Date(futureDate)
        };
        futureMonthData.expenses.push(futureExpense);
        futureMonthData.totalAmount += cleanExpense.amount;
      }
      
      i++;
    }
  }
  
  await this.save();
  return this;
};

// Método para obtener los gastos de un mes específico
sharedSessionSchema.methods.getExpensesByMonth = function(year, month) {
  console.log(`Buscando gastos para año=${year}, mes=${month}`);
  
  // Validar año y mes
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);
  
  // Verificar que el mes esté en el rango válido 0-11 (enero=0, diciembre=11)
  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
    console.error(`Año o mes inválidos: año=${year}, mes=${month}`);
    return [];
  }
  
  console.log(`Buscando año=${yearNum}, mes=${monthNum} (${getMonthName(monthNum)})`);
  
  // Verificar si yearlyExpenses existe y es un array
  if (!this.yearlyExpenses || !Array.isArray(this.yearlyExpenses)) {
    console.log(`No hay estructura de gastos anuales para la sesión ${this._id}`);
    return [];
  }
  
  // Buscar el año correspondiente
  const yearData = this.yearlyExpenses.find(y => y.year === yearNum);
  if (!yearData) {
    console.log(`No se encontraron datos para el año ${yearNum}`);
    return [];
  }
  
  // Verificar si months existe y es un array
  if (!yearData.months || !Array.isArray(yearData.months)) {
    console.log(`El año ${yearNum} no tiene estructura de meses válida`);
    return [];
  }
  
  // Buscar el mes correspondiente (usando 0-indexed)
  let monthData = yearData.months.find(m => m.month === monthNum);
  
  // Diagnóstico adicional para este problema
  if (!monthData) {
    console.log(`No se encontró el mes ${monthNum} (${getMonthName(monthNum)}). Estructura de meses disponible:`);
    if (yearData.months && yearData.months.length > 0) {
      yearData.months.forEach(m => {
        console.log(`- Mes ${m.month} (${getMonthName(m.month)}): ${m.expenses ? m.expenses.length : 0} gastos`);
      });
      
      // Intento de recuperación: buscar por posición en el array en lugar de por valor month
      if (monthNum >= 0 && monthNum < yearData.months.length) {
        monthData = yearData.months[monthNum];
        console.log(`Recuperación: Usando mes en posición ${monthNum} con valor month=${monthData.month}`);
      }
    } else {
      console.log('El año no tiene meses definidos');
    }
  }
  
  if (!monthData) {
    console.log(`No se encontraron datos para el mes ${monthNum} (${getMonthName(monthNum)}) del año ${yearNum}`);
    return [];
  }
  
  // Verificar si expenses existe y es un array
  if (!monthData.expenses || !Array.isArray(monthData.expenses)) {
    console.log(`El mes ${monthNum} (${getMonthName(monthNum)}) no tiene gastos para el año ${yearNum}`);
    return [];
  }
  
  // Verificar que los gastos tengan una estructura válida
  const validExpenses = (monthData.expenses || []).filter(expense => {
    if (!expense) return false;
    
    // Verificar que tenga una fecha válida
    if (!expense.date) {
      console.warn('Gasto sin fecha encontrado');
      return false;
    }
    
    // Verificar que el mes corresponda (usando 0-indexed)
    const expenseDate = new Date(expense.date);
    if (isNaN(expenseDate.getTime())) {
      console.warn('Gasto con fecha inválida encontrado');
      return false;
    }
    
    const expenseMonth = expenseDate.getMonth(); // 0-indexed (0-11)
    const expenseYear = expenseDate.getFullYear();
    
    if (expenseYear !== yearNum || expenseMonth !== monthNum) {
      console.warn(`Gasto con fecha incorrecta: esperado año=${yearNum}, mes=${monthNum} (${getMonthName(monthNum)}), encontrado año=${expenseYear}, mes=${expenseMonth} (${getMonthName(expenseMonth)})`);
      return false;
    }
    
    return true;
  });
  
  console.log(`Encontrados ${validExpenses.length} gastos válidos para ${getMonthName(monthNum)} (${monthNum}) de ${yearNum}`);
  return validExpenses;
};

// Método para actualizar un gasto existente
sharedSessionSchema.methods.updateExpense = async function(expenseId, updates) {
  const expense = this.expenses.id(expenseId);
  if (!expense) return null;
  
  const expenseDate = new Date(expense.date);
  const year = expenseDate.getFullYear();
  const month = expenseDate.getMonth(); // Corregido: usar 0-indexed (0-11) en lugar de 1-indexed
  
  // Actualizar en el array principal de gastos
  Object.assign(expense, updates);
  
  // Actualizar en la estructura de años y meses
  const yearData = this.yearlyExpenses.find(y => y.year === year);
  if (yearData) {
    const monthData = yearData.months.find(m => m.month === month);
    if (monthData) {
      const monthlyExpense = monthData.expenses.id(expenseId);
      if (monthlyExpense) {
        Object.assign(monthlyExpense, updates);
      }
    }
  }
  
  await this.save();
  return expense;
};

// Método para eliminar un gasto
sharedSessionSchema.methods.removeExpense = async function(expenseId) {
  const expense = this.expenses.id(expenseId);
  if (!expense) return null;
  
  const expenseDate = new Date(expense.date);
  const year = expenseDate.getFullYear();
  const month = expenseDate.getMonth(); // Corregido: usar 0-indexed (0-11) en lugar de 1-indexed
  
  // Eliminar del array principal de gastos
  this.expenses.pull(expenseId);
  
  // Eliminar de la estructura de años y meses
  const yearData = this.yearlyExpenses.find(y => y.year === year);
  if (yearData) {
    const monthData = yearData.months.find(m => m.month === month);
    if (monthData) {
      monthData.expenses.pull(expenseId);
      monthData.totalAmount -= expense.amount;
    }
  }
  
  await this.save();
  return expense;
};

// Método para reparar gastos con fechas incorrectas
sharedSessionSchema.methods.fixExpenseDates = async function() {
  console.log('Iniciando corrección de fechas de gastos...');
  let totalFixed = 0;
  
  if (!this.yearlyExpenses || this.yearlyExpenses.length === 0) {
    console.log('No hay estructura de gastos anuales para reparar.');
    return { fixed: 0 };
  }
  
  // Recorrer toda la estructura de gastos
  for (const yearData of this.yearlyExpenses) {
    if (!yearData.months || yearData.months.length === 0) continue;
    
    for (const monthData of yearData.months) {
      if (!monthData.expenses || monthData.expenses.length === 0) continue;
      
      // Para cada gasto, verificar que esté en el mes/año correcto
      const correctedExpenses = [];
      let incorrectExpenses = [];
      
      for (const expense of monthData.expenses) {
        if (!expense.date) {
          console.log(`Gasto sin fecha encontrado en ${yearData.year}/${getMonthName(monthData.month)}`);
          continue;
        }
        
        const expenseDate = new Date(expense.date);
        if (isNaN(expenseDate.getTime())) {
          console.log(`Gasto con fecha inválida encontrado en ${yearData.year}/${getMonthName(monthData.month)}`);
          continue;
        }
        
        const expenseYear = expenseDate.getFullYear();
        const expenseMonth = expenseDate.getMonth(); // 0-indexed (0-11)
        
        // Si está en el mes/año correcto, mantenerlo
        if (expenseYear === yearData.year && expenseMonth === monthData.month) {
          correctedExpenses.push(expense);
        } else {
          // Si no, marcarlo para moverlo al mes/año correcto
          console.log(`Gasto ${expense._id} con fecha incorrecta: esperado ${yearData.year}/${getMonthName(monthData.month)}, encontrado ${expenseYear}/${getMonthName(expenseMonth)}`);
          incorrectExpenses.push({
            expense,
            correctYear: expenseYear,
            correctMonth: expenseMonth
          });
          totalFixed++;
        }
      }
      
      // Reemplazar los gastos del mes con los correctos
      monthData.expenses = correctedExpenses;
      monthData.totalAmount = correctedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      // Mover los gastos incorrectos a sus meses correctos
      for (const { expense, correctYear, correctMonth } of incorrectExpenses) {
        // Buscar o crear el año correcto
        let correctYearData = this.yearlyExpenses.find(y => y.year === correctYear);
        if (!correctYearData) {
          correctYearData = {
            year: correctYear,
            months: Array.from({ length: 12 }, (_, i) => ({
              month: i, // 0-indexed (0-11)
              expenses: [],
              totalAmount: 0
            }))
          };
          this.yearlyExpenses.push(correctYearData);
        }
        
        // Buscar el mes correcto
        const correctMonthData = correctYearData.months.find(m => m.month === correctMonth);
        if (correctMonthData) {
          correctMonthData.expenses.push(expense);
          correctMonthData.totalAmount += expense.amount;
          console.log(`Gasto ${expense._id} movido a ${correctYear}/${getMonthName(correctMonth)}`);
        } else {
          console.error(`No se encontró el mes ${correctMonth} (${getMonthName(correctMonth)}) en el año ${correctYear}`);
        }
      }
    }
  }
  
  // Guardar los cambios
  if (totalFixed > 0) {
    await this.save();
    console.log(`Reparación completada. Se corrigieron ${totalFixed} gastos.`);
  } else {
    console.log('No se encontraron gastos con fechas incorrectas.');
  }
  
  return { fixed: totalFixed };
};

// Función auxiliar para obtener el nombre del mes
function getMonthName(monthIndex) {
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return monthNames[monthIndex] || `Mes ${monthIndex}`;
}

module.exports = mongoose.model('SharedSession', sharedSessionSchema);