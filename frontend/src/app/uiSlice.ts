import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' };
}

const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;

const initialState: UIState = {
  sidebarOpen: true,
  theme: stored ?? 'light',
  snackbar: { open: false, message: '', severity: 'info' },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => { state.sidebarOpen = action.payload; },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', state.theme);
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
    },
    showSnackbar: (state, action: PayloadAction<{ message: string; severity?: UIState['snackbar']['severity'] }>) => {
      state.snackbar = { open: true, message: action.payload.message, severity: action.payload.severity ?? 'info' };
    },
    hideSnackbar: (state) => { state.snackbar.open = false; },
  },
});

export const { toggleSidebar, setSidebarOpen, toggleTheme, setTheme, showSnackbar, hideSnackbar } = uiSlice.actions;
export default uiSlice.reducer;
