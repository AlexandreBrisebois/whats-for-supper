'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, UserCircle, Camera, Calendar, Compass, LucideIcon } from 'lucide-react';
import type { Route } from 'next';

import { ROUTES } from '@/lib/constants/routes';

interface NavItem {
  href: Route;
  label: string;
  icon: LucideIcon;
  isPrimary?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.HOME as Route, label: 'Home', icon: Home },
  { href: ROUTES.CAPTURE as Route, label: 'Capture', icon: Camera },
  { href: ROUTES.DISCOVERY as Route, label: 'Discover', icon: Compass, isPrimary: true },
  { href: ROUTES.PLANNER as Route, label: 'Planner', icon: Calendar },
  { href: ROUTES.PROFILE as Route, label: 'Profile', icon: UserCircle },
];

interface NavigationProps {
  className?: string;
}

export function Navigation({ className = '' }: NavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      className={[
        'fixed bottom-0 left-0 right-0 z-30 flex items-end justify-around pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-1 glass border-t border-white/20',
        className,
      ].join(' ')}
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;

        if (item.isPrimary) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative -top-6 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 active:scale-95 z-40"
              aria-current={active ? 'page' : undefined}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E1AD01] shadow-[0_12px_24px_rgba(225,173,1,0.4)] ring-4 ring-[#fdfcf0] animate-pulse-ochre">
                <Icon size={28} strokeWidth={2.5} className="text-white" aria-hidden="true" />
              </div>
              <span className="text-[10px] font-bold text-ochre mt-1 uppercase tracking-widest">
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-bold transition-all z-40 uppercase tracking-tighter',
              active
                ? 'text-terracotta'
                : 'text-charcoal-400 hover:text-terracotta/70',
            ].join(' ')}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={24} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
