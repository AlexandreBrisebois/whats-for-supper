# PWA Source Structure

This document outlines the actual folder structure for `pwa/src` as of Phase 1.

## Directory Tree

```
pwa/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (IdentityValidator)
│   │   ├── globals.css               # Global styles & Design Tokens
│   │   ├── (auth)/                   # Public / Onboarding flows
│   │   │   └── onboarding/           # "Who are you?" flow
│   │   ├── (app)/                    # Authenticated flows
│   │   │   ├── home/                 # Dashboards & Greetings
│   │   │   ├── capture/              # Recipe Camera & Upload
│   │   │   └── discovery/            # Recipe Search & Browse
│   │   └── api/                      # Next.js API Routes (Health, Proxies)
│   │
│   ├── components/                   # UI Components (Feature-driven)
│   │   ├── common/                   # Shared (Buttons, Cards, Modals)
│   │   ├── capture/                  # Camera & Image Review
│   │   ├── identity/                 # Family Selection & Add Member
│   │   ├── home/                     # Greeting sections
│   │   ├── layout/                   # Page headers, navigation bars
│   │   ├── discovery/                # Search and exploration
│   │   └── ui/                       # Low-level primitives (Radix, etc)
│   │
│   ├── hooks/                        # Custom React Hooks
│   │   ├── useCapture.ts             # Image processing logic
│   │   ├── useDevice.ts              # Mobile/Tablet detection
│   │   ├── useFamily.ts              # Family state interaction
│   │   ├── useMediaQuery.ts          # Responsive breakpoints
│   │   └── index.ts                  # Public hook exports
│   │
│   ├── lib/                          # Pure Utilities & Logic
│   │   ├── api/                      # API Clients (client.ts, server-client.ts)
│   │   ├── constants/                # App-wide config (config.ts, routes.ts)
│   │   ├── identity/                 # Cookie-based identity helpers
│   │   ├── i18n/                     # Translation logic
│   │   ├── mock/                     # Stateful Mock API for testing
│   │   └── imageUtils.ts             # Compression & Cropping
│   │
│   ├── store/                        # Global State (Zustand)
│   │   ├── familyStore.ts            # Active member & Family data
│   │   ├── onboardingStore.ts        # Setup progress
│   │   ├── uiStore.ts                # Modals, drawers, and global UI state
│   │   └── index.ts                  # Store accessors
│   │
│   ├── locales/                      # i18n Translation Files (JSON)
│   │   ├── en/                       # English
│   │   ├── fr/                       # French
│   │   └── index.ts                  # i18n configuration
│   │
│   └── types/                        # TypeScript Definitions
│       ├── domain.ts                 # Business objects (Recipe, FamilyMember)
│       ├── api.ts                    # Request/Response contracts
│       ├── ui.ts                     # Component prop types
│       └── index.ts                  # Type exports
│
├── public/                           # Static assets & PWA manifestations
├── .env.local.example                # Environment variable template (PWA local)
├── .env.local                        # Local dev overrides (git-ignored)
├── next.config.js                    # Next.js configuration (Rewrites, Proxy)
├── tailwind.config.ts                # Design System & Tokens
└── README.md                         # PWA setup guide
```

## Key Principles

### 1. **Feature-First Organization**

Group related components by business capability (`capture`, `identity`). This keeps the `src/components/` folder manageable as the app grows.

### 2. **State Management (Zustand)**

Use focused stores rather than one massive global object. The `familyStore` is the source of truth for "Who is currently using the app."

### 3. **API Consistency**

All external communication flows through `src/lib/api/`.

- `client.ts`: Used for client-side fetches (includes the `X-Family-Member-Id` interceptor).
- `server-client.ts`: Used for Server Components (proxies through the internal Docker network).

### 4. **Localization**

Never hardcode strings in components. Use the `t()` helper from `next-intl` and store content in `src/locales/`.

## Naming Conventions

- **Files**: `kebab-case.tsx` or `kebab-case.ts`.
- **Hooks**: Start with `use` (e.g., `useCapture.ts`).
- **Stores**: End with `Store.ts` (e.g., `familyStore.ts`).
- **Styles**: Use Tailwind utility classes via `className`. Use Design Tokens from `tailwind.config.ts` for consistency.
