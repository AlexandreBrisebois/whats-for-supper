# Build Prompt 05-integration-and-settings.md
**Persona**: Product Engineer (Full-stack PWA).

## Strict Scope
- **TARGET**: 
    - `pwa/src/components/profile/FamilyGOTOSettings.tsx` [NEW]
    - `pwa/src/app/(app)/profile/settings/page.tsx`
    - `pwa/src/components/home/HomeCommandCenter.tsx`
- **FORBIDDEN**: 
    - Do not modify card internal logic.

## The Seams (Contract)
- Store Action: `saveSetting('family_goto', description)`.
- Pivot Actions: `onConfirmGOTO`, `onDiscover`, `onOrderIn`.

## Technical Skeleton
1.  **Settings**:
    - Implement `FamilyGOTOSettings` with an input field.
    - Save to `familyStore` on blur or button click.
2.  **Home Orchestration**:
    - In `HomeCommandCenter`, if `!currentRecipe`, render `TonightPivotCard` instead of `SmartPivotCard`.
    - **Zero Change to Planned State**: Ensure `TonightMenuCard` is still shown if `currentRecipe` is present.

## Dependency Anchors
- Consume `useFamilyStore`.

## Execution Limit
Integrate components and state. Do not change existing recovery logic (Ordering In).

## TDD Protocol
- **Verification**: Manually verify that setting a GOTO in Settings updates the card on the Home page.

## Verification Command
```bash
npm run dev
```

## Handover Requirement
- Confirmation of full-cycle (Settings -> Home) functionality.
