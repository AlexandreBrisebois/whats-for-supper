'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, UserCircle, Search, Calendar, Compass, LucideIcon } from 'lucide-react';
import type { Route } from 'next';

import { ROUTES } from '@/lib/constants/routes';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { getCategories } from '@/lib/api/discovery';
import { t } from '@/locales';

interface NavItem {
  href: Route;
  label: string;
  icon: LucideIcon;
  isPrimary?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.HOME as Route, label: t('navigation.home', 'Home'), icon: Home },
  { href: '/recipes' as Route, label: t('navigation.search', 'Search'), icon: Search },
  {
    href: ROUTES.DISCOVERY as Route,
    label: t('navigation.discover', 'Discover'),
    icon: Compass,
    isPrimary: true,
  },
  { href: ROUTES.PLANNER as Route, label: t('navigation.planner', 'Planner'), icon: Calendar },
  { href: ROUTES.PROFILE as Route, label: t('navigation.profile', 'Profile'), icon: UserCircle },
];

interface NavigationProps {
  className?: string;
}

export function Navigation({ className = '' }: NavigationProps) {
  const pathname = usePathname();
  const { hasPendingCards, setHasPendingCards } = useDiscoveryStore();

  // Background check for pending cards on app load
  useEffect(() => {
    const checkDiscovery = async () => {
      try {
        const categories = await getCategories();
        setHasPendingCards(categories.length > 0);
      } catch (error) {
        console.warn('Failed to background check discovery status');
      }
    };
    checkDiscovery();
  }, [setHasPendingCards]);

  return (
    <nav
      className={[
        'fixed bottom-0 left-0 right-0 z-30 flex items-end justify-around pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-1 glass-nav',
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
              data-testid={`nav-item-${item.href.replace('/', '') || 'home'}`}
              className="relative -top-4 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 active:scale-95 z-40"
              aria-current={active ? 'page' : undefined}
            >
              <div
                className={[
                  'flex h-20 w-20 items-center justify-center rounded-full bg-ochre ring-4 ring-cream-100 shadow-ochre-floating transition-all',
                  hasPendingCards && !active ? 'animate-pulse-ochre' : '',
                ].join(' ')}
              >
                <Icon size={32} strokeWidth={2.5} className="text-white" aria-hidden="true" />
              </div>
              <span className="text-[9px] font-bold text-ochre mt-1 uppercase tracking-widest">
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={`nav-item-${item.href.replace('/', '') || 'home'}`}
            className={[
              'flex flex-1 flex-col items-center justify-center gap-1 py-1 text-[11px] font-bold transition-all z-40 uppercase tracking-tighter',
              active ? 'text-terracotta' : 'text-charcoal-400 hover:text-terracotta/70',
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
