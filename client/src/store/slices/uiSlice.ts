import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  drawerOpen: boolean;
  loading: {
    global: boolean;
    [key: string]: boolean;
  };
}

const initialState: UIState = {
  drawerOpen: false,
  loading: {
    global: false,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleDrawer: (state) => {
      state.drawerOpen = !state.drawerOpen;
    },
    setDrawer: (state, action: PayloadAction<boolean>) => {
      state.drawerOpen = action.payload;
    },
    setLoading: (state, action: PayloadAction<{ key: string; value: boolean }>) => {
      state.loading[action.payload.key] = action.payload.value;
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },
  },
});

export const {
  toggleDrawer,
  setDrawer,
  setLoading,
  setGlobalLoading,
} = uiSlice.actions;

export default uiSlice.reducer; 