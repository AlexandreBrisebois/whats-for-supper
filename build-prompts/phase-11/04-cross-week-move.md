# Prompt 04: Cross-Week Move in Skip Recovery

**Persona**: Full-Stack Engineer specializing in date/week logic

**Context**:
The Skip Recovery dialog offers three rescheduling options: "Ordering In" (skip only), "Tomorrow" (next day), and "Next Week" (7 days ahead). The API's `MoveScheduleEventAsync` currently only operates within a single week's bounds (`GetWeekBounds(dto.WeekOffset)`). Moving a meal from this week to next week requires either:
- **Option A**: Extend `MoveScheduleEventAsync` to handle cross-week moves (more complex)
- **Option B**: Use "Push" intent at the end of current week, wrapping to next week (simpler, working within current API)

Currently, "Next Week" sends `weekOffset: 0, fromIndex === toIndex`, which is a no-op.

**TARGET FILES**:
- `pwa/src/components/home/HomeCommandCenter.tsx` (fix Next Week handler)
- `api/src/RecipeApi/Services/ScheduleService.cs` (extend MoveScheduleEventAsync if needed)
- `api/src/RecipeApi/Dto/MoveScheduleDto.cs` (optional: add targetWeekOffset if Option A chosen)

**CHOOSE ONE APPROACH**:

### Option A: Extend API to support cross-week moves (recommended for correctness)
1. Add `targetWeekOffset?: int` to `MoveScheduleDto` (default to current week)
2. In `MoveScheduleEventAsync`, if `targetWeekOffset != weekOffset`:
   - Fetch source event from current week
   - Delete from current week
   - Create new event in target week (first available slot)
   - Persist
3. In PWA, call with `weekOffset: 0, toIndex: 0, targetWeekOffset: 1, intent: 'push'`

### Option B: Wrap within current week using Push (simpler, same-week only)
1. "Next Week" becomes: find the first empty slot starting from end of this week
2. If no slot exists in current week, silently drop the meal (user picks something else)
3. Less ambiguous but constrains the feature

**RECOMMENDED**: Option A (cross-week moves). The spec explicitly supports this and it's cleaner than constraints.

**DELIVERABLES (Option A)**:
1. **API changes**:
   - Add `targetWeekOffset` to `MoveScheduleDto` with default `null`
   - Update `MoveScheduleEventAsync` to:
     - If `targetWeekOffset == null || targetWeekOffset == weekOffset`: use existing logic (same-week move)
     - If `targetWeekOffset != weekOffset`: implement cross-week move
       - Fetch source event from `weekOffset`
       - Delete from `weekOffset`
       - Create new event at `targetWeekOffset, toIndex` (or first available slot)
   - Update controller action signature if needed

2. **PWA changes**:
   - In `HomeCommandCenter.tsx`, fix the "Next Week" handler:
     ```typescript
     await apiClient.api.schedule.move.post({
       weekOffset: 0,
       fromIndex: todayIndex,
       toIndex: 0,  // Slot 0 (Monday) of next week
       targetWeekOffset: 1,  // Explicit target
       intent: 'push',  // Auto-find first empty
     });
     ```

3. **Test**: Skip today's meal → choose "Next Week" → recipe appears in next week's planner at first available slot

**TDD PROTOCOL**:
- Unit test: `ScheduleService.MoveScheduleEventAsync` with cross-week move
  - Verify source event deleted from week 0
  - Verify destination event created in week 1
- E2E: Home page → Skip → "Next Week" → navigate to next week in planner → recipe present

**VERIFICATION**:
- `dotnet test api/tests/RecipeApi.Tests`
- `npm run dev` → manual verification

**MICRO-HANDOVER**:
- Confirm cross-week move works in both directions (forward/backward if needed)
- Document any edge cases (e.g., moving to a week with all slots occupied)

**Effort**: ~1 hour. Requires both API and PWA changes, careful date logic.

---

## Notes

**Spec Reference**: §2.2.1 "Skip Recovery — Move to next week → Verify calendar update"

**Edge Cases**:
- What if next week has all 7 meals planned? Push intent should find first empty slot in subsequent weeks, or fail gracefully
- What if moving backwards? (e.g., "I want this for last week" — probably disallow for UX clarity)

**Alternative (Option B)**: If cross-week support adds too much complexity, implement "Next Week" as "Push to next available slot in this week" and accept the constraint. Document it clearly in the UI.
