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
