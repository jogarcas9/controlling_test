import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { expensesAPI } from '../../utils/api';

interface Expense {
  _id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  userId: string;
}

interface ExpensesState {
  items: Expense[];
  loading: boolean;
  error: string | null;
  filters: {
    startDate: string | null;
    endDate: string | null;
    category: string | null;
    minAmount: number | null;
    maxAmount: number | null;
  };
}

const initialState: ExpensesState = {
  items: [],
  loading: false,
  error: null,
  filters: {
    startDate: null,
    endDate: null,
    category: null,
    minAmount: null,
    maxAmount: null,
  },
};

export const fetchExpenses = createAsyncThunk(
  'expenses/fetchAll',
  async (filters?: Partial<ExpensesState['filters']>) => {
    const response = await expensesAPI.getAll(filters);
    return response.data;
  }
);

export const createExpense = createAsyncThunk(
  'expenses/create',
  async (expense: Omit<Expense, '_id' | 'userId'>) => {
    const response = await expensesAPI.create(expense);
    return response.data;
  }
);

export const updateExpense = createAsyncThunk(
  'expenses/update',
  async ({ id, expense }: { id: string; expense: Partial<Expense> }) => {
    const response = await expensesAPI.update(id, expense);
    return response.data;
  }
);

export const deleteExpense = createAsyncThunk(
  'expenses/delete',
  async (id: string) => {
    await expensesAPI.delete(id);
    return id;
  }
);

const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Error al cargar los gastos';
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateExpense.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload);
      });
  },
});

export const { setFilters, clearFilters } = expensesSlice.actions;
export default expensesSlice.reducer; 