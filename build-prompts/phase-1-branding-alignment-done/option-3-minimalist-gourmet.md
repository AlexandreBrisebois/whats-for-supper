# Branding Option 3: Gourmet Editorial (Solar Minimalism)

**Goal:** Create a high-end, editorial-style experience where the food is the hero, framed by the warm, sophisticated canvas of the Solar Earth identity.

## Task Overview
You are implementing the **Gourmet Editorial** variant. This involves high-end typography, expansive negative space, and a focus on macro photography, all within the **Soft Cream** and **Terracotta** color story.

## Context Needed
- `docs/creative-direction-north-star.md`
- `docs/agent-designer-identity.md`
- `pwa/src/app/globals.css`
- `specs/mockups/solar_earth_home.png`

## Step 1: Solar Canvas & Editorial Typography
Update `pwa/src/app/globals.css`:
- **Canvas (Background)**: Soft Cream (#FDFCF0).
- **Primary Text**: Soft Charcoal (#1F2937) for legibility.
- **Accents**: Terracotta (#CD5D45) for call-to-actions.
- **Font-Family**: 
    - Display (Headings): 'Outfit' (Variable, Tracking: -0.02em).
    - UI (Body/Data): 'Inter' (Optimized for small text).
- **Spacing**: Increase default padding between sections to create a more "magazine" feel.

## Step 2: The "Lush" Gallery
Modify `pwa/src/components/capture/ImageReview.tsx` and `DiscoveryCard.tsx`:
- **No Heavy Borders**: Use subtle 1px borders in `rgba(205, 93, 69, 0.1)` (Terracotta tint).
- **Image Aspect Ratios**: Use cinematic 16:9 or 4:3 for hero images. Ensure they are the primary focus of the page.
- **Micro-Copy**: Use small 'Inter' caps with generous tracking (e.g., "PREP TIME: 20 MIN") for a sophisticated touch.

## Step 3: Minimalist Navigation
- **Header**: Use a transparent background with a 12px blur (glassmorphism) over the Soft Cream canvas.
- **Navigation**: Use thin-stroke icons. The central "Capture" action should be a simple Terracotta circle with a white plus icon.

## Guidelines
- **Sanity-First**: Ensure the "Minimalist" look doesn't sacrifice utility. Important data (Prep time, Ingredients) must still be easily findable.
- **Photography Hero**: All recipe images should be high-saturation and vibrant, contrasting beautifully with the Soft Cream background.
