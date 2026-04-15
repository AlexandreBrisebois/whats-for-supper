# PWA Source Structure

This document outlines the recommended folder structure for `pwa/src` to support Phase 0 MVP and future phases.

## Directory Tree

```
pwa/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (design tokens, fonts, providers)
│   │   ├── page.tsx                  # Home (redirects based on identity state)
│   │   ├── error.tsx                 # Error boundary
│   │   ├── not-found.tsx             # 404 page
│   │   │
│   │   ├── (auth)/                   # Route group: identity flows
│   │   │   ├── onboarding/
│   │   │   │   ├── page.tsx          # Phase 0: Who are you? + hint system
│   │   │   │   └── layout.tsx        # Onboarding layout
│   │   │   └── settings/             # Phase 4+: Family management
│   │   │       └── page.tsx
│   │   │
│   │   ├── (app)/                    # Route group: authenticated flows
│   │   │   ├── capture/              # Phase 0+: Camera + upload
│   │   │   │   ├── page.tsx          # Capture flow + hints
│   │   │   │   ├── layout.tsx
│   │   │   │   └── confirm/
│   │   │   │       └── page.tsx      # Confirmation screen
│   │   │   │
│   │   │   ├── planner/              # Phase 2+: Weekly dashboard
│   │   │   │   ├── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   │
│   │   │   ├── discovery/            # Phase 3+: Swipe card UI
│   │   │   │   ├── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   │
│   │   │   └── recipes/              # Phase 4+: Recipe detail
│   │   │       ├── [id]/
│   │   │       │   └── page.tsx
│   │   │       └── layout.tsx
│   │   │
│   │   ├── api/                      # API routes (BFF pattern)
│   │   │   ├── identity/
│   │   │   │   └── route.ts          # Cookie read/write helpers
│   │   │   ├── auth/
│   │   │   │   └── route.ts          # Session management
│   │   │   └── health/
│   │   │       └── route.ts          # Health check endpoint
│   │   │
│   │   └── globals.css               # Design tokens, tailwind directives
│   │
│   ├── components/                   # Reusable UI components
│   │   ├── ui/                       # Primitive/basic components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Overlay.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── GlassPanel.tsx        # Glassmorphic container
│   │   │   └── index.ts              # Barrel export
│   │   │
│   │   ├── hints/                    # Hint/tour system
│   │   │   ├── HintOverlay.tsx       # Spotlight overlay component
│   │   │   ├── HintStep.tsx          # Individual hint step
│   │   │   ├── Spotlight.tsx         # Spotlight effect (canvas/SVG)
│   │   │   ├── HintPopover.tsx       # Text popover for hints
│   │   │   └── index.ts
│   │   │
│   │   ├── identity/                 # Identity/profile components
│   │   │   ├── ProfileCard.tsx       # Individual family member profile card
│   │   │   ├── ProfileList.tsx       # List of profiles to select from
│   │   │   ├── CreateProfileForm.tsx # Input form for new family member
│   │   │   ├── WhoAreYouOverlay.tsx  # Main onboarding overlay
│   │   │   └── index.ts
│   │   │
│   │   ├── capture/                  # Recipe capture components
│   │   │   ├── CameraCapture.tsx     # Camera access + photo taking
│   │   │   ├── PhotoGallery.tsx      # Horizontal scrollable gallery
│   │   │   ├── PhotoRemoveButton.tsx # Remove button for photos
│   │   │   ├── CookedMealSelector.tsx # Select which photo is the cooked meal
│   │   │   ├── RatingSelector.tsx    # 4-point emoji rating system
│   │   │   ├── RecipeForm.tsx        # Label + notes input (optional)
│   │   │   ├── SubmitButton.tsx      # Upload + loading state
│   │   │   └── index.ts
│   │   │
│   │   ├── planner/                  # Planner components (Phase 2+)
│   │   │   ├── DayScruber.tsx        # Horizontal calendar strip
│   │   │   ├── MealSlot.tsx          # Individual meal slot
│   │   │   ├── WeeklyList.tsx        # Weekly meal list
│   │   │   └── index.ts
│   │   │
│   │   ├── discovery/                # Discovery components (Phase 3+)
│   │   │   ├── SwipeCard.tsx         # Individual recipe card
│   │   │   ├── CardStack.tsx         # Stack container
│   │   │   ├── SwipeStamp.tsx        # Like/Nope stamp animation
│   │   │   ├── ActionBar.tsx         # Back/Undo buttons
│   │   │   └── index.ts
│   │   │
│   │   ├── layout/                   # Layout components
│   │   │   ├── Header.tsx            # Top navigation
│   │   │   ├── Footer.tsx            # Bottom navigation
│   │   │   ├── SafeAreaLayout.tsx    # Safe area wrapper for notches
│   │   │   └── index.ts
│   │   │
│   │   └── common/                   # Shared/utility components
│   │       ├── Loading.tsx
│   │       ├── ErrorFallback.tsx
│   │       ├── EmptyState.tsx
│   │       └── index.ts
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── useIdentity.ts            # Read/write family member ID
│   │   ├── useHintTour.ts            # Manage hint tour state
│   │   ├── useMediaQuery.ts          # Responsive breakpoints
│   │   ├── useLocalStorage.ts        # Persistent state in localStorage
│   │   ├── useAsync.ts               # Data fetching wrapper
│   │   ├── useCamera.ts              # Camera access (Phase 0+)
│   │   ├── usePlan.ts                # Planner state (Phase 2+)
│   │   ├── useDiscovery.ts           # Discovery pool state (Phase 3+)
│   │   └── index.ts                  # Barrel export
│   │
│   ├── store/                        # Zustand stores (state management)
│   │   ├── identityStore.ts          # Family member identity
│   │   ├── tourStore.ts              # Hint tour state
│   │   ├── plannerStore.ts           # Weekly planner state (Phase 2+)
│   │   ├── discoveryStore.ts         # Discovery pool + votes (Phase 3+)
│   │   ├── uiStore.ts                # UI state (modals, loading, etc)
│   │   └── index.ts                  # Barrel export
│   │
│   ├── lib/                          # Utilities and helpers
│   │   ├── api/
│   │   │   ├── client.ts             # Typed fetch wrapper
│   │   │   ├── family.ts             # Family member endpoints
│   │   │   ├── recipes.ts            # Recipe endpoints
│   │   │   ├── tours.ts              # Tour completion endpoints
│   │   │   └── types.ts              # API response types
│   │   │
│   │   ├── i18n/
│   │   │   ├── index.ts              # i18n initialization + helpers
│   │   │   ├── translate.ts          # Translation function with interpolation
│   │   │   ├── getLocale.ts          # Get current locale from cookie/storage
│   │   │   └── types.ts              # Locale types
│   │   │
│   │   ├── identity/
│   │   │   ├── cookie.ts             # Family member ID cookie helpers
│   │   │   ├── storage.ts            # localStorage helpers
│   │   │   └── types.ts
│   │   │
│   │   ├── validation/
│   │   │   ├── forms.ts              # Form validation schemas
│   │   │   └── image.ts              # Image validation (size, type, etc)
│   │   │
│   │   ├── constants/
│   │   │   ├── routes.ts             # Route paths
│   │   │   ├── api.ts                # API endpoints
│   │   │   ├── config.ts             # App configuration
│   │   │   └── theme.ts              # Design token values
│   │   │
│   │   ├── errors/
│   │   │   ├── AppError.ts           # Custom error class
│   │   │   └── errorHandler.ts       # Global error handling
│   │   │
│   │   └── utils/
│   │       ├── device.ts             # Device detection (mobile/tablet/desktop)
│   │       ├── time.ts               # Date/time utilities
│   │       ├── file.ts               # File handling (image conversion, etc)
│   │       └── dom.ts                # DOM utilities (scroll, focus, etc)
│   │
│   ├── locales/                      # i18n translation files
│   │   ├── en/
│   │   │   ├── common.json           # Buttons, shared labels
│   │   │   ├── hints.json            # Hint content for all tours
│   │   │   └── journeys.json         # Journey descriptions
│   │   ├── fr/
│   │   │   ├── common.json
│   │   │   ├── hints.json
│   │   │   └── journeys.json
│   │   └── README.md                 # How to add new languages
│   │
│   ├── types/                        # Global TypeScript types
│   │   ├── api.ts                    # API types (Request/Response)
│   │   ├── domain.ts                 # Business domain types (Recipe, Family, etc)
│   │   ├── ui.ts                     # UI prop types
│   │   ├── routes.ts                 # Route path types
│   │   └── index.ts                  # Barrel export
│   │
│   ├── context/                      # React context (if needed, avoid unless necessary)
│   │   └── ThemeContext.tsx          # Light/dark mode context (future)
│   │
│   └── middleware.ts                 # Next.js middleware (routing, redirects)
│
├── public/                           # Static assets
│   ├── icons/                        # App icons (favicon, apple-touch-icon, etc)
│   ├── images/                       # Static images
│   └── manifest.json                 # PWA manifest
│
├── .env.example                      # Environment variable template
├── .env.local                        # (gitignored) Local environment
├── .eslintrc.json                    # ESLint config
├── .prettierrc.json                  # Prettier config
├── next.config.js                    # Next.js configuration
├── tailwind.config.ts                # Tailwind CSS config (design tokens)
├── tsconfig.json                     # TypeScript config
├── package.json                      # Dependencies
├── package-lock.json                 # Lock file
└── README.md                         # PWA setup guide
```

