import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { categoriesAPI } from '../../utils/api';

interface Category {
  _id: string;
  name: string;
  color: string;
  icon: string;
  userId: string;
}

interface CategoriesState {
  items: Category[];
  loading: boolean;
  error: string | null;
}

const initialState: CategoriesState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchCategories = createAsyncThunk('categories/fetchAll', async () => {
  const response = await categoriesAPI.getAll();
  return response.data;
});

export const createCategory = createAsyncThunk(
  'categories/create',
  async (category: Omit<Category, '_id' | 'userId'>) => {
    const response = await categoriesAPI.create(category);
    return response.data;
  }
);

export const updateCategory = createAsyncThunk(
  'categories/update',
  async ({ id, category }: { id: string; category: Partial<Category> }) => {
    const response = await categoriesAPI.update(id, category);
    return response.data;
  }
);

export const deleteCategory = createAsyncThunk(
  'categories/delete',
  async (id: string) => {
    await categoriesAPI.delete(id);
    return id;
  }
);

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Error al cargar las categorías';
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload);
      });
  },
});

export default categoriesSlice.reducer; 