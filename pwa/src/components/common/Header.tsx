'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants/routes';
import { useFamilyStore } from '@/store/familyStore';
import { Sparkles } from 'lucide-react';

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
  const { familyMembers, selectedFamilyMemberId } = useFamilyStore();

  const selectedMember = familyMembers.find((m) => m.id === selectedFamilyMemberId);
  const firstName = selectedMember?.name.split(' ')[0] || '';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const dynamicTitle =
    title === 'Home' || !title ? `${getGreeting()}${firstName ? `, ${firstName}` : ''}!` : title;

  return (
    <header className="sticky top-0 z-30 w-full bg-cream/90 backdrop-blur-xl safe-top border-b border-terracotta/5">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 md:py-2">
        {/* Left Side: Back Button or Spacer */}
        <div className="flex min-w-[2.5rem] items-center">{leftAction}</div>

        {/* Center: Dynamic Greeting or Page Title */}
        <div className="flex-1 text-center">
          {showLogo && (title === 'Discovery' || !title) ? (
            <Link href={ROUTES.HOME} className="inline-flex items-center gap-2 group">
              <span className="font-heading text-lg font-bold tracking-tight text-charcoal md:text-xl">
                Supper
              </span>
            </Link>
          ) : (
            <h1 className="font-heading text-xl font-bold tracking-tight text-charcoal md:text-2xl">
              {dynamicTitle}
            </h1>
          )}
          {title === 'Discovery' || !title ? (
            <p className="hidden text-[8px] font-bold uppercase tracking-[0.2em] text-terracotta/60 sm:block">
              {title === 'Discovery' ? 'Matchmaking' : 'Command Center'}
            </p>
          ) : null}
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
