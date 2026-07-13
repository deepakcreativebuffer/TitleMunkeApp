import {extractLatLng} from '../api/geocode';

// A single property from the search-history list (same shape SearchHistoryScreen
// derives). Reused by the chat "share property" picker so both stay in sync.
export interface PropertyHistoryItem {
  id: string;
  address: string;
  when: string;
  status: string;
  searchId?: string;
  latitude?: number;
  longitude?: number;
}

export const formatWhen = (raw?: string | number): string => {
  if (!raw) {
    return '';
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return String(raw);
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Normalize the AppSync-wrapped listSearchHistories response into a flat list.
export const mapSearchHistory = (res: any): PropertyHistoryItem[] => {
  const items: any[] =
    res?.data?.listSearchHistories?.items ??
    res?.listSearchHistories?.items ??
    res?.items ??
    res?.data?.items ??
    (Array.isArray(res) ? res : []);
  return items.map((it, i) => {
    const coord = extractLatLng(it);
    return {
      id: String(it.id ?? it.search_id ?? i),
      address: it.address ?? it.searchAddress ?? '—',
      when: formatWhen(
        it.created_at ?? it.createdAt ?? it.property_summary?.['Date of Search'],
      ),
      status: String(it.status ?? 'SUCCESS'),
      searchId: it.search_id ?? it.searchId ?? it.id,
      latitude: coord?.latitude,
      longitude: coord?.longitude,
    };
  });
};
