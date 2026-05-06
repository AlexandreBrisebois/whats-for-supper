import { cookies } from 'next/headers';
import { getTodayString } from '@/lib/imageUtils';

const TEST_DATE_COOKIE = 'wfs-test-date';

export async function getServerTodayString(): Promise<string> {
  const cookieStore = await cookies();
  const testDate = cookieStore.get(TEST_DATE_COOKIE)?.value;

  // E2E tests pin the browser clock, but SSR still runs on the Next.js server.
  // Prefer the test cookie when present so server and client resolve the same "today".
  return testDate ? testDate.slice(0, 10) : getTodayString();
}
