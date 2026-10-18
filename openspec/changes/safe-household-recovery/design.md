# Design

## Context and Existing Ownership

ManagementService.BackupAsync writes in-place exports. Its append-only member helper also serves the existing attribution-repair operation, so that helper must not change. Recipe serialization already excludes retired fields. LocalRecipeStore owns metadata and media file access. The history partial owns the version-1 sidecar and restore invalidation.

## Decisions and Tradeoffs

First implement only settled freshness corrections: replace the member file from an AsNoTracking query, always serialize included recipe content, always write planning arrays, and read category CSV as logical records with invariant confidence. Preserve the existing recipe eligibility predicate and merge semantics. A version-1 recipe-content marker distinguishes the database envelope from raw legacy JSON; its shared decoder serves merge restore and the existing SyncRecipe processor so repeated restore/sync does not nest metadata or lose ingredients. Do not mistake these in-place corrections for staged independent recovery. No media deletion or unrelated metadata cleanup is included in this slice.

Pending essential decision for subsequent slices: offline operator command versus online backup/restore. Proposed minimal default is explicit offline operation and an operator-supplied destination outside live roots, with no accounts, provider or schedule. Offline exclusion must prevent API/workers from overlapping capture/restore; online operation instead requires a shared write boundary across file writers. Do not implement either branch until resolved. No dependent exact-recovery task breakdown is approved by this document.

## First Observable Slice

Integration tests invoke ManagementService against the existing isolated fixture database and real temporary recipe store, export twice after changes/deletions/empty transitions, and inspect bytes. Category tests restore multiline and decimal-culture exports into an emptied disposable fixture. Existing history/demo regressions remain required. These tests do not prove PostgreSQL or disk-loss recovery; subsequent exact recovery requires both.

## Compatibility, Rollout and Reversal

Ordinary merge continues to preserve absent legacy history and unrelated target rows; explicit empty history still replaces aggregates. Export updates are automatic whenever the existing backup workflow runs, and are documented with the existing controls. Existing endpoint acceptance and status contracts remain unchanged. The legacy member-attribution repair stays append-only.

## State, Concurrency and Recovery

This first slice retains the existing VotingBoundary and recipe-table lock. It makes no whole-set publication or cross-store atomicity claim. The remaining #244 acceptance includes full membership/media validation, independent verified publication, interruption/resume, version compatibility and nonempty/fresh PostgreSQL round trips. It remains unimplemented and must not be archived as complete.
