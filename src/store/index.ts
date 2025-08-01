import { configureStore } from '@reduxjs/toolkit';
import dataReducer from './slices/dataSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    data: dataReducer,
    ui: uiReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
