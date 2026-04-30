import { cookies } from 'next/headers';
import { API_INTERNAL_URL } from '@/lib/constants/config';

const IDENTITY_COOKIE = 'x-family-member-id';

/**
 * serverFetch is a lightweight wrapper around the native fetch API
 * for use in Server Components. It automatically routes to the internal
 * Docker API URL and forwards the identity cookie.
 */
export async function serverFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Use the internal URL to talk to the API container directly
  const url = `${API_INTERNAL_URL}${endpoint.replace(/^\/backend/, '')}`;

  const headers = new Headers(options.headers);

  // Forward the identity cookie if present
  const cookieStore = await cookies();
  const identity = cookieStore.get(IDENTITY_COOKIE);
  if (identity?.value) {
    headers.set('X-Family-Member-Id', identity.value);
  }

  // Forward the h_access cookie if present (required for backend auth)
  const hAccess = cookieStore.get('h_access');
  if (hAccess?.value) {
    // Add to Cookie header. If multiple cookies are needed, they should be joined with ;
    const existingCookie = headers.get('Cookie');
    const newCookie = `h_access=${hAccess.value}`;
    headers.set('Cookie', existingCookie ? `${existingCookie}; ${newCookie}` : newCookie);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    // Add default cache behavior for Next.js
    next: { revalidate: 0, ...options.next },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  const body = await response.json();
  // Standardized wrapping: If the response has a top-level 'data' property,
  // we assume it's the wrapped result.
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data as T;
  }

  return body as T;
}
