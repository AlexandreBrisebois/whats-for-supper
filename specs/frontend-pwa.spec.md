# Frontend PWA Specification

The "What's For Supper" frontend is a mobile-first Progressive Web App (PWA) built with **Next.js**. It is the primary interface for all family interactions: identity selection, recipe capture, weekly planning, and discovery.

## 1. Technology Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16.2.3 (App Router) | Current stable release; SSR for speed; built-in API routing |
| Language | TypeScript 5.7+ | Type safety across components and API contracts |
| Styling | Tailwind CSS 3.4+ | Utility-first; design tokens centralized in `tailwind.config.ts` |
| State | Zustand 5.0+ | Lightweight client store for identity and UI state |
| I18n | `next-intl` 4.9+ | Server-side internationalization support |
| Icons | Lucide React 0.468+ | Consistent, accessible iconography |

## 2. Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout, design tokens, fonts
│   ├── page.tsx                  # Landing/Safe Redirect
│   ├── (auth)/                   # Identity flows
│   │   ├── onboarding/
│   │   │   └── page.tsx          # "Who are you?" selection
│   │   └── settings/
│   │       └── page.tsx          # Phase 4: Family management
│   ├── (app)/                    # App-shell flows
│   │   ├── home/
│   │   ├── capture/
│   │   ├── planner/
│   │   └── discovery/
│   └── api/                      # BFF Routes (Proxied to backend)
├── components/
│   ├── identity/                 # IdentityValidator, Profile cards
│   ├── capture/                  # CameraView, ImageReview, Rating
│   ├── common/                   # Navigation, Layout, Header
│   └── ui/                       # Button, Card, Spinner
├── lib/
│   ├── api/                      # typed fetch (client/server-client)
│   ├── constants/                # Routes, config
│   └── i18n/                     # next-intl configuration
└── store/                        # identity-store, ui-store
```

## 3. Identity & Cookie

- On first launch, if no identity cookie exists, redirect to `/onboarding`.
- The selected `member_id` is stored in a **persistent cookie** (30-day expiry).
- Every API call includes the `X-Family-Member-Id` header, populated from the `member_id` cookie.
- Profile switching is handled via the onboarding page; clearing the cookie resets the state.

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

| Phase | Purpose | Features | Status |
|---|---|---|---|
| 0 | Foundation | Onboarding, Identity, Basic Capture | **Implemented** |
| 1 | AI Logic | Smart extraction, Hero images, Redis | **Next Focus** |
| 2 | Planning | Weekly dashboard, day scrubber | Planned |
| 3 | Discovery | Swipe interaction, Consensus logic | Planned |
| 4 | Management | Profile settings, recipe history | Planned |
