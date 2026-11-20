'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { requestPortionsDeparture } from '@/lib/planner/portionsNavigation';
import { Home, UserCircle, BookOpen, Calendar, Compass, Check, LucideIcon } from 'lucide-react';
import type { Route } from 'next';

import { ROUTES } from '@/lib/constants/routes';
import { useDiscoveryStore } from '@/store/discoveryStore';
import { getCategories } from '@/lib/api/discovery';
import { absoluteMonday } from '@/lib/deployment-calendar';
import { usePlannerStore } from '@/store/plannerStore';
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

  const converged = session?.phase === 'converged' && Boolean(session.roundId);
  const convergedMonday = converged ? absoluteMonday(session?.weekStartDate) : null;
  const collecting =
    hasPendingCards && session?.phase === 'collecting' && pathname !== ROUTES.DISCOVERY;
  const convergedHref = convergedMonday
    ? (`/planner?${new URLSearchParams({ weekOffset: '0', referenceWeekStartDate: convergedMonday })}` as Route)
    : (ROUTES.DISCOVERY as Route);

  // One calm arrival cue only when a live transition into converged is observed; never on hydration.
  const phase = session?.phase;
  const [observedPhase, setObservedPhase] = useState(phase);
  const [arrived, setArrived] = useState(false);
  if (observedPhase !== phase) {
    setObservedPhase(phase);
    setArrived(
      phase === 'converged' && (observedPhase === 'collecting' || observedPhase === 'unowned')
    );
  }

  const navItems: NavItem[] = [
    { href: ROUTES.HOME as Route, label: t('navigation.home', 'Home', locale), icon: Home },
    {
      href: '/recipes' as Route,
      label: t('navigation.recipes', 'Recipes', locale),
      icon: BookOpen,
    },
    {
      href: ROUTES.DISCOVERY as Route,
      label: converged
        ? t('navigation.menuReady', "Menu's in", locale)
        : t('navigation.discover', 'Discovery', locale),
      icon: converged ? Check : Compass,
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
          const target = converged ? convergedHref : item.href;
          const primaryActive = pathname === ROUTES.DISCOVERY;
          return (
            <Link
              key={item.href}
              href={target}
              onNavigate={(event) => {
                if (converged && convergedMonday) {
                  event.preventDefault();
                  const go = () => {
                    usePlannerStore.getState().setActiveTab('planner');
                    router.push(target);
                  };
                  if (!requestPortionsDeparture(go)) go();
                  return;
                }
                if (requestPortionsDeparture(() => router.push(target))) event.preventDefault();
              }}
              aria-label={
                converged
                  ? t('navigation.menuReadyAria', "Menu's in — open meal plan matches", locale)
                  : collecting
                    ? t('navigation.discoverVotingAria', 'Discovery — family is voting', locale)
                    : undefined
              }
              data-testid={`nav-item-${item.href.replace('/', '') || 'home'}`}
              className="relative -top-3 flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 transition-transform hover:scale-105 active:scale-95 z-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
              aria-current={primaryActive ? 'page' : undefined}
            >
              <div
                className={[
                  'relative flex h-16 w-16 items-center justify-center rounded-full ring-4 ring-cream-100 shadow-ochre-floating',
                  converged
                    ? 'bg-garden-fill text-white border border-garden-fill-deep'
                    : 'bg-ochre-100 text-sunlight-ink border border-sunlight-line',
                  collecting ? 'animate-pulse-ochre' : '',
                  converged && arrived ? 'animate-arrive-garden' : '',
                ].join(' ')}
              >
                <Icon size={28} strokeWidth={2.5} aria-hidden="true" />
                {collecting ? (
                  <span
                    data-testid="nav-discovery-pip"
                    aria-hidden="true"
                    className="absolute right-0 top-0 h-3 w-3 rounded-full bg-sunlight-ink ring-2 ring-cream-100"
                  />
                ) : null}
              </div>
              <span
                className={[
                  'text-xs font-semibold leading-tight',
                  converged ? 'text-garden-ink' : 'text-sunlight-ink',
                ].join(' ')}
              >
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
