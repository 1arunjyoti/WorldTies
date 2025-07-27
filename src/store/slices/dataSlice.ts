import { createSlice } from '@reduxjs/toolkit';

// Define the shape of our slice state
interface DataState {
  // This slice is now empty, but we keep it for potential future use
  // or to be removed if it's no longer needed at all.
}

// Initial state
const initialState: DataState = {};

// Create the slice
const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {},
});

// Export the reducer
export default dataSlice.reducer;
