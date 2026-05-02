# Prompt 04: PWA Home — Command Center & Skip Recovery

**Persona**: Sr. UX Engineer (Mère-Designer alignment).

**Context**:
The Home Page needs to be the "Command Center". Implement the Tonight Card flip and the Skip Recovery flow to handle real-world chaos.

**TARGET FILES**:
- `pwa/src/app/(app)/home/page.tsx`
- `pwa/src/components/home/TonightMenuCard.tsx`
- `pwa/src/components/home/SkipRecoveryDialog.tsx` [NEW]

**FORBIDDEN**:
- Do not modify the `Discovery` stack.
- Do not touch the `Capture` flow.

**VISUAL IDENTITY (SKILL_DESIGNER)**:
- **Flip Animation**: Use `framer-motion` for a smooth 3D flip.
- **Glassmorphism**: The back of the card should be a blurred glass panel.
- **Terracotta (#CD5D45)**: Use for the "Skip Tonight" button.

**LOGIC**:
1.  **Flip Interaction**: Tapping the card flips it.
2.  **Skip Tonight**:
    - Trigger `SkipRecoveryDialog`.
    - Options: [🥡 Ordering In], [🔄 Pick Something Else].
    - Follow-up for the recipe: [🗓️ Tomorrow], [⏭️ Next Week], [🗑️ Drop It].
    - **Movement Behavior**: Moving a skipped meal to tomorrow triggers the **Global Domino Shift** (Spec 3.2.287).
3.  **Quick Find Modal**:
    - Implement 5-card carousel.
    - **The 5th Card (Search Nudge)**: A persistent "Didn't find a match?" card with a large **Search Library** CTA.
4.  **Physical Interaction**:
    - Dragging a meal onto an occupied slot triggers an immediate **Swap** (Physical Drag logic).

**TDD PROTOCOL**:
- Playwright test: `pwa/e2e/home-recovery.spec.ts`
    - "Flip card reveals ingredients".
    - "Skip tonight -> Tomorrow shifts calendar".

**VERIFICATION**:
- `task test:pwa:e2e`

**MICRO-HANDOVER**:
- Confirm flip animation performance.
- Confirm "Push" logic behavior.
