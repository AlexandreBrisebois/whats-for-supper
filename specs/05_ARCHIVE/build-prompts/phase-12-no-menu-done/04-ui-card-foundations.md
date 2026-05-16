# Build Prompt 04-ui-card-foundations.md
**Persona**: Sr. UI Engineer (Next.js, Tailwind, Framer Motion).

## Strict Scope
- **TARGET**: 
    - `pwa/src/components/home/TonightMenuCard.tsx`
    - `pwa/src/components/home/TonightPivotCard.tsx` [NEW]
- **FORBIDDEN**: 
    - Do not change the behavior of `TonightMenuCard` when a recipe is selected.
    - Do not modify `HomeCommandCenter.tsx`.

## The Seams (Contract)
Use the "Solar Earth" design language:
- Background: `#FDFCF0` (Soft Cream).
- Corners: `rounded-[3rem]`.
- Shadow: `shadow-2xl`.

## Technical Skeleton
1.  **Refactor**: Extract the outer `div` and common styles from `TonightMenuCard` into a shared `TonightCardBase` component (can live in the same file or a new one).
2.  **`TonightPivotCard`**:
    - Use `TonightCardBase`.
    - Mirror the layout: Header (TONIGHT'S MENU, 30-45 MINS), Image Area (placeholder icon + gradient), Footer (Pivot Actions).
    - Actions: `Confirm GOTO`, `Discover`, `Order In`.

## Execution Limit
Implement ONLY the UI components. Do not wire them to the store or home page yet.

## TDD Protocol
- **Frontend**: Verify via Storybook (if available) or manual visual inspection by temporary injection into `HomeCommandCenter`.

## Verification Command
```bash
npm run dev
```

## Handover Requirement
- Screenshots or descriptions of the new `TonightPivotCard`.
- Confirmation that `TonightMenuCard` visual design is unchanged.
