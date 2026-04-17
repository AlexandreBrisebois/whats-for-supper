# PWA Source Structure

This document outlines the recommended folder structure for `pwa/src` to support Phase 0 MVP and future phases.

## Directory Tree

```
pwa/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout
│   │   ├── (auth)/                   # Identity flows
│   │   │   ├── onboarding/
│   │   │   │   └── page.tsx          # "Who are you?"
│   │   ├── (app)/                    # Authenticated flows
│   │   │   ├── home/
│   │   │   │   └── page.tsx
│   │   │   ├── capture/
│   │   │   │   ├── page.tsx
│   │   │   │   └── confirm/
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
│   └── proxy.ts                      # Next.js proxy (routing, redirects)
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
├── proxy.ts
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
