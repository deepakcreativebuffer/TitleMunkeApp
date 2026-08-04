import {configureStore} from '@reduxjs/toolkit';
import {persistReducer, persistStore} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {TypedUseSelectorHook, useDispatch, useSelector} from 'react-redux';
import rootReducer, {RootState} from './rootReducer';

// NOTE: the `messaging` slice is persisted via a NESTED persistReducer inside
// rootReducer (so its capped/whitelisted config doesn't widen the root store
// types). Here we only persist `user` and `search` at the root.
const persistedReducer = persistReducer(
  {
    key: 'root',
    storage: AsyncStorage,
    whitelist: ['user', 'search'],
  },
  rootReducer,
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false, // Turn off serialization check for redux-persist
    }),
});

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
export type {RootState};

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
