import { cookies } from 'next/headers';

const IDENTITY_COOKIE = 'x-family-member-id';

/**
 * serverFetch is a lightweight wrapper around the native fetch API
 * for use in Server Components. It automatically routes to the internal 
 * Docker API URL and forwards the identity cookie.
 */
export async function serverFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Use the internal URL to talk to the API container directly
  const baseUrl = process.env.API_INTERNAL_URL ?? 'http://api:5000';
  const url = `${baseUrl}${endpoint.replace(/^\/backend/, '')}`;

  const headers = new Headers(options.headers);
  
  // Forward the identity cookie if present
  const cookieStore = await cookies();
  const identity = cookieStore.get(IDENTITY_COOKIE);
  if (identity?.value) {
    headers.set('X-Family-Member-Id', identity.value);
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

  return response.json() as Promise<T>;
}
