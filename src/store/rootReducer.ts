import {combineReducers} from '@reduxjs/toolkit';
import {userSlice, searchSlice} from '../slices';

const rootReducer = combineReducers({
  user: userSlice,
  search: searchSlice,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
