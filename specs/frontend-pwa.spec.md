# Frontend PWA Specification

The "What's For Supper" frontend is a mobile-first Progressive Web App (PWA) built with **Next.js**. It is the primary interface for all family interactions: identity selection, recipe capture, weekly planning, and discovery.

## 1. Technology Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js (App Router) | SSR for initial load speed; API routes for BFF pattern; aligns with project direction |
| Language | TypeScript | Type safety across components and API contracts |
| Styling | Tailwind CSS | Utility-first; easy to enforce design tokens and responsive breakpoints |
| State | Zustand | Lightweight client store for identity, planner state, and inspiration pool |
| PWA | `next-pwa` (Workbox) | Service Worker generation; offline caching; home screen installability |
| Animations | Framer Motion | Swipe physics, card transitions, micro-animations |
| Camera | `react-webcam` or native `getUserMedia` | Camera access for recipe capture |

## 2. Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout, design tokens, font loading
│   ├── page.tsx                # Home: redirects based on identity state
│   ├── onboarding/
│   │   └── page.tsx            # Phase 0: "Who are you?" profile selection
│   ├── capture/
│   │   └── page.tsx            # Phase 1: Camera + rating + save
│   ├── planner/
│   │   └── page.tsx            # Phase 2: Weekly dashboard
│   ├── discovery/
│   │   └── page.tsx            # Phase 3: Swipe card UI
│   └── settings/
│       └── page.tsx            # Family management, profile switch
├── components/
│   ├── identity/
│   │   ├── ProfileCard.tsx
│   │   └── WhoAreYouOverlay.tsx
│   ├── capture/
│   │   ├── CameraCapture.tsx
│   │   ├── PhotoGallery.tsx
│   │   └── RatingSelector.tsx
│   ├── planner/
│   │   ├── DayScrubber.tsx
│   │   ├── MealSlot.tsx
│   │   └── WeeklyList.tsx
│   ├── discovery/
│   │   ├── SwipeCard.tsx
│   │   ├── CardStack.tsx
│   │   └── SwipeStamp.tsx
│   └── ui/
│       ├── GlassPanel.tsx
│       └── Spinner.tsx
├── lib/
│   ├── api.ts                  # Typed fetch wrappers for the Recipe API
│   ├── identity.ts             # Cookie read/write for X-Family-Member-Id
│   └── store.ts                # Zustand store definitions
└── styles/
    └── globals.css             # Design token CSS variables
```

## 3. Identity & Cookie

- On first launch, if no identity cookie exists, redirect to `/onboarding`.
- The selected `familyMemberId` is stored in a **persistent cookie** (30-day expiry, `SameSite=Lax`).
- Every API call includes the `X-Family-Member-Id` header, populated from the cookie value via `lib/identity.ts`.
- Profile switching is available in Settings; clears the cookie and redirects to `/onboarding`.

## 4. API Communication

All API calls go through `lib/api.ts` which:
- Reads the identity cookie and injects `X-Family-Member-Id` on every request.
- Targets the `NEXT_PUBLIC_API_BASE_URL` environment variable.
- Returns typed response objects matching the API spec contracts.

## 5. PWA Configuration

- `manifest.json` per [recipe-pwa.spec.md §2](recipe-pwa.spec.md).
- Service Worker caches: shell assets, API GET responses (family list, planner data).
- Offline fallback page shown when network is unavailable.
- `theme_color`: `#6366F1`, `background_color`: `#F5F3FF`.

## 6. Design Token Reference

See [recipe-pwa.spec.md §1](recipe-pwa.spec.md) for color palettes (Earth Tones / Vibrant Tones), typography, and accessibility standards. Tokens are defined as CSS custom properties in `globals.css`.

## 7. Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| `< 768px` | Single-column, bottom-fixed actions, full-width cards |
| `768px – 1024px` | Centered-constrained (max-width: 640px), tablet-optimized |
| `> 1024px` | Two-column or constrained centered layout |

## 8. Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the Recipe API (e.g., `http://nas:5000`) |

## 9. Phase Rollout

| Phase | Route | Features |
|---|---|---|
| 0 | `/onboarding` | Profile selection, cookie persistence |
| 1 | `/capture` | Camera, photo gallery, 4-point rating, upload |
| 2 | `/planner` | Weekly list, day scrubber, sparse meal slots |
| 3 | `/discovery` | Swipe card stack, stamps, inspiration pool |
| 4 | `/settings` | Family management, profile switch |
