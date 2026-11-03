import { redirect } from 'next/navigation';

const supportedContext = [
  'gotoOnly',
  'discoverableOnly',
  'focus',
  'similarTo',
  'open',
  'addToDay',
  'weekOffset',
  'referenceWeekStartDate',
] as const;

export default async function LegacyBrowseRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const incoming = await searchParams;
  const destination = new URLSearchParams();
  for (const key of supportedContext) {
    const value = incoming[key];
    if (typeof value === 'string') destination.set(key, value);
  }
  const query = destination.toString();
  redirect(`/recipes${query ? `?${query}` : ''}`);
}
