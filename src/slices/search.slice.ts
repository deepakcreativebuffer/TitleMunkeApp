import {createSlice, PayloadAction, createAsyncThunk} from '@reduxjs/toolkit';
import {RootState} from '../store/rootReducer';
import {
  initiateSearch,
  getSearchStatus,
  createSearchHistory,
} from '../api/userAdmin.api';
import {lookupAddress} from '../api/algolia';
import {ADDRESS_LOOKUP_API_URL} from '../static';
import {logoutThunk} from '../thunks/auth.thunks';

export type SearchStatus =
  | 'idle'
  | 'IN_PROGRESS'
  | 'SUCCESS'
  | 'FAILED'
  | 'STOPPED';

interface SearchState {
  searchId: string | null;
  historyId: string | null;
  address: string | null;
  status: SearchStatus;
  percent: number;
  message: string | null;
  downloadLink: string | null;
  startedAt: number | null;
}

const initialState: SearchState = {
  searchId: null,
  historyId: null,
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
  {searchId: string; address: string; historyId: string | null} | null,
  {address: string},
  {state: RootState; rejectValue: string}
>('search/start', async ({address}, {getState, rejectWithValue}) => {
  try {
    const user = getState().user.user;

    // Resolve the address to pin/parnum/tax (same as the web flow).
    // `/initiate-search` requires pin, parnum, address and tax_assessment, so
    // the lookup service must be configured.
    if (!ADDRESS_LOOKUP_API_URL) {
      return rejectWithValue(
        'Address lookup is not configured. Set ADDRESS_LOOKUP_API_URL in src/static.',
      );
    }
    const lookup = await lookupAddress(address);
    if (!lookup?.pin_and_parnum?.length) {
      return rejectWithValue(
        'Could not resolve this address. Please pick a suggestion and try again.',
      );
    }
    const [pin, parnum] = lookup.pin_and_parnum;
    const res: any = await initiateSearch({
      pin,
      parnum,
      address: lookup.matched_address ?? address,
      tax_assessment: lookup.tax_assessment,
    });
    const searchId = pickSearchId(res);
    if (!searchId) {
      return rejectWithValue(
        res?.message || 'Could not start the search. Please try again.',
      );
    }
    // Record it in history so it appears (IN_PROGRESS) in the lists.
    let historyId: string | null = null;
    if (user?.sub) {
      try {
        const created: any = await createSearchHistory({
          userId: user.sub,
          userType: (user.groups?.[0] || user.role || 'broker').toLowerCase(),
          address,
          searchId,
          status: 'IN_PROGRESS',
        });
        historyId =
          created?.id ??
          created?.data?.id ??
          created?.data?.createSearchHistory?.id ??
          null;
      } catch {
        /* non-fatal */
      }
    }
    return {searchId, address, historyId};
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
        state.message =
          'Initializing title search... This process may take a few minutes.';
        state.downloadLink = null;
        state.searchId = null;
      })
      .addCase(startSearch.fulfilled, (state, action) => {
        if (action.payload) {
          state.searchId = action.payload.searchId;
          state.historyId = action.payload.historyId;
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
      })
      // Wipe any in-flight/persisted search when the user logs out.
      .addCase(logoutThunk.fulfilled, () => initialState)
      .addCase(logoutThunk.rejected, () => initialState);
  },
});

export const {clearSearch, hydrateSearch} = searchSlice.actions;

export const currentSearchSelector = (state: RootState) => state.search;
export const isSearchActiveSelector = (state: RootState) =>
  state.search.status === 'IN_PROGRESS' && !!state.search.searchId;

export default searchSlice.reducer;
