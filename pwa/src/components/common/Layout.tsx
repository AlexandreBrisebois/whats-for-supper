import type { ReactNode } from 'react';

import { Header } from './Header';
import { Navigation } from './Navigation';

interface LayoutProps {
  children: ReactNode;
  /** Optional action element rendered in the top-right of the Header */
  headerAction?: ReactNode;
}

export function Layout({ children, headerAction }: LayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-lavender">
      {/*
       * Header contains the logo, desktop nav (inline), and optional action.
       * Navigation also renders the mobile fixed bottom bar independently
       * (it's position:fixed so it visually escapes the header).
       */}
      <Header action={headerAction} nav={<Navigation />} />

      <main className="flex-1 px-4 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:px-6 md:pb-6">
        {children}
      </main>

      <footer className="hidden border-t border-indigo/10 py-4 text-center text-xs text-charcoal-400 md:block">
        &copy; {new Date().getFullYear()} What&apos;s for Supper
      </footer>
    </div>
  );
}
