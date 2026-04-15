'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, UserCircle, Camera } from 'lucide-react';

import { ROUTES } from '@/lib/constants/routes';

const NAV_ITEMS = [
  { href: ROUTES.HOME, label: 'Home', icon: Home },
  { href: ROUTES.ONBOARDING, label: 'Profile', icon: UserCircle },
  { href: ROUTES.CAPTURE, label: 'Capture', icon: Camera },
] as const;

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Bottom nav — mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-sage-green/20 bg-cream pb-[env(safe-area-inset-bottom)] shadow-glass md:hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors',
                active ? 'text-terracotta' : 'text-charcoal-400 hover:text-sage-green',
              ].join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.75}
                aria-hidden="true"
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Horizontal nav — desktop */}
      <nav className="hidden items-center gap-6 md:flex">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={[
                'text-sm font-medium transition-colors',
                active
                  ? 'text-terracotta underline underline-offset-4'
                  : 'text-cream/80 hover:text-cream',
              ].join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
