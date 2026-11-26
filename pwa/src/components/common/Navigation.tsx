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
import { useFamily } from '@/hooks/useFamily';
import { useUiStore } from '@/store/uiStore';
import {
  clearHandoffLock,
  useHandoffLock,
  waitForPendingVotes,
} from '@/lib/discovery/passThePhone';
import { Modal } from './Modal';
import { t, tWithVars } from '@/locales';
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
  const {
    hasPendingCards,
    discoveryStack,
    session,
    setHasPendingCards,
    refreshSession,
    handoffTurnCompleted,
  } = useDiscoveryStore();
  const { familyMembers, selectedMember, selectFamilyMember } = useFamily();
  const handoffLock = useHandoffLock();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [returnError, setReturnError] = useState(false);

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
        if (pathname !== ROUTES.DISCOVERY) {
          setHasPendingCards(categoriesResult.value.length > 0);
        }
      } else {
        console.warn('Failed to background check discovery status');
      }
    };
    void checkDiscovery();
    return () => {
      active = false;
    };
  }, [setHasPendingCards, refreshSession, pathname]);

  if (handoffLock) {
    const originMember = familyMembers.find(
      (m) => m.id.toLowerCase() === handoffLock.originMemberId.toLowerCase()
    );
    const originName = originMember?.name ?? '';
    const activeName = handoffLock.participantName || selectedMember?.name || '';
    const hasRemainingCards =
      (discoveryStack.length > 0 || hasPendingCards) && !handoffTurnCompleted;

    const executeReturn = async () => {
      if (isReturning) return;
      setIsReturning(true);
      setReturnError(false);
      try {
        await waitForPendingVotes();
        await selectFamilyMember(handoffLock.originMemberId);
        useDiscoveryStore.getState().setStack([]);
        useDiscoveryStore.getState().setHandoffTurnCompleted(false);
        clearHandoffLock();
        setShowExitConfirm(false);
        useUiStore.getState().addToast({
          type: 'success',
          message: tWithVars(
            'discovery.passThePhone.welcomeBackToast',
            "Welcome back, {{origin}} — {{participant}}'s votes are saved.",
            { origin: originName, participant: activeName },
            locale
          ),
        });
      } catch {
        setReturnError(true);
        setShowExitConfirm(true);
      } finally {
        setIsReturning(false);
      }
    };

    const handleDockReturnClick = () => {
      if (hasRemainingCards) {
        setReturnError(false);
        setShowExitConfirm(true);
      } else {
        void executeReturn();
      }
    };

    return (
      <>
        <nav
          data-testid="app-bottom-navigation"
          aria-label={tWithVars(
            'discovery.passThePhone.dockTurn',
            "{{name}}'s turn",
            { name: activeName },
            locale
          )}
          className={[
            'fixed bottom-0 left-0 right-0 z-30 flex items-center justify-center pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-1 glass-nav',
            className,
          ].join(' ')}
        >
          <div
            data-testid="handoff-dock"
            className="flex w-full max-w-md flex-wrap items-center justify-between gap-2 px-5 py-1"
          >
            <span data-testid="handoff-dock-turn" className="text-sm font-bold text-ink-body">
              {tWithVars(
                'discovery.passThePhone.dockTurn',
                "{{name}}'s turn",
                { name: activeName },
                locale
              )}
            </span>
            <button
              type="button"
              data-testid="handoff-dock-return"
              disabled={isReturning}
              aria-busy={isReturning}
              onClick={handleDockReturnClick}
              aria-label={tWithVars(
                'discovery.passThePhone.dockReturnAria',
                'Back to {{name}}',
                { name: originName },
                locale
              )}
              className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-full px-3 text-sm font-semibold text-ink-muted transition-colors hover:text-ink-body disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body"
            >
              {tWithVars(
                'discovery.passThePhone.dockReturn',
                '← Back to {{name}}',
                { name: originName },
                locale
              )}
            </button>
          </div>
        </nav>

        <Modal
          isOpen={showExitConfirm}
          onClose={() => {
            if (!isReturning) {
              setShowExitConfirm(false);
              setReturnError(false);
            }
          }}
          title={tWithVars(
            'discovery.passThePhone.exitConfirmTitle',
            'Return to {{name}}?',
            { name: originName },
            locale
          )}
        >
          <div data-testid="handoff-exit-modal" className="space-y-4">
            <p className="text-sm text-ink-muted">
              {tWithVars(
                'discovery.passThePhone.exitConfirmBody',
                "{{name}}'s votes so far are saved.",
                { name: activeName },
                locale
              )}
            </p>

            {returnError && (
              <div
                role="alert"
                data-testid="handoff-exit-error"
                className="rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-sm text-hearth-ink"
              >
                <p className="font-bold">
                  {tWithVars(
                    'discovery.passThePhone.switchError',
                    "Couldn't switch to {{name}} just now.",
                    { name: originName },
                    locale
                  )}
                </p>
                <p className="mt-0.5">
                  {tWithVars(
                    'discovery.passThePhone.stillSelected',
                    '{{name}} is still selected.',
                    { name: activeName },
                    locale
                  )}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <button
                type="button"
                disabled={isReturning}
                aria-busy={isReturning}
                data-testid="handoff-exit-confirm"
                onClick={() => void executeReturn()}
                className="min-h-12 w-full min-w-0 break-words rounded-2xl bg-hearth-fill px-4 py-3 text-sm font-bold text-cream-100 transition-colors hover:bg-hearth-fill-hover active:bg-hearth-fill-active disabled:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body sm:flex-1"
              >
                {isReturning
                  ? tWithVars(
                      'discovery.passThePhone.returningBusy',
                      'Returning to {{name}}…',
                      { name: originName },
                      locale
                    )
                  : returnError
                    ? t('discovery.passThePhone.tryAgain', 'Try again', locale)
                    : tWithVars(
                        'discovery.passThePhone.exitConfirmAction',
                        'Back to {{name}}',
                        { name: originName },
                        locale
                      )}
              </button>
              <button
                type="button"
                disabled={isReturning}
                data-testid="handoff-exit-cancel"
                onClick={() => {
                  setShowExitConfirm(false);
                  setReturnError(false);
                }}
                className="min-h-12 w-full min-w-0 break-words rounded-2xl border border-chrome-line bg-white px-4 py-3 text-sm font-semibold text-ink-body transition-colors hover:bg-charcoal-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body sm:flex-1"
              >
                {t('discovery.passThePhone.exitKeepVoting', 'Keep voting', locale)}
              </button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

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
