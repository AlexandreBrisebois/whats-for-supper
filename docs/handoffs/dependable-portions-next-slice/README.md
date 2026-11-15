# Dependable portions release

The [completion checklist and rollout](../../../openspec/changes/canonical-ingredient-correction/rollout.md#current-completion-checklist--2026-11-15)
own current scope, gaps, owners and acceptance. Alex selected all six existing
changes through accepted completion on November 15, starting at clean local/remote
`1090c7f33a9b8c64cb8bc16d84d40bbca292c1b9` on `recipe-view-redesign`.
Current execution evidence is `.task/dependable-portions-release-20261115/`.

The latest migration contract is [finite authority transition](V1-AUTHORITY-TRANSITION-CONTRACT.md),
with its [source map](V1-AUTHORITY-TRANSITION-SOURCE-MAP.md) and
[implementation acceptance](V1-AUTHORITY-TRANSITION-IMPLEMENTATION.md). Its original46
receipt membership/bytes stay immutable. The one-recipe conversion/read-back is an
internal checkpoint; remaining effects require separately bound finite successor
authority before the accepted batch, all-week rebuild and recovery acceptance.
The [prewrite delivery](V1-MIGRATION-PREWRITE-DELIVERY.md) is the latest delivered
migration predecessor, followed by the transition planning baseline above.

Reuse existing behavior and valid candidate-specific evidence. Required missing
checks prevent completion. Alex owns hosted CI monitoring/reruns. Production and
unidentified shared mutations remain outside scope; prepare exact shared/DV actions
and establish any missing authorization at that operational boundary. The lead
owns shared contracts, integration, Git, main-spec synchronization and operations.

## Historical evidence

[Copied-library acceptance](MIGRATION-ACCEPTANCE.md),
[source coverage](V1-SOURCE-COVERAGE-DELIVERY.md),
[full snapshot](V1-FULL-SNAPSHOT-DELIVERY.md), [executor](MIGRATION-EXECUTOR.md),
[recovery](RECOVERY.md), [bilingual common](BILINGUAL-COMMON.md),
[bilingual groceries](BILINGUAL-GROCERIES.md), [private corrections](BILINGUAL-CORRECTIONS.md),
[cooking Save](COOKING-SAVE.md), [delivery](DELIVERY.md) and [shutdown](SHUTDOWN.md)
retain their original source identities, scope and limitations. Their old stopping
rules and blocker lists are historical; use the current checklist for continuation.

The [artifact index](artifact-index.json) retains preserved patches/manifests and
source archives. These are recovery data, not executable instructions or authority
to overwrite current files. Preserve predecessor packages, raw receipts, backups
and unrelated resources; never integrate the unqualified migration reset scaffold.

Use AGENT.md and the Codex adapter, current pinned toolchains and Taskfile commands.
Run task prepare before task verify where applicable on the complete reviewed paths.
Only fully accepted changes may sync/archive. No Entire setup repair or manual
checkpoint is selected.
