import {algoliasearch} from 'algoliasearch';
import axios from 'axios';
import {ALGOLIA, ADDRESS_LOOKUP_API_URL} from '../static';

export type AddressHit = {
  PROPERTY_ADDRESS?: string;
  address?: string;
  name?: string;
  objectID?: string;
  [key: string]: unknown;
};

// Initialise Algolia only when configured (mirrors the web behaviour).
const client =
  ALGOLIA.appId && ALGOLIA.searchKey
    ? algoliasearch(ALGOLIA.appId, ALGOLIA.searchKey)
    : null;

export const algoliaEnabled = !!client && !!ALGOLIA.indexName;

// Address autocomplete — returns up to 5 hits for the typed query.
export const searchAddresses = async (query: string): Promise<AddressHit[]> => {
  if (!client || !ALGOLIA.indexName || !query.trim()) {
    return [];
  }
  try {
    const res = await client.searchSingleIndex<AddressHit>({
      indexName: ALGOLIA.indexName,
      searchParams: {query, hitsPerPage: 5},
    });
    if (__DEV__ && res.hits?.[0]) {
      console.log('[Algolia] hit keys:', Object.keys(res.hits[0]));
      console.log('[Algolia] sample hit:', JSON.stringify(res.hits[0]));
    }
    return res.hits ?? [];
  } catch (e) {
    if (__DEV__) {
      console.log('Algolia search error:', e);
    }
    return [];
  }
};

// Pull the display address out of a hit (same precedence as the web).
export const hitAddress = (h: AddressHit): string =>
  (h.PROPERTY_ADDRESS as string) || h.address || h.name || '';

export interface AddressLookupResult {
  matched_address: string;
  pin_and_parnum: Array<string | number>;
  tax_assessment?: string | number;
  status?: string;
  message?: string;
}

// Resolve a free-text address to pin/parnum/tax via the lookup service.
export const lookupAddress = async (
  address: string,
): Promise<AddressLookupResult | null> => {
  if (!ADDRESS_LOOKUP_API_URL) {
    return null;
  }
  const res = await axios.post(
    ADDRESS_LOOKUP_API_URL,
    {address},
    {timeout: 25000},
  );
  return res.data as AddressLookupResult;
};
