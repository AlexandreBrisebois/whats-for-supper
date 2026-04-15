import { Spinner } from '@/components/ui/spinner';

export function Loading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Spinner size="lg" />
      <p className="text-sm text-charcoal-400">{message}</p>
    </div>
  );
}
