import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {RootState} from '../store/rootReducer';

interface UserState {
  user: any | null;
  token: string | null;
}

const initialState: UserState = {
  user: null,
  token: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    setUser: (state, action: PayloadAction<any>) => {
      state.user = action.payload;
    },
    logout: () => initialState,
  },
  extraReducers: _builder => {
    // Add async thunk cases here as needed
    // e.g. builder.addCase(loginThunk.fulfilled, (state, action) => { ... });
  },
});

export const {setUserToken, setUser, logout} = userSlice.actions;

// Selectors
export const currentUserTokenSelector = (state: RootState) => state.user.token;
export const userProfileSelector = (state: RootState) => state.user.user;

export default userSlice.reducer;
