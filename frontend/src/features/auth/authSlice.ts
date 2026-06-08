import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, Company } from '../../types';

interface AuthState {
  user: User | null;
  company: Company | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  company: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; company?: Company; tokens: { accessToken: string; refreshToken: string } }>) => {
      const { user, company, tokens } = action.payload;
      state.user = user;
      state.company = company ?? null;
      state.accessToken = tokens.accessToken;
      state.refreshToken = tokens.refreshToken;
      state.isAuthenticated = true;
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    },
    setUser: (state, action: PayloadAction<User>) => { state.user = action.payload; },
    setCompany: (state, action: PayloadAction<Company>) => { state.company = action.payload; },
    logout: (state) => {
      state.user = null;
      state.company = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    setLoading: (state, action: PayloadAction<boolean>) => { state.isLoading = action.payload; },
  },
});

export const { setCredentials, setUser, setCompany, logout, setLoading } = authSlice.actions;
export default authSlice.reducer;
