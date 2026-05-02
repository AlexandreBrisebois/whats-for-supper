# Branding Option 2: Vibrant Discovery (Eureka Energy)

**Goal:** Amplify the joy of finding the perfect meal using the higher-energy tones of the Solar Earth palette.

## Task Overview
You are implementing the **Vibrant Discovery** variant. This focuses on the "Eureka" moment when a household finds a recipe match, using **Ochre** as the primary driver for optimism and energy.

## Context Needed
- `docs/creative-direction-north-star.md`
- `docs/agent-designer-identity.md`
- `pwa/src/app/globals.css`
- `specs/mockups/solar_earth_discovery.png`

## Step 1: Solar Energy Palette
Update `pwa/src/app/globals.css` with a focus on Ochre highlights:
- **Primary Action**: Terracotta (#CD5D45).
- **Eureka Highlight**: Ochre (#E1AD01).
- **Match State**: Sage Green (#8A9A5B).
- **Canvas**: Soft Cream (#FDFCF0).
- **Gradients**: Use warm, radiating gradients (Radial: Soft Cream -> Subtle Ochre) for the Discovery background.

## Step 2: The "Eureka" Interaction
Overhaul `pwa/src/app/(app)/discovery/page.tsx`:
- **Visual Feedback**: When a recipe is "Liked" or "Matched", trigger a subtle pulse effect using the Ochre token.
- **Card Design**: Use the standard Solar Earth glassmorphism (12px blur) but with a slightly tighter border glow (2px) using #E1AD01 at 0.3 opacity.
- **Micro-animations**: Use Framer Motion to create a "pop-in" effect for new recipe cards, emphasizing the arrival of new inspiration.

## Step 3: High-Energy Hero
- **Header**: Ensure the logo transition uses the Ochre color for the "Spark" element.
- **Typography**: Use 'Outfit' for recipe titles with tight tracking (-0.02em) to ensure they feel modern and impactful.

## Guidelines
- **Sanity Check**: Ensure the vibrant colors don't feel "loud" or "clinical." Keep them grounded in the Solar Earth philosophy.
- **Thumb-Zone**: All discovery actions (Swipe/Like/Veto) must be easily reachable with one hand.
