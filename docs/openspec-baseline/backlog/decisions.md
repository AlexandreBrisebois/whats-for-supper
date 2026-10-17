# Human decisions and remaining gates

## Accepted during this audit — 2026-10-16

1. **Tomorrow push chain:** user: “it should move everything off by 1 day if there is a move to tomorrow”, then “overspill inthe following weeks”. Expected behavior is a one-calendar-day push preserving each displaced meal through as many following weeks as necessary. No two-week/14-day truncation, silent full-week no-op, or overwritten assignment is acceptable. The bounded implementation is complete and [archived](../../../openspec/changes/archive/2026-10-16-tomorrow-preserve-meals/tasks.md). It does not redefine Save for Next Week's first-available defer operation or close WFS-BL-012's ordinary-push remainder.
2. **Deployment calendar and clocks:** user: “dates that affect user experience must be in localtime. fixed by the deployment ... servertimes (internal) must be in UTC ... time must always be injected and must never be DateTime.Now equivalent”. The archived WFS-BL-005 calendar change implements the supper-date policy; WFS-BL-035 tracks remaining clock injection. Use deployment configuration, not each browser's local timezone, for Tonight, meal dates, week boundaries and other UX dates. UTC remains the internal instant representation. Inject time for deterministic domain logic and tests; a real-time adapter belongs at composition only. Pure parsing of an explicit date is not a wall-clock read. Exact deployment zone is configuration, not assumed from this chat's timezone.
3. **Feature Flags audit:** explicitly requested independent sub-agent review. Feature Flags already have 12 requirements/28 scenarios under member-preferences; no 18th capability or duplicate draft. User report prompted discoverability correction and retained unresolved implementation limits.

## Baseline lifecycle approval — 2026-10-16

The user replied “yes” to the concrete scope: accept/promote the two final drafts,
archive all98 changes while preserving later main-spec corrections, repair links
and validate an empty active queue. The ten missing optional designs were disclosed
and included in that approval. This supersedes the original no-promotion/no-archive
boundary only for baseline consolidation. No application fixes, commit or deployment
were authorized. Documentation review/promotion/archival are complete; implementation
and runtime gates remain separate.

## Remaining human checkpoints (one consequential question at a time)

- Review queue ranking and select one remaining bounded item. Deployment calendar, Tomorrow preservation and Tonight replacement recovery are complete; do not reopen them as prerequisites for unrelated work.
- Decide Order In → Drop retention/grocery consequences separately; current status-only behavior retains association.
- Decide notes close/save behavior and cooking unavailable-content presentation before their individual fixes.
- Decide household repair observation access and backup/demo recovery promises before those bounded scopes.
- The two final baseline changes are accepted, promoted and archived. Select a new implementation scope when ready; no further baseline lifecycle approval is pending.

No future assignment is authorization by itself. Every assignment names one approved WFS-BL item, spec/task, owned files, prerequisites, acceptance checks and stopping point. Review evidence/diff before integration or closure.
