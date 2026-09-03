export const PROD_API_BASE = 'https://fayda-production-a914.up.railway.app';
export const PROD_WS_URL = 'wss://fayda-production-a914.up.railway.app/ws';

export const getApiBase = (): string => {
  if (typeof window === 'undefined') return PROD_API_BASE;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const host = window.location.hostname || '';
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.');
  if (isLocal) {
    const isHttps = window.location.protocol === 'https:';
    return `${isHttps ? 'https:' : 'http:'}//${host || 'localhost'}:3001`;
  }
  return PROD_API_BASE;
};

export const getWsUrl = (): string => {
  if (typeof window === 'undefined') return PROD_WS_URL;
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  const host = window.location.hostname || '';
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.');
  if (isLocal) {
    const isHttps = window.location.protocol === 'https:';
    return `${isHttps ? 'wss:' : 'ws:'}//${host || 'localhost'}:3001/ws`;
  }
  return PROD_WS_URL;
};
