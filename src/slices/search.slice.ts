import {createSlice, PayloadAction, createAsyncThunk} from '@reduxjs/toolkit';
import {RootState} from '../store/rootReducer';
import {
  initiateSearch,
  getSearchStatus,
  createSearchHistory,
} from '../api/userAdmin.api';

export type SearchStatus =
  | 'idle'
  | 'IN_PROGRESS'
  | 'SUCCESS'
  | 'FAILED'
  | 'STOPPED';

interface SearchState {
  searchId: string | null;
  address: string | null;
  status: SearchStatus;
  percent: number;
  message: string | null;
  downloadLink: string | null;
  startedAt: number | null;
}

const initialState: SearchState = {
  searchId: null,
  address: null,
  status: 'idle',
  percent: 0,
  message: null,
  downloadLink: null,
  startedAt: null,
};

const pickSearchId = (res: any): string | null =>
  res?.search_id ?? res?.searchId ?? res?.data?.search_id ?? res?.data?.searchId ?? null;

// Kick off a server-side search. The actual work runs on the backend, so it
// continues even if the app is backgrounded / the phone is locked.
export const startSearch = createAsyncThunk<
  {searchId: string; address: string} | null,
  {address: string},
  {state: RootState; rejectValue: string}
>('search/start', async ({address}, {getState, rejectWithValue}) => {
  try {
    const user = getState().user.user;
    const res: any = await initiateSearch({address});
    const searchId = pickSearchId(res);
    if (!searchId) {
      return rejectWithValue(
        res?.message || 'Could not start the search. Please try again.',
      );
    }
    // Record it in history (best-effort).
    if (user?.sub) {
      createSearchHistory({
        userId: user.sub,
        userType: 'broker',
        address,
        searchId,
        status: 'IN_PROGRESS',
      }).catch(() => {});
    }
    return {searchId, address};
  } catch (e: any) {
    return rejectWithValue(
      e?.response?.data?.message || e?.message || 'Search failed to start.',
    );
  }
});

// Poll the backend once for the current search status.
export const pollSearch = createAsyncThunk<
  any,
  string,
  {state: RootState}
>('search/poll', async searchId => {
  return await getSearchStatus(searchId);
});

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    clearSearch: () => initialState,
    // Used to restore a persisted in-flight search on app launch.
    hydrateSearch: (state, action: PayloadAction<Partial<SearchState>>) => {
      Object.assign(state, action.payload);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(startSearch.pending, state => {
        state.status = 'IN_PROGRESS';
        state.percent = 0;
        state.message = 'Starting search…';
        state.downloadLink = null;
        state.searchId = null;
      })
      .addCase(startSearch.fulfilled, (state, action) => {
        if (action.payload) {
          state.searchId = action.payload.searchId;
          state.address = action.payload.address;
          state.status = 'IN_PROGRESS';
          state.startedAt = Date.now();
          state.message = 'Search in progress…';
        }
      })
      .addCase(startSearch.rejected, (state, action) => {
        state.status = 'FAILED';
        state.message = action.payload ?? 'Search failed to start.';
      })
      .addCase(pollSearch.fulfilled, (state, action) => {
        const d = action.payload || {};
        const status: SearchStatus = d.status ?? state.status;
        state.status = status;
        state.percent = d.percent_completion ?? state.percent;
        state.message = d.status_message ?? state.message;
        if (d.zip_url || d.downloadLink) {
          state.downloadLink = d.zip_url ?? d.downloadLink;
        }
      });
  },
});

export const {clearSearch, hydrateSearch} = searchSlice.actions;

export const currentSearchSelector = (state: RootState) => state.search;
export const isSearchActiveSelector = (state: RootState) =>
  state.search.status === 'IN_PROGRESS' && !!state.search.searchId;

export default searchSlice.reducer;
