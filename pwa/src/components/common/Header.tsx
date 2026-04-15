import type { ReactNode } from 'react';

interface HeaderProps {
  /** Optional element rendered on the right side after the nav */
  action?: ReactNode;
  /** Navigation element — typically <Navigation /> */
  nav?: ReactNode;
}

export function Header({ action, nav }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 bg-sage-green px-4 py-3 shadow-card">
      <span className="shrink-0 text-lg font-bold tracking-tight text-cream">
        What&apos;s for Supper
      </span>
      {nav}
      {action && <div className="flex shrink-0 items-center">{action}</div>}
    </header>
  );
}
