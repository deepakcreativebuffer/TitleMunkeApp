import {useCallback, useEffect, useRef, useState} from 'react';

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

// Lightweight data-fetching hook for screen-local read APIs. Cancels stale
// results on unmount and supports manual reload (pull-to-refresh, etc.).
export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher, deps);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await run();
      if (mounted.current) {
        setData(res);
      }
    } catch (e: any) {
      if (mounted.current) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load.');
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [run]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  return {data, loading, error, reload: load};
}

type Page = {items: any[]; nextToken: string | null};

type PaginatedState = {
  items: any[];
  loading: boolean; // first page only
  loadingMore: boolean; // appending a further page
  error: string | null;
  hasMore: boolean;
  reload: () => void;
  loadMore: () => void;
};

// Cursor-paginated list hook for the `nextToken`-style read APIs. Loads the
// first page on mount / when `deps` change (replacing the list), and appends
// further pages via `loadMore` until the backend stops returning a nextToken.
// `extract` pulls the raw items + nextToken out of one response. `loadMore` is
// safe to call repeatedly (e.g. from an onScroll handler) — it no-ops while a
// fetch is in flight or once the last page has been reached.
export function usePaginatedFetch(
  fetchPage: (nextToken: string | null) => Promise<any>,
  extract: (res: any) => Page,
  deps: ReadonlyArray<unknown> = [],
): PaginatedState {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextToken, setNextToken] = useState<string | null>(null);

  const mounted = useRef(true);
  const reqId = useRef(0); // discards stale results after a reload
  const tokenRef = useRef<string | null>(null);
  const busy = useRef(false); // prevents overlapping fetches

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchFn = useCallback(fetchPage, deps);

  const loadFirst = useCallback(async () => {
    const id = ++reqId.current;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const {items: raw, nextToken: nt} = extract(await fetchFn(null));
      if (!mounted.current || id !== reqId.current) {
        return;
      }
      setItems(raw);
      tokenRef.current = nt;
      setNextToken(nt);
    } catch (e: any) {
      if (mounted.current && id === reqId.current) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load.');
      }
    } finally {
      if (mounted.current && id === reqId.current) {
        setLoading(false);
      }
      busy.current = false;
    }
    // extract is treated as stable (defined at module scope).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn]);

  const loadMore = useCallback(async () => {
    const token = tokenRef.current;
    if (busy.current || !token) {
      return;
    }
    const id = reqId.current;
    busy.current = true;
    setLoadingMore(true);
    try {
      const {items: raw, nextToken: nt} = extract(await fetchFn(token));
      if (!mounted.current || id !== reqId.current) {
        return;
      }
      setItems(prev => [...prev, ...raw]);
      tokenRef.current = nt;
      setNextToken(nt);
    } catch {
      // Keep the already-loaded items on a load-more failure.
    } finally {
      if (mounted.current && id === reqId.current) {
        setLoadingMore(false);
      }
      busy.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn]);

  useEffect(() => {
    mounted.current = true;
    loadFirst();
    return () => {
      mounted.current = false;
    };
  }, [loadFirst]);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore: nextToken != null,
    reload: loadFirst,
    loadMore,
  };
}
