import { handleStaticFallbackRequest } from './staticFallbackStore';

const TOKEN_STORAGE_KEY = 'eworkers_bearer_token';

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access errors
  }
}

export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch {
    return handleStaticFallbackRequest<T>(url, options);
  }

  const contentType = res.headers.get('content-type') || '';

  // If served from a static-only host (e.g. GitHub Pages) where Express /api/* is absent,
  // static servers return HTML 404 (GET) or 405/501 (POST/PATCH/PUT/DELETE).
  // Fall back seamlessly to persistent browser storage so all app workflows remain functional.
  if (
    (res.status === 404 || res.status === 405 || res.status === 501) &&
    !contentType.includes('application/json')
  ) {
    return handleStaticFallbackRequest<T>(url, options);
  }

  const data = contentType.includes('application/json')
    ? await res.json().catch(() => ({}))
    : {};

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}
