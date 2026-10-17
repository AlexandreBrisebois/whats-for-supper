# Weekly family interest and recipe rotation

Apply the additive database migration before starting the new API. Existing votes and recipe flags are preserved; history starts empty and legacy OFF has Unknown provenance. No backfill infers preferences from ratings, selected meals or cooked dates. The standard compatibility migration is repeatable.

API environment settings (also forwarded by the supported Compose files):

| Setting | Default | Meaning |
| --- | --- | --- |
| `HISTORICAL_INTEREST_WEEKS` | `4` | Previous complete deployment-calendar weeks used for ranking |
| `HISTORICAL_INTEREST_ENABLED` | `true` | Enable historical ranking without changing retention |
| `COOKED_COOLDOWN_WEEKS` | `4` | Dreaming cooked-date cutoff in complete calendar weeks |
| `DREAMING_ROTATION_ENABLED` | `true` | Enable Dreaming rotation writes |

Week settings accept integers 1–5200; malformed values fail startup. Booleans accept true/false. These settings are independent of Search rediscovery days. `Calendar__TimeZone` owns calendar boundaries. On Monday 2026-10-12 with four weeks, September 14 is recent and September 13 has aged out. Null cooked date means never eaten. Cooking corrections take effect on the next successful Dreaming pass; reads do not run cooldown reconciliation.

Dreaming runs `ReconcileRecipeRotation` after overdue meal finalization, and reporting waits for the processor's completion. Logs record cutoff, configuration and evaluated/changed counts. Each recipe commits independently under a row lock; failure leaves earlier committed work intact and retries reread current facts. Failed publication does not roll back a committed change. Existing SSE refreshes and a later refetch reconcile clients.

Human OFF is a durable latch. Human ON clears the latch and effective cooked suppression; it does not exempt a recipe from later Dreaming. Explicit meal-type edits record supper suitability, independently of AI category inference. AI/import synchronization cannot clear Human OFF. Legacy unknown OFF may be restored by normal reconciliation.

Close requests carry the schedule's `votingRoundId` and absolute reference Monday. The durable receipt prevents retries from clearing later early votes. Tokenless legacy requests are accepted only where unambiguous. If a pre-upgrade household has multiple open weeks without identities, explicitly opening one of those weeks adopts it; the other ambiguous plans become Draft while all votes and calendar entries remain. No history is fabricated. Subsequent closes require the returned identity.

History stores only positive recipe/week totals and selection snapshots indefinitely. Revotes replace touched rows; a touched zero-like result removes its row. Untouched rows stay unchanged. Permanent recipe deletion cascades owned history. The backup writes a complete versioned `weekly-household-interest.json`, even when empty; missing legacy artifacts preserve destination history, while complete artifacts replace it. Restore validates dependencies, rotates operational identities and rebuilds materialized affinity from current live votes and cooked events under the same history boundary. Recipe metadata carries versioned rotation facts and unavailable history dependencies without making them visible. Demo reset replaces history and invalidates old close tokens; legacy demo snapshots reset history to empty. Filesystem and database publication remain separate failure boundaries: inspect reported restore errors before treating a recovery as complete.

Explore clients send the first page's `historyGeneration` on later requests. HTTP 409 requests a visible restart with cards retained until replacement succeeds. Blank Browse expires its continuation when history/window/configuration changes; typed Search retains its stored order. The token is optional for page one; later Explore pages without it receive 409. Older clients must restart or update instead of silently mixing historical orders.

To reverse ranking policy, disable historical interest; stored aggregates remain. To stop rotation changes, disable Dreaming rotation first. Neither switch bulk-enables suppressed recipes. A controlled reconciliation would be needed to return cooked-suppressed recipes while preserving Human OFF and unsuitable recipes. Do not deploy an older writer that collapses the new intent fields, or delete them as a rollback shortcut. Seasonal/detail insights and a hard history reset remain deferred.

This feature does not complete general recovery issue 244. It does not make all ordinary exports authoritative for deleted or emptied tables/files, guarantee media completeness, or make filesystem and database recovery atomic. That broader recovery work follows this feature review sequentially.
