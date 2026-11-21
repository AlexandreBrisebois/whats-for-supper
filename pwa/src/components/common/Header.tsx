'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants/routes';
import { IdentityHint } from '@/components/identity/IdentityHint';

interface HeaderProps {
  /** Page title displayed in the center */
  title?: string;
  /** Optional element rendered on the left side (e.g. Back button) */
  leftAction?: ReactNode;
  /** Optional element rendered on the right side */
  rightAction?: ReactNode;
  /** Navigation element for desktop — typically <Navigation /> */
  nav?: ReactNode;
  /** Whether to show the logo */
  showLogo?: boolean;
}

export function Header({
  title,
  leftAction,
  rightAction,
  nav,
  showLogo = true, // Enabled for Option 2 alignment
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full glass-header safe-top">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 md:py-2">
        {/* Left Side: Back Button or Spacer */}
        <div className="flex min-w-[2.5rem] items-center">{leftAction}</div>

        {/* Center: Brand Link or Page Title */}
        <div className="relative flex-1 text-center">
          <IdentityHint appShell className="right-0 -top-1.5" />
          {!title || (showLogo && title === 'Discovery') ? (
            <Link
              href={ROUTES.HOME}
              className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl px-3 group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
            >
              <span className="font-heading text-lg font-bold tracking-tight text-ink-body md:text-xl">
                Supper
              </span>
            </Link>
          ) : (
            <h1 className="font-heading text-xl font-bold tracking-tight text-ink-body md:text-2xl">
              {title}
            </h1>
          )}
        </div>

        {/* Right Side: Desktop Nav + Optional Action */}
        <div className="flex min-w-[2.5rem] items-center justify-end gap-4">
          <div className="hidden md:block">{nav}</div>
          {rightAction && <div className="flex items-center">{rightAction}</div>}
        </div>
      </div>
    </header>
  );
}
