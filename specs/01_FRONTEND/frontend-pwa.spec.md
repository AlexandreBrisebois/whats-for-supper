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
