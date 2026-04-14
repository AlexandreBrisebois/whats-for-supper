# ADR 005: Recipe Metadata Schema (recipe.info)
# Status: Accepted

## Context
The Recipe API captures initial metadata during upload. This metadata must be stored in a way that is easily consumable by the downstream **Import Worker** while maintaining a record of the original upload context.

## Decision
We will extend the `recipe.info` sidecar file with additional attribution and audit fields.

### JSON Structure
The schema will include:
- **Attribution**:
    - `addedBy`: Unique identifier of the family member (from PWA session).
    - `addedDate`: ISO 8601 timestamp.
- **Core Info**:
    - `rating`: Integer (0-3).
    - `cookedMealImageIndex`: The index of the hero image.
- **Image Manifest**:
    - `images`: An array of file objects to allow the worker to verify integrity without directory scanning.
    - Each image object includes:
        - `name`: The file name on disk (e.g., `{recipeId}_{index}.jpg`).
        - `originalName`: The name of the file provided by the user (useful for metadata extraction).
        - `contentType`: MIME type.
        - `size`: Byte count.

## Rationale
- **Traceability**: `addedBy` ensures we know who to credit/blame for the recipe capture.
- **Worker Efficiency**: Providing an explicit image manifest allows the worker to validate that all uploaded files are present and accounted for before starting heavy processing.
- **Metadata Preservation**: Storing the `originalName` captures potential intent (e.g., "Moms_Apple_Pie.jpg") that might be lost during renaming.

## Participants
- **Architect Alex** (Infrastructure Lead)
- **Maya** (AI/LLM Specialist)
- **David** (Product/UX Engineer)
