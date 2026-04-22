# Frontend PWA Specification

**Status**: AUTHORITATIVE  
**Lane**: 01_FRONTEND  
**Source of Truth for**: Visuals, UX, and PWA Client Logic.

---

## 1. Technology Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16.2.3 (App Router) | Current stable release; SSR for speed |
| Language | TypeScript 5.7+ | Type safety across components |
| Styling | Tailwind CSS 3.4+ | Design tokens in `tailwind.config.ts` |
| State | Zustand 5.0+ | Lightweight client store |
| Animation | Framer Motion | Snappy card physics and transitions |

---

## 2. Design System: Solar Earth

### 2.1 Color Palette
- **Background**: `#FDFCF0` (Cream)
- **Primary**: `#CD5D45` (Terracotta) - *Use for Veto/Dislike*
- **Secondary**: `#E1AD01` (Ochre)
- **Accent**: `#8A9A5B` (Sage) - *Use for Like/Approve*
- **Text**: `#1F2937` (Charcoal)

### 2.2 Aesthetic Standards
- **Glassmorphism**: Subtle backdrop-blur and soft shadows (`0 8px 30px rgba(0,0,0,0.04)`).
- **Typography**: *Outfit* or *Inter* (Sans); *Playfair Display* (Serif headings).
- **Corners**: Rounded (8px - 12px).

---

## 3. Core UX: The Matchmaking Discovery (Phase 3)

The heart of social engagement—a card-based collaborative voting system.

### 3.1 The Card Stack
- **Hero Focus**: Single large card (75% image area) to minimize cognitive load.
- **Interactions**: 
    - **Swipe Right**: Like/Plan.
    - **Swipe Left**: Dislike/Veto.
- **Consensus**: When 2+ members "Like" a recipe, it's flagged as a **Family Match**.
- **Veto Dominance**: A single "Dislike" removes the recipe from the deck for all members.

### 3.2 UI Design Tokens
- **Palette**: Terracotta for Veto, Sage Green for Like.
- **Animation**: Spring-based snap-back for uncommitted swipes.

---

## 4. Identity & API Contract

### 4.1 Identity Flow
- **Key**: `x-family-member-id` (header and cookie).
- **Onboarding**: Redirect to `/onboarding` if cookie is missing.
- **Persistence**: 30-day persistent cookie.

### 4.2 API Communication
- All 2xx responses are wrapped in `{ data: ... }`.
- Client-side interceptor in `lib/api/client.ts` handles the header and unwrapping.
