import { cookies } from 'next/headers';

/**
 * serverFetch is a lightweight wrapper around the native fetch API
 * for use in Server Components. It automatically routes to the internal 
 * Docker API URL and forwards the identity cookie.
 */
export async function serverFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Use the internal URL to talk to the API container directly
  const baseUrl = process.env.API_INTERNAL_URL ?? 'http://api:5000';
  const url = `${baseUrl}${endpoint.replace(/^\/backend/, '')}`;

  const cookieStore = await cookies();
  const memberId = cookieStore.get('member_id')?.value;

  const headers = new Headers(options.headers);
  if (memberId) {
    headers.set('X-Family-Member-Id', memberId);
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
