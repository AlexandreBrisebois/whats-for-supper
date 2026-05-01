import MinimalCapture from '@/components/capture/MinimalCapture';

interface CapturePageProps {
  searchParams: Promise<{ intent?: string }>;
}

export default async function CapturePage({ searchParams }: CapturePageProps) {
  const { intent } = await searchParams;
  return (
    <div className="px-6 pb-12">
      <MinimalCapture intent={intent} />
    </div>
  );
}
