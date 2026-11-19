'use client';

import { Check } from 'lucide-react';

interface SuccessCardProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
  headingAs?: 'h1' | 'h3';
  smallTextTone?: 'default' | 'dark';
  testId: string;
  titleTestId?: string;
  actionTestId: string;
}

export function SuccessCard({
  title,
  description,
  actionLabel,
  onAction,
  headingAs: Heading = 'h3',
  smallTextTone = 'default',
  testId,
  titleTestId,
  actionTestId,
}: SuccessCardProps) {
  return (
    <div
      data-testid={testId}
      className="bg-garden-fill bg-gradient-to-br from-garden-fill to-garden-fill-deep p-8 rounded-[2.5rem] shadow-card flex flex-col items-center justify-center gap-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white mb-2">
        <Check size={48} strokeWidth={3} aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-2 items-center text-center relative z-10">
        <Heading
          data-testid={titleTestId}
          className="font-heading text-4xl font-black text-white leading-none tracking-tighter"
        >
          {title}
        </Heading>
        <p className="text-cream-100 text-xs font-semibold">{description}</p>
      </div>

      <button
        type="button"
        onClick={onAction}
        data-testid={actionTestId}
        className="mt-2 px-8 min-h-12 min-w-12 rounded-2xl bg-white border border-garden-line text-garden-ink font-semibold text-xs transition-all active:scale-95 hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        {actionLabel}
      </button>
    </div>
  );
}
