const mongoose = require('mongoose');

const participantAllocationSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SharedSession',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  name: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 0,
    max: 11
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
  personalExpenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PersonalExpense',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para mejorar la eficiencia de las consultas
participantAllocationSchema.index({ sessionId: 1, userId: 1 });
participantAllocationSchema.index({ userId: 1, status: 1 });
participantAllocationSchema.index({ year: 1, month: 1 });
participantAllocationSchema.index({ sessionId: 1, year: 1, month: 1 });
participantAllocationSchema.index({ personalExpenseId: 1 });

// Map of allocations currently being synchronized to prevent infinite loops
const syncInProgress = new Map();

// Pre-save hook: Log allocation data before saving
participantAllocationSchema.pre('save', function(next) {
  // Log basic info for debugging
  console.log(`Pre-guardado de asignación: ${this._id}`);
  console.log(`Datos: userId=${this.userId}, sessionId=${this.sessionId}, amount=${this.amount}, año=${this.year}, mes=${this.month}`);
  next();
});

// Post-save hook: Sync allocation with personal expense
participantAllocationSchema.post('save', async function() {
  try {
    console.log(`Post-guardado hook ejecutándose para asignación: ${this._id}`);
    await syncAllocationWithPersonalExpense(this);
    console.log(`\nSincronización post-guardado completada para asignación: ${this._id}`);
  } catch (error) {
    console.error(`Error en post-save hook para asignación ${this._id}:`, error);
  }
});

// Post-update hook: Sync allocation with personal expense after update
participantAllocationSchema.post('findOneAndUpdate', async function(doc) {
  if (!doc) return;
  
  try {
    console.log(`Post-actualización hook ejecutándose para asignación: ${doc._id}`);
    await syncAllocationWithPersonalExpense(doc);
    console.log(`Sincronización post-actualización completada para asignación: ${doc._id}`);
  } catch (error) {
    console.error(`Error en post-update hook para asignación ${doc._id}:`, error);
  }
});

