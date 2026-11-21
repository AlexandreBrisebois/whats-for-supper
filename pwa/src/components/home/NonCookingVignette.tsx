'use client';

import { useId } from 'react';
import type { NonCookingPlanDto } from '@/lib/api/generated/models';
import { NonCookingIcon } from '../planner/NonCookingIcon';
import { cn } from '@/lib/utils';

type ResolvedNonCookingKind = NonCookingPlanDto['kind'];

interface NonCookingVignetteProps {
  kind?: NonCookingPlanDto['kind'] | null;
  testId?: string;
  className?: string;
}

function resolveKind(kind?: NonCookingPlanDto['kind'] | null): ResolvedNonCookingKind {
  if (kind === 'eating_out' || kind === 'custom' || kind === 'mystery' || kind === 'order_in') {
    return kind;
  }
  return 'order_in';
}

export function NonCookingVignette({ kind, testId, className }: NonCookingVignetteProps) {
  const uid = useId().replace(/:/g, '');
  const resolvedKind = resolveKind(kind);
  const bgId = `vignette-bg-${uid}`;
  const haloId = `vignette-halo-${uid}`;
  const clipId = `vignette-clip-${uid}`;

  return (
    <div
      data-testid={testId}
      data-vignette-kind={resolvedKind}
      aria-hidden="true"
      className={cn(
        'relative aspect-[25/11] w-full shrink-0 overflow-hidden rounded-[2rem] border border-garden-line bg-sage-50',
        className
      )}
    >
      <svg
        data-vignette-scene="true"
        viewBox="0 0 300 132"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
        className="block h-full w-full"
      >
        <defs>
          {resolvedKind === 'mystery' ? (
            <>
              <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--color-ochre-50)" />
                <stop offset="55%" stopColor="var(--color-cream)" />
                <stop offset="100%" stopColor="var(--color-sage-50)" />
              </linearGradient>
              <radialGradient id={haloId} cx="50%" cy="46%" r="44%">
                <stop offset="0%" stopColor="var(--color-ochre-300)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--color-cream)" stopOpacity="0" />
              </radialGradient>
            </>
          ) : (
            <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-sage-50)" />
              <stop offset="100%" stopColor="var(--color-cream)" />
            </linearGradient>
          )}
          <clipPath id={clipId}>
            <rect x="0" y="0" width="300" height="132" rx="22" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <rect
            className="cookbook-vignette-decor"
            x="0"
            y="0"
            width="300"
            height="132"
            fill={`url(#${bgId})`}
          />

          {resolvedKind === 'eating_out' && (
            <>
              <g className="cookbook-vignette-decor">
                <path
                  d="M 0 100 Q 150 84 300 100 L 300 132 L 0 132 Z"
                  fill="var(--color-sage-100)"
                  opacity="0.55"
                />
                <path
                  d="M 28 98 C 22 72, 42 56, 58 60 C 56 76, 44 92, 28 98 Z"
                  fill="var(--color-sage-200)"
                  opacity="0.6"
                />
                <path
                  d="M 48 102 C 56 80, 74 74, 86 80 C 78 92, 62 100, 48 102 Z"
                  fill="var(--color-sage-200)"
                  opacity="0.45"
                />
                <path
                  d="M 272 98 C 278 72, 258 56, 242 60 C 244 76, 256 92, 272 98 Z"
                  fill="var(--color-sage-200)"
                  opacity="0.6"
                />
                <circle cx="96" cy="40" r="4" fill="var(--color-ochre)" opacity="0.7" />
                <circle cx="206" cy="46" r="3.5" fill="var(--color-terracotta-200)" />
              </g>
              <ellipse
                cx="150"
                cy="96"
                rx="58"
                ry="12"
                fill="var(--color-cream-50)"
                stroke="var(--role-garden-line)"
                strokeWidth="1.2"
              />
            </>
          )}

          {resolvedKind === 'order_in' && (
            <>
              <g className="cookbook-vignette-decor">
                <path
                  d="M 0 98 Q 150 90 300 98 L 300 132 L 0 132 Z"
                  fill="var(--color-sage-100)"
                  opacity="0.58"
                />
                <g opacity="0.85">
                  <path
                    d="M 38 74 L 78 74 L 73 100 L 43 100 Z"
                    fill="var(--color-cream-50)"
                    stroke="var(--color-sage-200)"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 34 74 L 44 66 L 72 66 L 82 74 Z"
                    fill="var(--color-sage-50)"
                    stroke="var(--color-sage-200)"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 52 58 C 49 52, 55 48, 52 42"
                    fill="none"
                    stroke="var(--color-sage-200)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 63 56 C 60 50, 66 45, 63 39"
                    fill="none"
                    stroke="var(--color-terracotta-200)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </g>
                <g opacity="0.85">
                  <path
                    d="M 258 84 C 266 64, 250 52, 236 56 C 238 70, 246 80, 258 84 Z"
                    fill="var(--color-sage-200)"
                    opacity="0.55"
                  />
                  <path
                    d="M 218 82 L 266 82 C 264 96, 254 102, 242 102 C 230 102, 220 96, 218 82 Z"
                    fill="var(--color-cream-50)"
                    stroke="var(--color-sage-200)"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="214"
                    y1="78"
                    x2="270"
                    y2="73"
                    stroke="var(--color-sage-200)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="216"
                    y1="81"
                    x2="270"
                    y2="79"
                    stroke="var(--color-sage-200)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </g>
                <circle cx="98" cy="36" r="3.5" fill="var(--color-terracotta-200)" />
                <circle cx="204" cy="38" r="4" fill="var(--color-ochre)" opacity="0.72" />
              </g>
              <rect
                x="96"
                y="88"
                width="108"
                height="16"
                rx="8"
                fill="var(--color-cream-50)"
                stroke="var(--role-garden-line)"
                strokeWidth="1.2"
              />
              <line
                className="cookbook-vignette-decor"
                x1="112"
                y1="96"
                x2="188"
                y2="96"
                stroke="var(--color-sage-100)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </>
          )}

          {resolvedKind === 'custom' && (
            <>
              <g className="cookbook-vignette-decor">
                <path
                  d="M 0 102 Q 150 86 300 102 L 300 132 L 0 132 Z"
                  fill="var(--color-sage-100)"
                  opacity="0.55"
                />
                <path
                  d="M 30 94 C 24 68, 42 54, 58 60 C 56 74, 44 88, 30 94 Z"
                  fill="var(--color-sage-200)"
                  opacity="0.55"
                />
                <path
                  d="M 270 94 C 276 68, 258 54, 242 60 C 244 74, 256 88, 270 94 Z"
                  fill="var(--color-sage-200)"
                  opacity="0.55"
                />
                <g transform="rotate(-4, 150, 68)">
                  <rect
                    x="76"
                    y="34"
                    width="148"
                    height="68"
                    rx="14"
                    fill="var(--color-charcoal-50)"
                    stroke="var(--color-sage-200)"
                    strokeWidth="1.2"
                  />
                </g>
                <path
                  d="M 142 98 L 158 98 L 158 118 L 150 112 L 142 118 Z"
                  fill="var(--color-terracotta-200)"
                  opacity="0.85"
                />
                <path
                  d="M 228 28 L 230 33 L 235 35 L 230 37 L 228 42 L 226 37 L 221 35 L 226 33 Z"
                  fill="var(--color-ochre)"
                  opacity="0.8"
                />
                <circle cx="64" cy="40" r="3.5" fill="var(--color-terracotta-200)" />
              </g>
              <rect
                x="78"
                y="36"
                width="144"
                height="66"
                rx="14"
                fill="var(--color-cream-50)"
                stroke="var(--role-garden-line)"
                strokeWidth="1.3"
              />
              <g className="cookbook-vignette-decor">
                <line
                  x1="92"
                  y1="54"
                  x2="112"
                  y2="54"
                  stroke="var(--role-chrome-line)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="92"
                  y1="64"
                  x2="108"
                  y2="64"
                  stroke="var(--role-chrome-line)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="92"
                  y1="74"
                  x2="110"
                  y2="74"
                  stroke="var(--role-chrome-line)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="188"
                  y1="54"
                  x2="208"
                  y2="54"
                  stroke="var(--role-chrome-line)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="192"
                  y1="64"
                  x2="208"
                  y2="64"
                  stroke="var(--role-chrome-line)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="190"
                  y1="74"
                  x2="208"
                  y2="74"
                  stroke="var(--role-chrome-line)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            </>
          )}

          {resolvedKind === 'mystery' && (
            <>
              <g className="cookbook-vignette-decor">
                <rect x="0" y="0" width="300" height="132" fill={`url(#${haloId})`} />
                <path
                  d="M 0 100 Q 150 86 300 100 L 300 132 L 0 132 Z"
                  fill="var(--color-sage-100)"
                  opacity="0.48"
                />
                <path
                  d="M 96 96 C 96 56, 204 56, 204 96 Z"
                  fill="var(--color-cream-50)"
                  fillOpacity="0.65"
                  stroke="var(--color-sage-200)"
                  strokeWidth="1.2"
                />
                <path
                  d="M 28 96 C 22 74, 40 60, 54 64 C 52 78, 42 90, 28 96 Z"
                  fill="var(--color-sage-200)"
                  opacity="0.5"
                />
                <path
                  d="M 272 96 C 278 74, 260 60, 246 64 C 248 78, 258 90, 272 96 Z"
                  fill="var(--color-sage-200)"
                  opacity="0.5"
                />
                <path
                  d="M 74 34 L 76 40 L 82 42 L 76 44 L 74 50 L 72 44 L 66 42 L 72 40 Z"
                  fill="var(--color-ochre)"
                  opacity="0.85"
                />
                <path
                  d="M 226 30 L 227.5 34.5 L 232 36 L 227.5 37.5 L 226 42 L 224.5 37.5 L 220 36 L 224.5 34.5 Z"
                  fill="var(--color-ochre)"
                  opacity="0.75"
                />
                <circle cx="212" cy="54" r="3.5" fill="var(--color-terracotta-200)" />
                <circle cx="88" cy="64" r="3" fill="var(--color-terracotta-200)" />
              </g>
              <rect
                x="86"
                y="94"
                width="128"
                height="8"
                rx="4"
                fill="var(--color-cream-50)"
                stroke="var(--role-garden-line)"
                strokeWidth="1.2"
              />
            </>
          )}
        </g>
      </svg>

      <div className="pointer-events-none absolute left-1/2 top-[46%] flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-garden-line bg-white text-garden-ink shadow-sm">
        <NonCookingIcon kind={resolvedKind} size={32} strokeWidth={1.8} />
      </div>
    </div>
  );
}
