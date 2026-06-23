// Helper utility functions

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Decode a base64 / base64url string into a UTF-8 string without any
// dependency on atob/Buffer (not reliably available on Hermes).
function base64UrlDecode(input: string): string {
  const str = input.replace(/-/g, '+').replace(/_/g, '/');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of str) {
    if (ch === '=') {
      break;
    }
    const idx = B64.indexOf(ch);
    if (idx === -1) {
      continue;
    }
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  let result = '';
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    if (b < 0x80) {
      result += String.fromCharCode(b);
    } else if (b < 0xe0) {
      const b2 = bytes[i++];
      result += String.fromCharCode(((b & 0x1f) << 6) | (b2 & 0x3f));
    } else if (b < 0xf0) {
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      result += String.fromCharCode(
        ((b & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f),
      );
    } else {
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      const b4 = bytes[i++];
      let cp =
        ((b & 0x07) << 18) |
        ((b2 & 0x3f) << 12) |
        ((b3 & 0x3f) << 6) |
        (b4 & 0x3f);
      cp -= 0x10000;
      result += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    }
  }
  return result;
}

// Normalised display + colors for a search/history status value.
export type StatusMeta = {label: string; color: string; bg: string};

export const searchStatusMeta = (status?: string): StatusMeta => {
  const s = (status ?? '').toUpperCase();
  if (s.includes('PROGRESS')) {
    return {label: 'In Progress', color: '#A9821C', bg: 'rgba(169,130,28,0.15)'};
  }
  if (s.includes('FAIL') || s.includes('STOP') || s.includes('UNSUCCESS')) {
    return {label: 'Failed', color: '#C13434', bg: 'rgba(193,52,52,0.12)'};
  }
  // SUCCESS / SUCCESSFULL / default
  return {label: 'Success', color: '#1E874B', bg: 'rgba(30,135,75,0.12)'};
};

// Audit-log `detail` may be a JSON-stringified object — extract a readable
// value (mirrors the web's valueFromStringifyObject).
export function valueFromStringifyObject(obj: unknown): string {
  try {
    const parsed = JSON.parse(String(obj));
    const fmt = (v: unknown) => String(v).replace(/organisation/gi, 'organization');
    return typeof parsed === 'object' && parsed !== null
      ? Object.values(parsed).map(fmt).join(', ')
      : fmt(parsed);
  } catch {
    return String(obj ?? '').replace(/organisation/gi, 'organization');
  }
}

// Decode the payload of a JWT. Returns null on any malformed input.
export function decodeJwt<T = Record<string, unknown>>(
  token?: string | null,
): T | null {
  if (!token) {
    return null;
  }
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }
    return JSON.parse(base64UrlDecode(payload)) as T;
  } catch {
    return null;
  }
}

// ── Role helpers ─────────────────────────────────────────────────────────────
// Cognito groups use British spelling ("organisation") in some places and
// American ("organization") in others, so accept both everywhere.
export const isOrgRole = (role?: string): boolean =>
  role === 'organisation' || role === 'organization';

export const isAgentRole = (role?: string): boolean => role === 'agent';

export const isAdminRole = (role?: string): boolean => role === 'admin';
