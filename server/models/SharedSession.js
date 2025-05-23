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

const distributionSchema = new mongoose.Schema({
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
}, { _id: true });

const monthlyExpensesSchema = new mongoose.Schema({
  month: {
    type: Number,
    required: true,
    min: 0,
    max: 11
  },
  expenses: [{
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
      required: true
    },
    category: {
      type: String,
      required: true
    },
    paidBy: {
      type: String,
      required: true
    },
    attachments: [{
      url: String,
      name: String,
      type: String
    }]
  }],
  totalAmount: {
    type: Number,
    default: 0
  },
  Distribution: [distributionSchema]
}, { _id: true });

const yearlyExpensesSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true
  },
  months: [monthlyExpensesSchema]
}, { _id: true });

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
  }
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

    // Middleware pre-save para actualizar las asignaciones cuando cambia el totalAmount de un mes
    const modifiedPaths = this.modifiedPaths();
    
    // Si hay cambios en yearlyExpenses, verificar si algún totalAmount cambió
    if (modifiedPaths.some(path => path.startsWith('yearlyExpenses'))) {
      // Meses modificados que requieren actualización
      const monthsToSync = new Set();
      
      // Si el documento es nuevo, no necesitamos hacer nada especial
      if (this.isNew) return;
      
      // Obtener el documento anterior para comparar
      const oldDoc = await this.constructor.findById(this._id);
      if (!oldDoc) return;
      
      // Comparar los totalAmount de cada mes
      if (this.yearlyExpenses && oldDoc.yearlyExpenses) {
        for (const yearData of this.yearlyExpenses) {
          const year = yearData.year;
          const oldYearData = oldDoc.yearlyExpenses.find(y => y.year === year);
          
          if (yearData.months && oldYearData && oldYearData.months) {
            for (const monthData of yearData.months) {
              const month = monthData.month;
              const oldMonthData = oldYearData.months.find(m => m.month === month);
              
              // Si el totalAmount cambió o el mes es nuevo, programar sincronización
              if (!oldMonthData || monthData.totalAmount !== oldMonthData.totalAmount) {
                monthsToSync.add({ year, month });
              }
            }
          }
        }
      }
      
      // Si hay meses que necesitan sincronización, programarla para después del guardado
      if (monthsToSync.size > 0) {
        // Guardar los meses que necesitan sincronización en el documento
        this._monthsToSync = Array.from(monthsToSync);
      }
    }

    next();
  } catch (error) {
    console.error('Error en pre-save de SharedSession:', error);
    next(error);
  }
});

