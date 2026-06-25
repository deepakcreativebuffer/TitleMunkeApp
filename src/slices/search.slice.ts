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
import {cleanSearchMessage} from '../utils';

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
  // Consecutive status-poll failures (the backend 400s once its deadline passes
  // — e.g. a job that dies at 90%). Used to finalize a stuck search.
  failCount: number;
}

const KNOWN_STATUSES: SearchStatus[] = [
  'idle',
  'IN_PROGRESS',
  'SUCCESS',
  'FAILED',
  'STOPPED',
];

const initialState: SearchState = {
  searchId: null,
  historyId: null,
  address: null,
  status: 'idle',
  percent: 0,
  message: null,
  downloadLink: null,
  startedAt: null,
  failCount: 0,
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
        state.failCount = 0;
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
        state.failCount = 0;
        // Backend may return non-enum statuses (e.g. "ERROR" when a job dies
        // after its deadline). Treat anything unrecognised as a failure so the
        // search finalizes instead of lingering at the last percent (e.g. 90%).
        let status: SearchStatus = d.status ?? state.status;
        if (typeof d.status === 'string' && !KNOWN_STATUSES.includes(d.status)) {
          status = 'FAILED';
        }
        state.status = status;
        state.percent = d.percent_completion ?? state.percent;
        state.message =
          d.status_message != null
            ? cleanSearchMessage(d.status_message)
            : state.message;
        if (status === 'FAILED' && !state.message) {
          state.message = 'Search could not be completed. Please try again.';
        }
        if (d.zip_url || d.downloadLink) {
          state.downloadLink = d.zip_url ?? d.downloadLink;
        }
      })
      // The status endpoint 400s once the backend deadline passes (job died,
      // e.g. stuck at 90%). Tolerate transient blips, but finalize the search
      // after a few consecutive failures so it doesn't poll/show forever.
      .addCase(pollSearch.rejected, state => {
        state.failCount = (state.failCount ?? 0) + 1;
        if (state.failCount >= 3 && state.status === 'IN_PROGRESS') {
          state.status = 'FAILED';
          state.message = 'Search could not be completed. Please try again.';
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
