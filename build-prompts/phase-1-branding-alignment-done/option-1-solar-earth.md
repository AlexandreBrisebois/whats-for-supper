# Branding Option 1: Solar Earth (Recommended)

**Goal:** Pivot the design to a warm, organic, and utility-focused "Command Center" aesthetic.

## Task Overview
You are implementing the **Solar Earth** branding. This involves updating the design system and the core PWA layout to feel grounded and family-centric.

## Context Needed
- `docs/creative-direction-north-star.md`
- `docs/agent-designer-identity.md` (for design philosophy)
- `pwa/src/app/globals.css`
- `pwa/tailwind.config.ts`

## Step 1: Design Tokens & Base CSS
Update `pwa/src/app/globals.css` and `pwa/tailwind.config.ts` to implement the new palette:
- **Primary**: Terracotta (#CD5D45) - Representing the hearth.
- **Secondary**: Ochre (#E1AD01) - Representing energy and warmth.
- **Accent**: Sage Green (#8A9A5B) - Representing freshness and nature.
- **Background**: Soft Cream (#FDFCF0) / Lavender fallback.
- **Surface**: Glassmorphism with 70% opacity and 12px blur.

**Typography**: 
- Import 'Outfit' and 'Inter' from Google Fonts.
- Set 'Outfit' as the primary heading font (Tracking: -0.02em).

## Step 2: Persistent Layout (The "Command Center" Shell)
Modify `pwa/src/components/common/Header.tsx` and `Layout.tsx`:
- **Navigation**: Update the bottom nav to 4 items + a central Floating Action Button (FAB) for "Capture".
- **Visuals**: Use organic gradients in the background (linear-gradient(135deg, #FDFCF0 0%, #F5F3FF 100%)).
- **Glassmorphism**: Ensure all cards use the new `.glass` utility with the Solar Earth border color (`rgba(205, 93, 69, 0.1)`).

## Step 3: Home Page Transformation
Overhaul `pwa/src/app/(app)/home/page.tsx`:
- **Hero Card**: Replace the "Welcome" text with a "Tonight's Menu" hero section.
- **Prep Checklist**: Add a section for daily prep tasks (e.g., "Defrost Chicken", "Chop Veggies").
- **Family Pulse**: Add a "Recent Captures" section showing what others in the family have added.

## Step 4: Zero-Friction Capture
Modify the capture entry point:
- **Direct Access**: The central FAB should open a minimalist entry screen that immediately triggers the device's native camera or gallery via `<input type="file" accept="image/*" capture="environment">`.
- **Low Cognitive Load**: No custom viewfinder or overlays. Focus on speed and native OS stability.

## Guidelines
- **Reachability**: Primary actions must be within the bottom 40% of the screen.
- **Contrast**: Maintain WCAG AA compliance for all text.
- **Personality**: Keep the UI warm, not clinical. Use rounded corners (16px - 24px) for cards.
