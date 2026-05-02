# Backup & Restore — Ready Status Data Flow

How recipe ready status survives a backup/restore cycle.

## Key design decision

Ready status is **not stored as an explicit field**. It is a computed property:

```
ready = Name != null/empty  AND  ImageCount > 0
```

`recipe.info` stores both `Name` and `ImageCount`, so ready status is **fully reconstructable from disk** after a restore.

## Backup flow

`POST /api/management/backup` → `ManagementService.BackupAsync()`

```mermaid
flowchart TD
    A[For each Recipe in DB] --> B{Skip condition}

    B -->|isReady = Name != null AND ImageCount > 0| C[Always backup]
    B -->|not ready AND RawMetadata null\nAND Notes null AND Rating = Unknown| D[Skip — stub with no data]

    C --> E{recipe.info exists on disk?}
    D --> Z([Skipped])

    E -->|Yes| F[Update mutable fields:\nNotes, Rating, Description, Name\nCategory, IsDiscoverable, etc.\nDo NOT overwrite: AddedBy, ImageCount, CreatedAt]
    E -->|No| G[Create new recipe.info with ALL fields:\nId, Name, ImageCount, AddedBy\nCreatedAt, Notes, Rating, etc.]

    F --> H{recipe.json exists?}
    G --> H

    H -->|No AND RawMetadata or Ingredients present| I[Write recipe.json]
    H -->|Yes| J[Leave recipe.json unchanged]
```

## Restore flow

`POST /api/management/seed` → `ManagementService.RestoreAsync()`

```mermaid
flowchart TD
    A[Scan data/recipes/ directories] --> B{Has recipe.info or recipe.json?}
    B -->|No| Z([Skip directory])
    B -->|Yes| C[Load recipe.info → Recipe entity\n  Name, ImageCount, AddedBy, CreatedAt\n  all mutable fields]

    C --> D{Has recipe.json?}
    D -->|Yes| E[Augment: RawMetadata, Ingredients\n  Category, Difficulty if missing]
    D -->|No| F

    E --> F{Has images in original/?}
    F -->|No| G([Skip — no images, recipe cannot be displayed])
    F -->|Yes| H{Recipe exists in DB?}

    H -->|No| I[INSERT Recipe]
    H -->|Yes| J[UPDATE Recipe metadata]

    I --> K([Ready status recomputed\nfrom Name + ImageCount\nno explicit field needed])
    J --> K
```

## Disaster recovery scope

`POST /api/management/disaster-recovery` → `ManagementService.DisasterRecoveryAsync()`

**Scope: family-member reconciliation only.** This endpoint:
- Scans `recipe.info` / `recipe.json` files for `addedBy` GUIDs
- Creates placeholder `FamilyMember` rows for any GUIDs not in the DB
- Does **not** restore recipe rows or modify ready status

Full recipe restoration (including ready status) is handled exclusively by `RestoreAsync()`.

## What recipe.info stores

| Field | Immutable? | Notes |
|-------|-----------|-------|
| `id` | Yes | Set at creation |
| `addedBy` | Yes | Set at creation from `X-Family-Member-Id` |
| `createdAt` | Yes | Set at creation |
| `imageCount` | Yes (on disk) | Mutable in DB via RecipeReady processor |
| `name` | No | Updated by backup |
| `description` | No | Updated by backup |
| `notes` | No | Updated by backup |
| `rating` | No | Updated by backup |
| `category` | No | Updated by backup |
| `isDiscoverable` | No | Updated by backup |
