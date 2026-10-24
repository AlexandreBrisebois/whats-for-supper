# Design

## Context and Existing Ownership
RecipeDetailSheet owns detail reads via getRecipe and move via deleteRecipe; RecycleBinSheet owns getTrashItems and restoreRecipe. Their API helpers already reject failed requests. The detail helper also throws when no recipe exists; it cannot return an empty success. The detail render conflates null content with loading; bin catches conflate rejection with an empty result.

## Decisions and Tradeoffs
Use local read error state and an explicit retry counter in existing effects. Keep existing isActive cleanup guards, reset content on identity changes and gate displayed recipe by current ID. Retain the existing API shape and server business rules. Place errors beside recovery controls, with role alert; reuse existing Solar Earth buttons. Preserve move/restore request behavior and purge unchanged.

## First Observable Slice
Reject getRecipe through the existing wrapper boundary in a component test, observe error and Close, activate Retry and observe successful content. Browser acceptance uses method-sensitive network overrides on the existing detail GET. Then extend to bin read/restore and move failures. No backend behavior changes; API/database tests are not applicable.

## State, Concurrency and Recovery
Read pending -> success or failure; Retry clears failure and enters pending. Ignore responses after identity change or unmount. Never expose an old ID as new content. Failed restore keeps the entry and enables the same action for deliberate retry; failed move keeps detail open.
