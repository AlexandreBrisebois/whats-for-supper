'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, UserCircle, Camera, Calendar, LucideIcon } from 'lucide-react';
import type { Route } from 'next';

import { ROUTES } from '@/lib/constants/routes';

interface RegularNavItem {
  href: Route;
  label: string;
  icon: LucideIcon;
}

interface PrimaryNavItem {
  href: Route;
  label: string;
  isPrimary: true;
}

type NavItem = RegularNavItem | PrimaryNavItem;

const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.HOME as Route, label: 'Home', icon: Home },
  { href: ROUTES.CAPTURE as Route, label: 'Capture', icon: Camera },
  { href: ROUTES.DISCOVERY as Route, label: 'Discover', isPrimary: true },
  { href: ROUTES.PLANNER as Route, label: 'Planner', icon: Calendar },
  { href: ROUTES.ONBOARDING as Route, label: 'Profile', icon: UserCircle },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-end justify-around border-t border-indigo/20 bg-lavender/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg shadow-glass">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;

        if ('isPrimary' in item && item.isPrimary) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative -top-4 flex h-16 w-16 items-center justify-center rounded-full bg-white p-1 shadow-lg shadow-indigo/20 transition-transform active:scale-95"
              aria-current={active ? 'page' : undefined}
            >
              <div
                className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 p-0.5 ${
                  active ? 'ring-2 ring-indigo ring-offset-2 ring-offset-lavender' : ''
                }`}
              >
                <div className="flex h-full w-full items-center justify-center rounded-full relative overflow-hidden">
                  <Image
                    src="/logo.png"
                    alt="Discover"
                    fill
                    sizes="64px"
                    className="object-contain scale-[1.2]"
                    priority
                    unoptimized
                  />
                </div>
              </div>
            </Link>
          );
        }

        const Icon = 'icon' in item ? item.icon : null;
        if (!Icon) return null;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-medium transition-colors',
              active ? 'text-indigo' : 'text-charcoal-400 hover:text-indigo',
            ].join(' ')}
            aria-current={active ? 'page' : undefined}
          >
            <Icon
              size={20}
              strokeWidth={active ? 2.5 : 1.75}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
