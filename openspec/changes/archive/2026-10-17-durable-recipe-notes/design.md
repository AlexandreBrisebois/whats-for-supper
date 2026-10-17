# Design

## Context and Existing Ownership

RecipeDetailSheet's notes effect fires updateRecipe without awaiting it, compares with the original recipe and cancels on unmount. The existing generated PATCH wrapper awaits the API; RecipeService saves exact non-null notes before its file projection. An error therefore does not prove rollback.

## Decisions and Tradeoffs

Use a recipe-keyed tab-lifetime notes state owner and serial per-recipe saves. Debounce edits by 800 ms, immediately flush on close/switch, and retain failed drafts in memory. This follows responsive background-work conventions without making close destructive or blocking navigation. Browser shutdown durability and multi-device conflict policy are outside this change. No public contract changes.

## First Observable Slice

Notes textarea → state owner → existing updateRecipe/generated client → PATCH. First prove A→B→A and acknowledgement in unit/component tests, then a stateful HTTP browser fixture with GET reread. Existing API persistence is unchanged; mocked HTTP proves consumer behavior, not database durability.

## State, Concurrency and Recovery

Track draft, acknowledged text, pending/error state and one in-flight write per recipe. Queue the latest draft behind the active write. Failure retains draft and marks acknowledgement uncertain, so retry or returning to the old baseline still sends the current text. Old recipe responses cannot update another recipe's view. Failed departure saves use existing toast feedback; reopening retains Retry save. Clean rereads may reinitialize from server facts.

## User Experience

Show Saving while pending and Saved only for current acknowledged text. Inline failure and Retry save remain accessible. Keep original exact-text and empty-string semantics; ratings and detail field editing are unchanged.
