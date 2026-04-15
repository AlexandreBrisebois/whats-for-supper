const MEMBER_COOKIE = 'member_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function getMemberIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${MEMBER_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setMemberIdCookie(memberId: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${MEMBER_COOKIE}=${encodeURIComponent(memberId)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}

export function clearMemberIdCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${MEMBER_COOKIE}=; max-age=0; path=/`;
}
