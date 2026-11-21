import { Suspense } from 'react';
import CaptureWithPdf from '@/components/capture/CaptureWithPdf';

export const dynamic = 'force-dynamic';

interface CapturePageProps {
  searchParams: Promise<{
    intent?: string;
    mode?: string;
    url?: string;
    title?: string;
    text?: string;
  }>;
}

export default async function CapturePage({ searchParams }: CapturePageProps) {
  const params = await searchParams;
  const { intent, mode, url, title, text } = params;
  return (
    <div className="px-4 sm:px-6 pb-12 max-w-md mx-auto w-full">
      <Suspense
        fallback={
          <div className="animate-pulse motion-reduce:animate-none bg-charcoal-100 h-64 rounded-3xl" />
        }
      >
        <CaptureWithPdf
          intent={intent === 'goto' ? undefined : intent}
          mode={mode}
          initialUrl={url}
          initialTitle={title}
          initialText={text}
        />
      </Suspense>
    </div>
  );
}