// Middleware post-save para sincronizar las asignaciones
sharedSessionSchema.post('save', async function() {
  try {
    // Si hay meses que necesitan sincronización, procesar
    if (this._monthsToSync && this._monthsToSync.length > 0) {
      const allocationSyncService = require('../services/allocationSyncService');
      
      console.log(`Sincronizando asignaciones para ${this._monthsToSync.length} meses modificados en la sesión ${this._id}`);
      
      for (const { year, month } of this._monthsToSync) {
        try {
          console.log(`Sincronizando asignaciones automáticamente para ${year}-${month+1}`);
          await allocationSyncService.syncMonthlyAllocations(this._id, year, month);
        } catch (syncError) {
          console.error(`Error al sincronizar asignaciones para ${year}-${month+1}:`, syncError);
        }
      }
      
      // Limpiar la lista de meses pendientes
      delete this._monthsToSync;
    } else {
      // Si no hay meses específicos a sincronizar, verificar si hay cambios en la estructura yearlyExpenses
      // que requieran sincronización forzada
      if (this.isModified('yearlyExpenses')) {
        console.log(`Cambios detectados en yearlyExpenses sin meses específicos marcados. Verificando...`);
        
        // Recorrer todos los años/meses y forzar sincronización para los que tienen gastos
        const allocationSyncService = require('../services/allocationSyncService');
        const monthsToSync = [];
        
        if (this.yearlyExpenses && Array.isArray(this.yearlyExpenses)) {
          for (const yearData of this.yearlyExpenses) {
            if (!yearData.months || !Array.isArray(yearData.months)) continue;
            
            for (const monthData of yearData.months) {
              // Solo sincronizar meses que tengan gastos
              if (monthData.expenses && Array.isArray(monthData.expenses) && monthData.expenses.length > 0) {
                monthsToSync.push({ year: yearData.year, month: monthData.month });
              }
            }
          }
        }
        
        if (monthsToSync.length > 0) {
          console.log(`Forzando sincronización para ${monthsToSync.length} meses con gastos`);
          
          // Limitar a 5 meses para no sobrecargar el sistema
          const limitedMonths = monthsToSync.slice(0, 5);
          
          for (const { year, month } of limitedMonths) {
            try {
              console.log(`Sincronizando forzadamente para ${year}-${month+1}`);
              await allocationSyncService.syncMonthlyAllocations(this._id, year, month);
            } catch (syncError) {
              console.error(`Error al sincronizar asignaciones para ${year}-${month+1}:`, syncError);
            }
          }
        }
      }
    }
    
    // En cualquier caso, verificar si hubo cambios en allocationService después del guardado
    try {
      const allocationService = require('../services/allocationService');
      await allocationService.distributeAmount(this);
      console.log(`Distribución de montos actualizada para sesión ${this._id}`);
    } catch (allocError) {
      console.error(`Error al distribuir montos en post-save: ${allocError.message}`);
    }
  } catch (error) {
    console.error('Error en middleware post-save de SharedSession:', error);
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

// Método para agregar un gasto
sharedSessionSchema.methods.addExpense = async function(expense, expenseDate, endDate) {
  // Validar y limpiar la fecha del gasto
  const date = expenseDate instanceof Date ? expenseDate : new Date(expenseDate);
  if (isNaN(date.getTime())) {
    throw new Error('Fecha de gasto inválida');
  }

  // Obtener año y mes del gasto
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed (0-11)

  // Limpiar y asegurar los campos del gasto
  const cleanExpense = {
    name: expense.name || 'Gasto',
    description: expense.description || '',
    amount: typeof expense.amount === 'number' ? expense.amount : Number(expense.amount) || 0,
    date: date,
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

  // Si es recurrente, crear instancias futuras hasta la fecha final
  if (cleanExpense.isRecurring && endDate) {
    const finalEndDate = endDate instanceof Date ? endDate : new Date(endDate);
    
    // Usar UTC para evitar problemas de zona horaria
    const originalDate = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    ));
    
    let i = 1;
    while (true) {
      // Crear una fecha para el mes siguiente usando UTC
      const futureDate = new Date(Date.UTC(
        originalDate.getUTCFullYear(),
        originalDate.getUTCMonth() + i,
        originalDate.getUTCDate()
      ));
      
      if (futureDate > finalEndDate) break;
      
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
      console.log(`Fecha inválida encontrada en gasto: ${expense._id}`);
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
          console.log(`Fecha inválida encontrada en gasto: ${expense._id}`);
          continue;
        }
        
        const expenseYear = expenseDate.getFullYear();
        const expenseMonth = expenseDate.getMonth(); // 0-indexed (0-11)
        
        if (expenseYear !== yearData.year || expenseMonth !== monthData.month) {
          console.log(`Gasto con fecha incorrecta: esperado año=${yearData.year}, mes=${monthData.month} (${getMonthName(monthData.month)}), encontrado año=${expenseYear}, mes=${expenseMonth} (${getMonthName(expenseMonth)})`);
          incorrectExpenses.push(expense);
        } else {
          correctedExpenses.push(expense);
        }
      }
      
      // Actualizar el array de gastos en la estructura de años y meses
      monthData.expenses = correctedExpenses;
      monthData.totalAmount = correctedExpenses.reduce((total, expense) => total + expense.amount, 0);
      
      // Actualizar el array de gastos en el documento
      this.expenses = correctedExpenses;
      
      totalFixed += incorrectExpenses.length;
    }
  }
  
  console.log(`${totalFixed} gastos corregidos`);
  await this.save();
  return { fixed: totalFixed };
};

// Función auxiliar para obtener el nombre del mes
function getMonthName(month) {
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return monthNames[month] || 'Mes inválido';
}

module.exports = mongoose.model('SharedSession', sharedSessionSchema);