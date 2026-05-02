# Prompt 02: Discovery Nav Pulse (Voting Signal)

**Persona**: Frontend Integration Engineer

**Context**:
The Navigation component already has `animate-pulse-ochre` CSS class wired to `hasPendingCards` from `discoveryStore`. The Planner page manages `isVotingOpen` from the API's `WeeklyPlan.status`. When voting opens, the Discovery (Compass) nav icon should pulse in Ochre to invite family members to participate.

**TARGET FILES**:
- `pwa/src/store/plannerStore.ts` (dispatch signal to discoveryStore)
- `pwa/src/store/discoveryStore.ts` (accept isVotingOpen signal)
- `pwa/src/app/(app)/planner/page.tsx` (trigger update when voting opens)

**FORBIDDEN**:
- Do not modify Navigation.tsx or the pulse CSS
- Do not change the Planner page's voting logic

**DELIVERABLES**:
1. Export a setter in `discoveryStore` to update `hasPendingCards` from external stores
   - Add `setHasPendingCards: (hasCards: boolean) => void` (already exists)
2. In `planner/page.tsx`, whenever `isVotingOpen` changes, call `setHasPendingCards(isVotingOpen)`
   - Add import: `import { useDiscoveryStore } from '@/store/discoveryStore'`
   - In `useEffect` that monitors `isVotingOpen`, call setter
3. Test: Open Planner → tap "Ask the Family" → Discovery icon pulses Ochre
4. Test: Finalize week → voting closes → pulse stops

**TDD PROTOCOL**:
- Visual: Discovery icon pulses when `isVotingOpen === true`
- Visual: Discovery icon stops pulsing when `isVotingOpen === false`

**VERIFICATION**:
- `npm run lint` passes
- `npm run dev` → manual verification in browser

**MICRO-HANDOVER**:
- Confirm pulse activates/deactivates with voting state
- Document any timing quirks

**Effort**: ~10 minutes. Pure state propagation.

---

## Implementation Notes

The spec describes the pulse as "Hearth Pulse (Flow 2)" — an ambient visual signal across all family members when voting is open. This is the frontend-only signaling layer (no new API calls). The actual voting happens in Discovery; this just makes it visible.
