/**
 * Utility for managing the identity cookie.
 * This cookie is the source of truth for the active family member ID.
 */

const COOKIE_NAME = 'x-family-member-id';

/**
 * Gets the family member ID from the cookie.
 * NOTE: If the cookie is HttpOnly (recommended for PWA), this will return undefined in JS.
 * Use familyStore.loadCurrentIdentity() for reliable recovery.
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
 * NOTE: This is a fallback for client-side state.
 * Prefer the setFamilyMemberCookie server action for HttpOnly/Secure enforcement.
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
  const isSecure = window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';

  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  const domainFlag = domain ? `; domain=${domain}` : '';

  // Set cookie with Path=/ so it's sent to all routes
  document.cookie = `${COOKIE_NAME}=${id}${expires}; path=/; SameSite=Lax${secureFlag}${domainFlag}`;
}

/**
 * Removes the family member ID cookie.
 */
export function removeFamilyMemberIdCookie() {
  if (typeof document === 'undefined') return;
  // Clear cookie with matching Path and SameSite for reliable removal
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
}
