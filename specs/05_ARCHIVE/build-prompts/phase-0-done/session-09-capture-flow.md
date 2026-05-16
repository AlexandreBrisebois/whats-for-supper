# Session 9: Recipe Capture Flow & Image Handling

**Artifact:** `/capture` page with camera integration, image review, rating, submission

**Context needed:** Sessions 1-8 artifacts + Phase 0 spec section 2.3 (Recipe capture)

**What to build:**
- `pwa/src/app/capture/page.tsx` — Main capture page and flow orchestration
- `pwa/src/components/capture/CameraView.tsx` — Camera/photo picker
- `pwa/src/components/capture/ImageReview.tsx` — Scrollable photo gallery
- `pwa/src/components/capture/CookedMealSelector.tsx` — Select hero image index
- `pwa/src/components/capture/RatingSelector.tsx` — Emoji rating (0-3)
- `pwa/src/hooks/useCapture.ts` — Capture state (files, selected index, rating)
- `pwa/src/lib/imageUtils.ts` — Image validation, compression, MIME type checks

**Success:**
- Camera view opens and captures photos
- Multiple photos can be taken/selected (max 20)
- Photos display in scrollable gallery
- User can select 1 photo as "cooked meal" (hero image)
- 4-emoji rating selector (😊 🙂 😐 😞 for 0-3)
- Submit button validates and POSTs to `/api/recipes`
- Success confirmation shows before redirect to home

---

## Prompt

