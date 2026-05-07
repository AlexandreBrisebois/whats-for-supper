# Flow: Recipe Search And Library Recovery

**Related spec:** `.kiro/specs/semantic-recipe-search/`

This document describes the intended user experience for:
- semantic recipe search,
- stars-triggered long-form super-search,
- pantry/fridge/freezer photo search,
- planner-aware recipe selection,
- recipe detail actions,
- recycle bin restore/purge,
- failed capture recovery in Settings.

---

## North Star

The user should be able to answer "What should we eat?" in seconds, recover from mistakes without panic, and never end up at a dead end.

### Mère-Designer rules applied

- **Why:** Recovery should live next to the thing being recovered.
- **How:** Recycle Bin belongs in the recipe library. Failed captures belong in Settings.
- **Thumb-zone rule:** the primary action on each surface should be reachable and obvious.

---

## Main Search Flow

```mermaid
flowchart TD
    A[User opens Search] --> B[Sees search icon, field, and quick filters]
    B --> C[Types short query and presses Enter]
    B --> C2[Taps stars for long-form search]
    B --> C3[Taps camera for pantry/fridge/freezer popup]
    C --> D[Short list returns]
    C2 --> D
    C3 --> D
    D --> E[Top Pick]
    D --> F[Alternates 2-5]
    E --> G[Open recipe detail sheet]
    F --> G
    G --> H[Use for planner]
    G --> I[Save notes / set rating]
    G --> J[Promote/remove discovery]
    G --> K[Find similar]
    G --> L[Move to recycle bin]
    G --> M[Close back to results]
```

### Expected feel

- Search results should feel decisive, not exhaustive.
- One strong Top Pick should reduce decision fatigue.
- Closing detail returns to the same search state.
- The main field should feel immediate and cheap.
- The stars affordance should feel like "help me figure it out," not "open chat."

---

## Input Paths

### 1. Default search field

- Search icon + text field only.
- No special lane name.
- `Enter` executes search.

### 2. Stars-triggered long-form search

- The stars/sparkle affordance opens a larger text surface.
- The user can describe a craving, mood, constraint set, or fuzzy memory.
- The result is still a normal shortlist of recipes.

### 3. Camera-triggered inventory search

- The camera icon opens a capture popup.
- The user takes photos of pantry, fridge, or freezer.
- The system extracts likely ingredients and boosts recipes that use what is on hand.

---

## Planner-Aware Search Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Planner
    participant Search as /recipes
    participant Detail as Recipe Detail Sheet
    participant API as Search API

    User->>Planner: Tap Search Library on a day
    Planner->>Search: Open /recipes?addToDay=X&weekOffset=Y
    Search->>API: Search with planner context
    API-->>Search: Top Pick + results + planner-fit reasons
    User->>Search: Tap result
    Search->>Detail: Open detail sheet
    User->>Detail: Tap Use For Day X
    Detail->>Planner: Assign recipe and return success state
```

### No-dead-end rules

1. Planner context is always preserved.
2. The user can back out without losing the query.
3. The result detail provides a direct selection CTA.

---

## Similar Recipe Flow

```mermaid
flowchart TD
    A[User opens recipe detail] --> B[Taps Find Similar]
    B --> C[Search reopens in similar mode]
    C --> D[Short list of related recipes]
    D --> E[User selects one]
    E --> F[Same detail sheet and actions as normal search]
```

This prevents the user from having to invent a new query when what they really mean is "more like this."

---

## Recycle Bin Flow

### Primary location

The Recycle Bin should be available from the recipe library/search surface, for example as a utility entry or secondary header action.

**Not recommended as primary location:** Settings.

### Flow

```mermaid
flowchart TD
    A[User in recipe detail or library] --> B[Move recipe to recycle bin]
    B --> C{Recipe currently planned?}
    C -->|Yes| D[Show friendly block message + where it is planned]
    C -->|No| E[Soft delete]
    E --> F[Recipe disappears from active surfaces]
    F --> G[User opens Recycle Bin]
    G --> H[Restore]
    G --> I[Permanent delete]
    H --> J[Recipe returns to library/search/discovery]
    I --> K[Recipe removed from DB and disk forever]
```

### UX intent

- Soft delete lowers fear.
- Restore is one tap.
- Permanent delete only appears inside Recycle Bin.
- A recipe that is still scheduled should not silently vanish and break the planner.

---

## Failed Captures In Settings

### Primary location

Settings > Failed Captures

### Flow

```mermaid
flowchart TD
    A[Capture fails] --> B[Failure stored with friendly reason]
    B --> C[User opens Settings]
    C --> D[Failed Captures section]
    D --> E[See source + friendly explanation]
    E --> F[Retry capture]
    F --> G{Retry succeeds?}
    G -->|Yes| H[Remove from active failed queue]
    G -->|No| I[Update timestamp + reason and keep item]
```

### Friendly copy examples

- `We couldn't read enough from that page to save it cleanly.`
- `Those photos were too unclear to turn into a recipe.`
- `The recipe service timed out. Try again in a moment.`

The user does not need stack traces to recover.

---

## Decision Table

| Surface | Primary action | Secondary action | Escape hatch |
|---|---|---|---|
| Search page | Open Top Pick or result | toggle quick filter | clear query |
| Recipe detail sheet | Use / Save / Select | find similar, discovery toggle, move to bin | close back to results |
| Recycle Bin | Restore | permanent delete | back to library |
| Failed Captures | Retry | view details | leave item for later |

---

## Empty States

### Search empty state

Show:
- a calm explanation,
- one recovery suggestion,
- one action.

Examples:
- `No close matches yet. Try fewer ingredients or remove a filter.`
- CTA: `Clear Filters`

### Recycle Bin empty state

Show:
- `Nothing in the bin.`
- CTA: `Back to Library`

### Failed Captures empty state

Show:
- `No failed captures right now.`
- optional reassurance copy, no extra action required.

---

## Blind Spots To Watch

1. If delete is allowed for an actively planned recipe, planner state will drift.
2. If the detail sheet does not preserve search state, the user will feel punished for exploring.
3. If failed captures are not persisted, recovery becomes impossible after reload.
4. If the recycle bin is hidden in Settings, accidental restore becomes memory work.
