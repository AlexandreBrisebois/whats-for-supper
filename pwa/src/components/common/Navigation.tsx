'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { requestPortionsDeparture } from '@/lib/planner/portionsNavigation';
import { Home, UserCircle, BookOpen, Calendar, Compass, LucideIcon } from 'lucide-react';
import type { Route } from 'next';

import { ROUTES } from '@/lib/constants/routes';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { getCategories } from '@/lib/api/discovery';
import { t } from '@/locales';
import { useLocale } from './LocaleProvider';

interface NavItem {
  href: Route;
  label: string;
  icon: LucideIcon;
  isPrimary?: boolean;
}

interface NavigationProps {
  className?: string;
}

export function Navigation({ className = '' }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useLocale();
  const { hasPendingCards, session, setHasPendingCards, refreshSession } = useDiscoveryStore();

  const navItems: NavItem[] = [
    { href: ROUTES.HOME as Route, label: t('navigation.home', 'Home', locale), icon: Home },
    {
      href: '/recipes' as Route,
      label: t('navigation.recipes', 'Recipes', locale),
      icon: BookOpen,
    },
    {
      href: ROUTES.DISCOVERY as Route,
      label: t('navigation.discover', 'Discovery', locale),
      icon: Compass,
      isPrimary: true,
    },
    {
      href: ROUTES.PLANNER as Route,
      label: t('navigation.planner', 'Planner', locale),
      icon: Calendar,
    },
    {
      href: ROUTES.PROFILE as Route,
      label: t('navigation.profile', 'Profile', locale),
      icon: UserCircle,
    },
  ];

  // Background check for pending cards and authoritative session phase on app load
  useEffect(() => {
    let active = true;
    const checkDiscovery = async () => {
      const [categoriesResult] = await Promise.allSettled([getCategories(), refreshSession()]);
      if (!active) return;
      if (categoriesResult.status === 'fulfilled') {
        setHasPendingCards(categoriesResult.value.length > 0);
      } else {
        console.warn('Failed to background check discovery status');
      }
    };
    void checkDiscovery();
    return () => {
      active = false;
    };
  }, [setHasPendingCards, refreshSession]);

  return (
    <nav
      data-testid="app-bottom-navigation"
      className={[
        'fixed bottom-0 left-0 right-0 z-30 flex items-end justify-around pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-1 glass-nav',
        className,
      ].join(' ')}
    >
      {navItems.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;

        if (item.isPrimary) {
          return (
            <Link
              key={item.href}
              href={item.href}
              onNavigate={(event) => {
                if (requestPortionsDeparture(() => router.push(item.href))) event.preventDefault();
              }}
              data-testid={`nav-item-${item.href.replace('/', '') || 'home'}`}
              className="relative -top-3 flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 transition-transform hover:scale-105 active:scale-95 z-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
              aria-current={active ? 'page' : undefined}
            >
              <div
                className={[
                  'flex h-16 w-16 items-center justify-center rounded-full bg-ochre-100 text-sunlight-ink border border-sunlight-line ring-4 ring-cream-100 shadow-ochre-floating',
                  hasPendingCards && session?.phase === 'collecting' && !active
                    ? 'animate-pulse-ochre'
                    : '',
                ].join(' ')}
              >
                <Icon size={28} strokeWidth={2.5} aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold leading-tight text-sunlight-ink">
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onNavigate={(event) => {
              if (requestPortionsDeparture(() => router.push(item.href))) event.preventDefault();
            }}
            data-testid={`nav-item-${item.href.replace('/', '') || 'home'}`}
            className={[
              'flex flex-1 min-h-12 min-w-12 flex-col items-center justify-center gap-1 py-1 text-xs font-semibold leading-tight z-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body',
              active ? 'text-hearth-ink' : 'text-ink-muted hover:text-hearth-ink',
            ].join(' ')}
            aria-current={active ? 'page' : undefined}
          >
            <div className="relative">
              <Icon size={24} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
            </div>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