```
Task: Implement Phase 0 recipe capture flow

You are building the photo-to-recipe acquisition experience.

Context:
- Recipe API endpoint: POST /api/recipes (multipart form data)
- Required fields: files (images), rating (0-3), cookedMealImageIndex (-1 or 0-based)
- Required header: X-Family-Member-Id
- Image validation: max 20MB per image, max 20 images, MIME: jpeg/png/webp
- Rating: 0-3 (emoji scale)
- cookedMealImageIndex: -1 (no meal shown) or 0-imageCount-1
- Hint system: phase0-capture tour (from Session 8)

Create:

1. pwa/src/app/capture/page.tsx
   - Page layout: title "Add Your First Recipe"
   - Orchestrates 4 steps:
     * Step 1: Camera view (take photos)
     * Step 2: Image review (gallery)
     * Step 3: Select cooked meal photo
     * Step 4: Rate and submit
   - State managed by useCapture hook
   - Hint overlay integrated (useHintTour for phase0-capture)
   - Navigation: back button, skip option (no forced flow)
   - On submit success: show confirmation, redirect to /home

2. pwa/src/components/capture/CameraView.tsx
   - Functionality:
     * Access device camera via getUserMedia API
     * Capture photo: click button, capture frame
     * OR select from camera roll (file input)
     * Display preview of last captured photo
   - Props: onPhotoCapture (callback with File)
   - UI:
     * Live video feed (if camera available)
     * Capture button (center, large, sage green)
     * Gallery icon (open file picker)
     * Error handling: if camera unavailable, show file input only
   - Validation: file size, MIME type (defer to imageUtils)

3. pwa/src/components/capture/ImageReview.tsx
   - Horizontal scrollable gallery of captured photos
   - Each photo:
     * Thumbnail (square, fixed width)
     * Can tap to view full-screen or delete
   - Props:
     * images: File[] (or Blob[])
     * onDelete: (index) => void
     * onSelect: (index) => void (for hero selection)
   - Scroll indicator: show "Swipe to see more"
   - Delete icon on hover/long-press
   - Count: "3 photos" indicator

4. pwa/src/components/capture/CookedMealSelector.tsx
   - Functionality: Select 1 photo as "meal hero" image
   - Visual:
     * Display each photo thumbnail
     * Selected photo highlighted (sage green border)
     * Icon: "Which shows your meal?" or similar hint
   - Props:
     * images: File[]
     * selectedIndex: number | null
     * onSelect: (index) => void
   - Validation: must select at least 1 image

5. pwa/src/components/capture/RatingSelector.tsx
   - 4-emoji rating scale:
     * 3 (😊 - delicious): class happy-emoji
     * 2 (🙂 - good): class good-emoji
     * 1 (😐 - okay): class neutral-emoji
     * 0 (😞 - not great): class sad-emoji
   - Props:
     * selectedRating: number | null
     * onSelect: (rating: 0|1|2|3) => void
   - Styling: large emoji, tap to select, selected highlighted
   - No numeric labels (visual-first design)

6. pwa/src/hooks/useCapture.ts
   - State:
     * images: File[]
     * selectedMealIndex: number | null
     * rating: number | null
     * isSubmitting: boolean
     * error: string | null
   - Actions:
     * addImage(file) → validates, adds to images
     * removeImage(index)
     * selectMealIndex(index)
     * setRating(rating)
     * submitRecipe() → multipart POST to /api/recipes
   - Validation logic:
     * Max 20 images
     * Each file: max 20MB, MIME: jpeg/png/webp
     * Rating: 0-3
     * MealIndex: -1 or 0-imageCount-1

7. pwa/src/lib/imageUtils.ts
   - validateImage(file) → { valid: bool, error?: string }
     * Check size (max 20MB)
     * Check MIME type (image/jpeg, image/png, image/webp)
     * Return error message if invalid
   - validateImageCount(count) → { valid: bool }
     * Min 1, max 20
   - getMimeType(file) → string (helper)
   - compressImage(file) → Promise<File> (optional for Phase 0)

8. pwa/src/lib/recipeClient.ts (or extend api.ts)
   - submitRecipe(familyMemberId, images[], rating, mealIndex) → Promise<{ recipeId }>
   - Constructs FormData:
     * files: each image as multipart field
     * rating: form field
     * cookedMealImageIndex: form field
   - Headers:
     * X-Family-Member-Id: familyMemberId (from Zustand)
   - Error handling: API validation errors displayed to user

9. pwa/src/components/capture/SubmitConfirmation.tsx (optional)
   - Success screen after recipe submission
   - Message: "✓ Recipe saved!"
   - Prompt: "Add another recipe?" with buttons:
     * "Add Another" → reset capture flow
     * "View Recipes" → redirect to /recipes (Phase 1)
     * "Back Home" → redirect to /home
   - Auto-redirect to /home after 3 seconds (optional)

10. Update pwa/src/components/capture/CameraView.tsx
    - Add error handling for camera permission denied
    - Fallback to file input if camera unavailable
    - Show helpful message on mobile vs desktop

Validation Rules (from Phase 0 spec):
- Image size: max 20MB per image
- Image count: min 1, max 20 per recipe
- MIME types: image/jpeg, image/png, image/webp
- Rating: must be 0, 1, 2, or 3
- cookedMealImageIndex: -1 or 0 to imageCount-1
- X-Family-Member-Id header: required

Hint Integration (from Session 8):
- phase0-capture tour plays on first visit
- 9 steps guiding through: Add Recipe button → Take photos → Select meal → Rate → Submit
- Each step highlights relevant UI element
- Minimal text, visual cues primary

Guidelines:
- Mobile-first camera experience
- No external camera library (use native getUserMedia)
- Error messages in user-friendly language
- Show progress: "Step 1 of 4" during capture
- All images stored in component state (not persisted)
- TypeScript strict mode

Target:
- Camera opens without permission errors
- Can capture or select multiple photos
- Photos display in scrollable gallery
- Can select 1 as meal hero
- Can rate with emoji
- Submit button validates all fields
- API receives correct multipart data
- Success confirmation displays
- Redirect to /home works
```

---

## What to Expect

After this session:
- ✅ Full recipe capture flow implemented
- ✅ Camera integration working on mobile + desktop
- ✅ Image validation preventing invalid uploads
- ✅ Rating emoji selector working
- ✅ API submission with correct multipart format
- ✅ Hint system integrated into capture flow
- ✅ Ready for final integration testing

## Next Steps

1. Test capture flow on mobile (iOS/Android) and desktop
2. Test camera permissions (allow/deny scenarios)
3. Test image validation (oversized files, wrong MIME types)
4. Test form submission to running API
5. Verify recipe appears in recipe list (future session)
6. Commit: `git commit -m "session 9: recipe capture flow and image handling"`
7. Move to Session 10
