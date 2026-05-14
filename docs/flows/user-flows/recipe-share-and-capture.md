# Recipe Sharing and Capture Flow

This document defines the end-to-end experience for sharing recipes between users and capturing them into a personal library using the portable `.recipe` format.

## Overview

The "What's For Supper?" sharing model is built on high-fidelity portability. Instead of sharing a simple link that might break or require a login, users share a complete, self-contained bundle that includes the recipe metadata, indexing information, and all original high-resolution photos.

## The Format: `.recipe`

A `.recipe` file is a JSON-based bundle (approx. 5-15MB) containing:
- **Recipe Metadata**: Name, description, ingredients, and instructions.
- **Recipe Info**: System-level metadata used for search indexing.
- **Hero Image**: A Base64-encoded version of the AI-generated or user-selected cover image.
- **Original Photos**: A collection of Base64-encoded original photos (the "Seams") from which the recipe was extracted.

## User Flow: Sharing (The Push)

1. **Trigger**: The user opens a recipe in their library.
2. **Action**: They tap the **Share** button (universal share icon) located in the recipe header/actions area.
3. **Synthesis**: The PWA calls the API to generate the `.recipe` bundle.
4. **Native Share**: The app uses the browser's `navigator.share` API to trigger the device's native share sheet.
5. **Channel Selection**: The user selects a contact or app (SMS/RCS, WhatsApp, Email, AirDrop, etc.).
6. **Transmission**: The `.recipe` file is sent to the recipient.

## User Flow: Capture (The Pull)

### Case A: Native OS Opening
1. **Receipt**: The recipient receives the `.recipe` file in their messaging app.
2. **Launch**: They tap the file. Because the PWA is registered as a file handler for `.recipe`, the OS launches the app directly.
3. **Deep Link**: The app opens to the `/capture` page.
4. **Interception**: The `launchQueue` API catches the file handle.

### Case B: Drag & Drop
1. **Action**: The user drags a `.recipe` file from their desktop onto the capture target on the `/capture` page.

### The "Gift" Experience (Common to both)
1. **Parsing**: The app parses the JSON and decodes the Base64 images in memory.
2. **Preview Overlay**: A "Shared with you" screen appears instantly.
    - **Visual**: The hero image is displayed immediately (no server request needed).
    - **Details**: The name, cook time, and a snippet of ingredients are shown.
3. **Decision**: The user sees the meal and taps **Add to My Library**.
4. **Hydration**: The bundle is sent to the API, where it is re-indexed and added to the user's library as a permanent, first-class recipe.

## Technical Seams

### API Endpoints
- `GET /api/recipes/{id}/share`: Generates the bundle.
- `POST /api/recipes/share/import`: Consumes the bundle and creates the recipe record.

### PWA Capabilities
- **File Handlers**: Registered in `manifest.json` to handle `application/json` with the `.recipe` extension.
- **Launch Queue**: Used to process files passed from the OS.
- **Navigator Share**: Used to trigger the OS sharing UI.
