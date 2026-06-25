import {combineReducers} from '@reduxjs/toolkit';
import {userSlice, searchSlice, messagingSlice} from '../slices';

const rootReducer = combineReducers({
  user: userSlice,
  search: searchSlice,
  messaging: messagingSlice,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
