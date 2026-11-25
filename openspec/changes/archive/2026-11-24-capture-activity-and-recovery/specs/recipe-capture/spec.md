# Spec Delta

## MODIFIED Requirements

### Requirement: Present ambient in-flight capture status on Home

While one or more household captures are preparing, indexing, still enriching smart search, or need attention, `/home` SHALL display a single tappable Capture Activity Bar directly beneath `QuickCaptureTrigger` (which uses a `Plus` icon and `"Snap, paste, upload, or describe"` subtitle covering all capture modes rather than `"Photo or Link"`) without a redundant `+ Add another` button, and SHALL leave `/capture` single-purpose without activity tabs, drawers, or overflow menus. For active imports without failures, the bar SHALL display Sheet A's progress-bar layout (recipe name, step label, and progress bar for 1 item; aggregate count, breakdown, and progress bar for N parallel items) or a Garden `Searchable · Still enriching` bar when only vector enrichment remains. When one or more capture failures exist, Home SHALL prioritize a compact 2-line white-surface Hearth-bordered bar without a progress bar, and activating any Home bar state SHALL open the Capture Activity Sheet where `Searchable` rows open the recipe (or paired duplicate review if flagged).

#### Scenario: Pending background capture displays ambient Home ribbon

- **WHEN** a person views `/home` while 1 or N parallel captures are preparing or indexing with no failures
- **THEN** Home renders the Capture Activity Bar directly beneath `QuickCaptureTrigger` with no `+ Add another` button, displaying the single item or parallel summary with a Hearth progress bar (`motion-reduce:animate-none` when `prefers-reduced-motion: reduce` is active)
- **AND** activating the bar opens the Capture Activity Sheet listing each parallel capture individually and making `Searchable` items tappable (`ChevronRight`) to open `/recipes?open=<recipeId>` (or `&reviewDuplicate=1` if suspected duplicate)

#### Scenario: Failure prioritizes compact 2-line Hearth alert on Home

- **WHEN** at least one capture failure exists alongside or without parallel active imports
- **THEN** Home renders a compact 2-line Hearth recovery bar (`bg-white border-hearth-line`, `bg-terracotta-50` alert icon well, `text-hearth-ink` heading, no progress bar) that stays visually lighter than `QuickCaptureTrigger` above `TonightMenuCard`, and tapping it opens the Capture Activity Sheet

#### Scenario: Ribbon disappears once pending captures settle

- **WHEN** no capture workflows remain active, indexing, enriching, enrichment-paused, or failed
- **THEN** the Capture Activity Bar is removed from `/home`

## REMOVED Requirements

### Requirement: Present completion toast with duplicate-review prompt

**Reason:** Global floating toasts interrupt users while browsing other tabs; household readiness and suspected-duplicate status live calmly on Home's Capture Activity Bar and Capture Activity Sheet.

**Migration:** Check Home's Capture Activity Bar and Capture Activity Sheet for `Searchable` recipes and suspected-duplicate review links.

### Requirement: Persistent failure banner on workflow failure

**Reason:** Global off-Home failure banners disrupt other workflows; failure review and recovery live calmly on Home (`CaptureActivityBar` / `CaptureActivitySheet`) and in `/profile/settings`.

**Migration:** Visit `/home` (Capture Activity Bar -> Capture Activity Sheet) or `/profile/settings` (`FailedCapturesSection`) to retry, copy details, or clear failed captures.