## Key Principles

### 1. **Feature-First Organization**
- Group related components, hooks, and utils by feature (`capture/`, `identity/`, `hints/`)
- Easy to find all code related to a feature
- Simple to enable/disable features by phase

### 2. **Separation of Concerns**
- **Components**: UI only, no business logic
- **Hooks**: Component-level logic + state
- **Store**: Global state (Zustand)
- **Lib**: Pure utilities and helpers
- **Types**: Shared type definitions

### 3. **Localization-First**
- `src/locales/` is a first-class directory
- Easy to add new languages (copy `en/` to `{lang}/` and translate)
- `lib/i18n/` provides utilities for translations

### 4. **API Client Pattern**
- `lib/api/` is the single source for API calls
- All API errors go through `lib/errors/errorHandler`
- Easy to mock for testing

### 5. **Scalability**
- Structure supports Phase 0 through Phase 5+
- New phases add components in existing folders (no reorganization needed)
- Barrel exports (`index.ts`) make imports clean

## Phase 0 (MVP) - Minimal Footprint

For Phase 0, you only need:
```
src/
├── app/
│   ├── onboarding/
│   ├── capture/
│   ├── capture/confirm/
│   └── page.tsx
├── components/
│   ├── hints/
│   ├── identity/
│   ├── capture/
│   └── ui/
├── hooks/ (useIdentity, useHintTour, useCamera)
├── store/ (identityStore, tourStore)
├── lib/ (api, i18n, identity)
├── locales/ (en, fr)
├── types/
├── middleware.ts
└── globals.css
```

