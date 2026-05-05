import { Suspense } from 'react';
import MinimalCapture from '@/components/capture/MinimalCapture';

export const dynamic = 'force-dynamic';

interface CapturePageProps {
  searchParams: Promise<{ intent?: string; mode?: string; url?: string; title?: string; text?: string }>;
}

export default async function CapturePage({ searchParams }: CapturePageProps) {
  const params = await searchParams;
  const { intent, mode, url, title, text } = params;
  console.log('[CapturePage] Params resolved:', params);
  return (
    <div className="px-6 pb-12 max-w-sm mx-auto w-full">
      <Suspense fallback={<div className="animate-pulse bg-charcoal/5 h-64 rounded-3xl" />}>
        <MinimalCapture intent={intent} mode={mode} initialUrl={url} initialTitle={title} initialText={text} />
      </Suspense>
    </div>
  );
}
