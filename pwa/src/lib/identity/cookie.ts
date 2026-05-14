/**
 * Utility for managing the identity cookie.
 * This cookie is the source of truth for the active family member ID.
 */

const COOKIE_NAME = 'x-family-member-id';

/**
 * Gets the family member ID from the cookie.
 * Works in both client and server context.
 */
export function getFamilyMemberIdCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${COOKIE_NAME}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

/**
 * Sets the family member ID cookie.
 * @param id The family member ID to store.
 * @param days Optional expiration in days (default: 365).
 */
export function setFamilyMemberIdCookie(id: string, days = 365) {
  if (typeof document === 'undefined') return;

  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; expires=${date.toUTCString()}`;
  }

  // Robust cookie flags to match h_access (BS-PWA-PERSISTENCE)
  // Secure is required for PWA persistence on HTTPS.
  // We use window.location.protocol check to avoid breaking local dev on http.
  const isSecure = window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';

  // Set cookie with Path=/ so it's sent to all routes
  document.cookie = `${COOKIE_NAME}=${id}${expires}; path=/; SameSite=Lax${secureFlag}`;
}

/**
 * Removes the family member ID cookie.
 */
export function removeFamilyMemberIdCookie() {
  if (typeof document === 'undefined') return;
  // Clear cookie with matching Path and SameSite for reliable removal
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
}
