import MinimalCapture from '@/components/capture/MinimalCapture';

interface CapturePageProps {
  searchParams: Promise<{ intent?: string; mode?: string }>;
}

export default async function CapturePage({ searchParams }: CapturePageProps) {
  const { intent, mode } = await searchParams;
  return (
    <div className="px-6 pb-12">
      <MinimalCapture intent={intent} mode={mode} />
    </div>
  );
}
