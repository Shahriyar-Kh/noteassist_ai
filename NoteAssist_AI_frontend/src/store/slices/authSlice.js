// FILE: src/store/slices/authSlice.js
// ============================================================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '@/services/auth.service';

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const data = await authService.login(email, password);
      return data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const data = await authService.register(userData);
      return data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser', 
  async (_, { rejectWithValue }) => {
    try {
      return await authService.getCurrentUser();
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Guest mode thunks
export const startGuestSession = createAsyncThunk(
  'auth/startGuestSession',
  async (_, { rejectWithValue }) => {
    try {
      const data = await authService.startGuestSession();
      return data;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const getGuestSession = createAsyncThunk(
  'auth/getGuestSession',
  async (_, { rejectWithValue }) => {
    try {
      return await authService.getGuestSession();
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const clearGuestSession = createAsyncThunk(
  'auth/clearGuestSession',
  async () => {
    await authService.clearGuestSession();
  }
);

// Initial state
const initialState = {
  user: authService.getStoredUser(),
  isAuthenticated: authService.isAuthenticated(),
  isGuest: authService.isGuest(),
  guestSession: authService.getStoredGuestSession(),
  loading: false,
  error: null,
  redirect: authService.getRedirectUrl(),
};

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setRedirect: (state, action) => {
      state.redirect = action.payload;
    },
    updateGuestSession: (state, action) => {
      state.guestSession = action.payload;
      authService.updateGuestSession(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.redirect = action.payload.redirect || '/dashboard';
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.redirect = action.payload.redirect || '/dashboard';
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Logout
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.isGuest = false;
        state.guestSession = null;
        state.redirect = '/home';
      })
      // Get current user
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      })
      // Start guest session
      .addCase(startGuestSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startGuestSession.fulfilled, (state, action) => {
        state.loading = false;
        state.isGuest = true;
        state.guestSession = action.payload;
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(startGuestSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get guest session
      .addCase(getGuestSession.fulfilled, (state, action) => {
        if (action.payload.is_guest) {
          state.isGuest = true;
          state.guestSession = action.payload;
        }
      })
      // Clear guest session
      .addCase(clearGuestSession.fulfilled, (state) => {
        state.isGuest = false;
        state.guestSession = null;
      });
  },
});

export const { clearError, setRedirect, updateGuestSession } = authSlice.actions;
export default authSlice.reducer;