Other directories are added in later phases as needed.

## Future Extensibility

- **Phase 1+**: Add `planner/`, `discovery/` components
- **Phase 2+**: Add `plannerStore.ts`
- **Phase 3+**: Add `discoveryStore.ts`
- **Phase 4+**: Add `ThemeContext.tsx` for dark mode
- **Any Phase**: New languages added to `locales/` without code changes

## Naming Conventions

- **Files**: `kebab-case` for files (e.g., `photo-gallery.tsx`)
- **Folders**: `kebab-case` for folders (e.g., `photo-gallery/`)
- **Components**: `PascalCase` exports (e.g., `export default PhotoGallery`)
- **Hooks**: `useXxx` (e.g., `useIdentity`, `useHintTour`)
- **Stores**: `xxxStore` (e.g., `identityStore`, `tourStore`)
- **Types**: `PascalCase` interfaces (e.g., `interface Recipe {}`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `const MAX_IMAGE_SIZE = 20_000_000`)

## Import Organization

Keep imports organized in groups (separated by blank lines):
```typescript
// 1. React/Next
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party
import { create } from 'zustand';

// 3. Local components
import { Button } from '@/components/ui';
import { HintOverlay } from '@/components/hints';

// 4. Local hooks
import { useIdentity } from '@/hooks';

// 5. Local utils
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

// 6. Types
import type { Recipe } from '@/types';
```

## Path Aliases (tsconfig.json)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

This allows clean imports: `import Button from '@/components/ui'` instead of `../../../components/ui/Button`.
