// App constants and configuration

export const API_BASE_URL =
  'https://jdk8dyza99.execute-api.us-east-1.amazonaws.com';

export const ENDPOINTS = {
  login: '/login',
};

// Algolia address autocomplete (same as the web's VITE_ALGOLIA_* envs).
// Fill these in to enable suggestions; left empty -> autocomplete disabled.
export const ALGOLIA = {
  appId: '7F6AI3WO99',
  searchKey: '7bba2373109ef6bae2ab42c944c71a01',
  indexName: 'ALLLEHIGHCOUNTYADDRESSES',
};

// Address-lookup service that resolves a typed address to its
// { matched_address, pin_and_parnum, tax_assessment } (web's VITE_ADDRESS_LOOKUP_API_URL).
export const ADDRESS_LOOKUP_API_URL =
  'https://iweevgyflmwhamvgraszfn2xp40wvqza.lambda-url.us-east-1.on.aws/';

// Google Maps key (web's VITE_GOOGLE_MAPS_API_KEY) — for static map tiles if needed.
export const GOOGLE_MAPS_API_KEY = 'AIzaSyAqRDjz2kI4-m76Rgb7uCVOtMAVgmZu_eE';

// LLM governance Lambda (web's VITE_LLM_API_URL) — admin AI-model management.
export const LLM_API_URL =
  'https://e3lezi6ve5lpsq3blfdxes2unq0rzeis.lambda-url.us-east-1.on.aws/';