// Sync allocation with personal expense
async function syncAllocationWithPersonalExpense(allocation) {
  // Prevent infinite loops if the allocation is already being synchronized
  if (syncInProgress.has(allocation._id.toString())) {
    console.log(`Sincronización ya en progreso para asignación: ${allocation._id}, evitando duplicación`);
    return;
  }
  
  syncInProgress.set(allocation._id.toString(), true);
  
  try {
    console.log(`Iniciando sincronización para asignación: ${allocation._id}`);
    console.log(`Datos de asignación: userId=${allocation.userId}, amount=${allocation.amount}`);
    
    // Ensure necessary models are loaded
    const mongoose = require('mongoose');
    const PersonalExpense = mongoose.model('PersonalExpense');
    const SharedSession = mongoose.model('SharedSession');
    const User = mongoose.model('User');
    
    // Get session details
    const session = await SharedSession.findById(allocation.sessionId);
    if (!session) {
      console.log(`No se encontró la sesión ${allocation.sessionId}`);
      return;
    }
    
    console.log(`Sesión compartida encontrada: ${session.name}`);
    
    // Get user details
    const user = await User.findById(allocation.userId);
    if (!user) {
      console.log(`No se encontró el usuario ${allocation.userId}`);
      return;
    }
    
    const userName = user.nombre || user.email || 'Usuario';
    console.log(`Información de usuario obtenida: ${userName}`);
    
    // Check if a personal expense already exists for this allocation
    let personalExpense;
    
    if (allocation.personalExpenseId) {
      // Try to find by ID first
      personalExpense = await PersonalExpense.findById(allocation.personalExpenseId);
    }
    
    if (!personalExpense) {
      // Otherwise search by the allocation's ID reference
      personalExpense = await PersonalExpense.findOne({
        allocationId: allocation._id
      });
      
      if (!personalExpense) {
        // Last resort: try to find by session reference data
        personalExpense = await PersonalExpense.findOne({
          user: allocation.userId.toString(),
          'sessionReference.sessionId': allocation.sessionId,
          year: allocation.year,
          month: allocation.month
        });
      }
    }
    
    console.log(`Buscando gasto personal por allocationId: ${allocation._id}, encontrado: ${!!personalExpense}`);
    
    // Create or update the expense date - middle of the month
    const expenseDate = new Date(allocation.year, allocation.month, 15);
    
    // Formatear el nombre del mes para mostrar en la descripción
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const monthName = monthNames[allocation.month];
    
    // Calcular el porcentaje con 2 decimales para mostrar
    const formattedPercentage = allocation.percentage.toFixed(2);
    
    // Formatear el monto con 2 decimales para mostrar
    const formattedAmount = allocation.amount.toFixed(2);

    // Verificar si la sesión es recurrente
    const isRecurringSession = session.sessionType === 'permanent';
    
    // If personal expense exists, update it
    if (personalExpense) {
      // Simplificar el nombre del gasto para que sea solo el nombre de la sesión
      personalExpense.name = session.name;
      personalExpense.description = `Parte correspondiente (${formattedPercentage}%) de gastos compartidos en "${session.name}" para ${monthName} ${allocation.year}`;
      personalExpense.amount = allocation.amount;
      personalExpense.currency = allocation.currency;
      personalExpense.date = expenseDate;
      personalExpense.allocationId = allocation._id;
      personalExpense.year = allocation.year;
      personalExpense.month = allocation.month;
      // Marcar como recurrente si la sesión es recurrente
      personalExpense.isRecurring = isRecurringSession;
      // Marcar como no editable ni borrable
      personalExpense.isFromSharedSession = true;
      
      if (!personalExpense.sessionReference) {
        personalExpense.sessionReference = {};
      }
      
      personalExpense.sessionReference = {
        ...personalExpense.sessionReference,
        sessionId: allocation.sessionId,
        sessionName: session.name,
        percentage: allocation.percentage,
        totalAmount: allocation.totalAmount || 0,
        year: allocation.year,
        month: allocation.month,
        isRecurringShare: isRecurringSession,
        participantName: userName
      };
      
      // Update the reference in the allocation if needed
      if (!allocation.personalExpenseId || !allocation.personalExpenseId.equals(personalExpense._id)) {
        console.log(`Actualizada referencia de gasto personal en asignación: ${personalExpense._id}`);
        await mongoose.model('ParticipantAllocation').findByIdAndUpdate(
          allocation._id,
          { personalExpenseId: personalExpense._id },
          { new: true }
        );
      }
      
      // Save the personal expense
      console.log(`Guardando gasto personal: ${personalExpense._id}`);
      console.log(`Datos: usuario=${personalExpense.user}, monto=${personalExpense.amount}, categoria=${personalExpense.category}`);
      await personalExpense.save();
      console.log(`Gasto personal actualizado: ${personalExpense._id}`);
      console.log(`Gasto guardado: ${JSON.stringify({
        id: personalExpense._id,
        user: personalExpense.user,
        name: personalExpense.name,
        amount: personalExpense.amount,
        date: personalExpense.date,
        isRecurring: personalExpense.isRecurring,
        isFromSharedSession: personalExpense.isFromSharedSession
      })}`);
      
    } else {
      // Create a new personal expense
      personalExpense = new PersonalExpense({
        user: allocation.userId.toString(),
        name: session.name,
        description: `Parte correspondiente (${formattedPercentage}%) de gastos compartidos en "${session.name}" para ${monthName} ${allocation.year}`,
        amount: allocation.amount,
        currency: allocation.currency || 'EUR',
        category: 'Gastos Compartidos',
        date: expenseDate,
        type: 'expense',
        year: allocation.year,
        month: allocation.month,
        // Marcar como recurrente si la sesión es recurrente
        isRecurring: isRecurringSession,
        // Marcar como no editable ni borrable
        isFromSharedSession: true,
        allocationId: allocation._id,
        sessionReference: {
          sessionId: allocation.sessionId,
          sessionName: session.name,
          percentage: allocation.percentage,
          totalAmount: allocation.totalAmount || 0,
          year: allocation.year,
          month: allocation.month,
          isRecurringShare: isRecurringSession,
          participantName: userName
        }
      });
      
      // Save the personal expense
      console.log(`Guardando nuevo gasto personal para usuario ${allocation.userId}`);
      const savedExpense = await personalExpense.save();
      console.log(`Nuevo gasto personal creado: ${savedExpense._id}`);
      
      // Update the allocation with the personal expense ID
      await mongoose.model('ParticipantAllocation').findByIdAndUpdate(
        allocation._id,
        { personalExpenseId: savedExpense._id },
        { new: true }
      );
      
      console.log(`Actualizada referencia en asignación: ${allocation._id} -> ${savedExpense._id}`);
    }
  } catch (error) {
    console.error(`Error sincronizando asignación con gasto personal: ${error.message}`);
  } finally {
    // Remove from in-progress map
    syncInProgress.delete(allocation._id.toString());
  }
}

const ParticipantAllocation = mongoose.model('ParticipantAllocation', participantAllocationSchema);

module.exports = ParticipantAllocation; 