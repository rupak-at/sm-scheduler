import 'server-only';

export function apiBaseUrl() {
  const value = process.env.API_BASE_URL;
  if (!value) throw new Error('API_BASE_URL is required for server requests');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid API_BASE_URL');
  return url.origin;
}
