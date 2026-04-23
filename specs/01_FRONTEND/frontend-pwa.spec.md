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
- **Organic Shapes**: Large, flowing background "blobs" in Terracotta, Ochre, and Sage to create a "sanctuary" feel.
- **Glassmorphism**: Subtle backdrop-blur (12px) and soft shadows (`0 8px 32px rgba(0,0,0,0.06)`).
- **Typography**: *Outfit* for editorial headings; *Inter* for high-legibility UI data.
- **Corners**: Large rounded corners (16px - 32px) for a soft, friendly feel.

### 2.3 Navigation Hierarchy
- **Primary Action**: **Discovery** (Center button, Compass Icon, Ochre/Solar style).
- **Ordering**: 1. Home (House), 2. Capture (Camera), 3. Discovery (Compass), 4. Planner (Calendar), 5. Profile (User).

---

## 4. Home Page: The Command Center
The Home page is designed to answer "What's for Supper?" in 2 seconds and manage prep in 10.

### 4.1 UX Components
- **Tonight's Menu Hero**: A large, editorial card with a 4:3 image ratio and glassmorphism.
- **Quick Capture Trigger**: A high-affordance Terracotta button with a Camera icon for "Zero-Friction" recipe acquisition.
- **Progressive Prep Disclosure**: A "Next Prep Step" card that shows only the immediate next task to reduce domestic anxiety.

---

## 4. Identity & API Contract

### 4.1 Identity Flow
- **Key**: `x-family-member-id` (header and cookie).
- **Onboarding**: Redirect to `/onboarding` if cookie is missing.
- **Persistence**: 30-day persistent cookie.

### 4.2 API Communication
- All 2xx responses are wrapped in `{ data: ... }`.
- Client-side interceptor in `lib/api/client.ts` handles the header and unwrapping.

---

## 5. Planner Page: The Weekly Meal Plan

### 5.1 UX Components
- **Smart Defaults Section**: Pre-selected recipes based on 51%+ family consensus (ordered by freshness). Shows vote count badges ("3 of 4 voted") and highlights unanimous recipes (100% consensus) with Ochre or Sage Green color.
- **Weekly Calendar**: 7-day vertical list (Mon–Sun) with meal cards showing recipe image and name.
- **Planning Bottom Sheet**: Quick Find (5-stack), Search, and Ask paths for selecting recipes.
- **Drag-to-Reorder**: Swipe left/right to move recipes between days.
- **Lockdown Action**: "Finalize" button to lock the week and clear votes.
- **Cook Mode Trigger**: Cooking emoji button (👨‍🍳) on the day card for today's meal to enter high-visibility step-by-step mode.

### 5.2 API Integration
**Reference**: [pwa/src/app/(app)/planner/page.tsx](../../pwa/src/app/(app)/planner/page.tsx)

| Action | Endpoint | Method | Notes |
|--------|----------|--------|-------|
| Load week | `/api/schedule?weekOffset=X` | GET | Fetch 7-day plan |
| Smart Defaults | `/api/schedule/{weekOffset}/smart-defaults` | GET | Pre-selected recipes (51%+ consensus) with vote counts |
| Assign recipe | `/api/schedule/assign` | POST | Add/update recipe for a day |
| Move recipe | `/api/schedule/move` | POST | Swap recipes between days |
| Quick Find | `/api/schedule/fill-the-gap` | GET | Load 5 suggestions |
| Finalize week | `/api/schedule/lock?weekOffset=X` | POST | Lock plan, purge votes |

### 5.3 State Management
- **Zustand Store**: `usePlannerStore` manages `currentWeek`, `meals`, `locked` state.
- **Optimistic Updates**: UI updates immediately on user action; API sync happens in background.
- **Error Handling**: Failed mutations roll back to previous state and show toast notification.

### 5.4 Smart Defaults Sub-Component

**Purpose**: Pre-populate the week with recipes the family has already voted on (51%+ consensus), reducing decision paralysis and showing app intelligence.

**Display**:
- Only appears on the active voting week (`weekOffset === 0`)
- Rendered above the day-cards grid with a visual separator
- 7-day horizontal or vertical layout mirroring the planner grid

**Recipe Card Styling**:
- **Consensus (51%+)**: Show vote count badge ("3 of 4 voted") in neutral color
- **Unanimous (100%)**: Highlight with **Ochre (#E1AD01)** or **Sage Green (#8A9A5B)**, add `✓ Locked` badge
- **Hero Image**: 64x64px rounded, with subtle shadow
- **Open Slots**: Dashed Terracotta border, pulsing "+" icon, "Vote to fill" hint text

**Interactions**:
- Click empty slot → opens planning pivot sheet (Quick Find, Search, Ask paths)
- Refresh button → reloads vote state and updates pre-selection in real-time
- No drag-to-reorder; slots are fixed pending user voting (preserve consensus signal)

**Reference**: [pwa/src/components/planner/SmartDefaults.tsx](../../pwa/src/components/planner/SmartDefaults.tsx)

### 5.5 Design Conformance
- **Background**: Cream (`#FDFCF0`) with flowing blob accents.
- **Cards**: Large rounded corners (16px), glassmorphism on active cards.
- **Animation**: Framer Motion staggered entrance, smooth reorder transitions.
- **Typography**: *Outfit* for day labels, *Inter* for recipe names.
- **Consensus Colors**: Ochre (#E1AD01) for "Solar" energy (unanimous), Sage (#8A9A5B) for calm agreement.
