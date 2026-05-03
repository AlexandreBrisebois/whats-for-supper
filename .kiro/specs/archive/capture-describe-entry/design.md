# Design Document: capture-describe-entry

## Overview

This change refactors `MinimalCapture.tsx` to remove the three-tab navigation bar and replace it with a single, always-visible capture view. The "Describe It" path becomes a quiet tertiary option — a `Describe_Link` button inside the `Capture_Box` — rather than a peer tab. When tapped, the `Describe_Form` slides in below the box without hiding the camera/gallery UI.

The change is scoped entirely to `pwa/src/components/capture/MinimalCapture.tsx`. No API contracts change, no new components are introduced, and no other files are touched.

---

## Architecture

The component's state model simplifies from a three-way `activeTab: Tab` discriminant to a single boolean `showDescribe`. All camera/gallery content renders unconditionally (no longer gated by `activeTab === 'camera'`). The `Describe_Form` renders conditionally below the `Capture_Box` when `showDescribe` is `true`.

```
Before:
  activeTab: 'camera' | 'gallery' | 'describe'
  → Tab_Bar drives which content block renders

After:
  showDescribe: boolean (default false)
  → Camera/gallery content always renders
  → Describe_Form renders below Capture_Box when showDescribe === true
  → Describe_Link inside Capture_Box hidden when showDescribe === true
```

The `Tab` type and `tabs` array are deleted. The `mode` prop no longer needs to set an initial tab — it can be removed or left as a no-op since there is only one view.

---

## Components and Interfaces

### State changes

| Before | After | Notes |
|---|---|---|
| `const [activeTab, setActiveTab] = useState<Tab>(initialTab)` | `const [showDescribe, setShowDescribe] = useState(false)` | Replaces tab state |
| `type Tab = 'camera' \| 'gallery' \| 'describe'` | *(deleted)* | No longer needed |
| `const tabs = [...]` | *(deleted)* | No longer needed |
| `const initialTab: Tab = ...` | *(deleted)* | No longer needed |

### Prop changes

The `mode` prop previously set the initial tab. Since there is now only one view, `mode` has no effect. The prop signature can be kept for backward compatibility (it is simply ignored) or removed. Given the instruction to simplify, it should be removed unless callers depend on it.

> **Decision**: Remove `mode` from the prop interface. The prop was only used to set `initialTab`, which no longer exists. Callers passing `mode="photo"` will get a TypeScript error that guides them to clean up the call site.

### Render structure (after)

```
<div className="flex flex-col gap-6">
  {/* Capture_Box — always rendered */}
  <div className="... Capture_Box ...">
    <Camera_Button />
    <Gallery_Link />
    {!showDescribe && <Describe_Link onClick={() => setShowDescribe(true)} />}
    <input ref={fileInputRef} ... />
    <input ref={galleryInputRef} ... />
  </div>

  {/* Photo preview, rating, notes, save — always rendered when images exist */}
  {images.length > 0 && <PreviewArea />}

  {/* Describe_Form — rendered below Capture_Box when showDescribe is true */}
  {showDescribe && (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <DescribeForm />
    </div>
  )}

  {error && <ErrorMessage />}
</div>
```

### Describe_Link element

```tsx
<button
  type="button"
  onClick={() => setShowDescribe(true)}
  className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest text-terracotta/40 transition-colors hover:text-terracotta"
>
  <PenLine size={16} />
  Or Describe It Instead
</button>
```

- Positioned inside `Capture_Box`, below `Gallery_Link`
- Hidden (`!showDescribe` guard) once the form is open — prevents duplicate reveals
- Uses `PenLine` from `lucide-react` (already imported)
- Opacity/color (`text-terracotta/40`) signals tertiary hierarchy below `Gallery_Link` (`text-terracotta/60`)

---

## Data Models

No data model changes. All existing state (`describeName`, `describeText`, `isDescribing`, `describeError`, `images`, `rating`, `notes`, etc.) is preserved unchanged. The only state change is the removal of `activeTab` and the addition of `showDescribe`.

---

## Error Handling

No changes to error handling logic. The existing patterns are preserved:

- Photo path errors: `error` from `useCapture()`, rendered at the bottom of the component
- Describe path errors: `describeError` local state, rendered inline above the submit button
- Validation: `handleDescribeSubmit` guards on `!describeName.trim()` before calling the API — unchanged

---

## Testing Strategy

This feature is a UI refactor with no pure functions, no data transformations, and no business logic with meaningful input variation. Property-based testing is not appropriate here. All acceptance criteria map to specific rendering and interaction assertions.

**Why PBT does not apply**: Every acceptance criterion is either a structural DOM assertion (element present/absent, CSS classes), a specific interaction test (click → state change), or a validation edge case. None involve universal properties that hold across a wide input space where 100 iterations would find more bugs than 2–3.

### Unit / component tests

Use the project's existing test framework (Vitest + React Testing Library, consistent with the PWA's test setup).

**Rendering tests** (initial state):
- Tab_Bar is absent from the rendered output
- `Capture_Box` is present with correct classes (dashed border, rounded corners, background tint, padding)
- `Camera_Button` is present with correct classes (terracotta bg, circular, shadow, ring)
- `Gallery_Link` is present with its exact existing className
- `Describe_Link` is present with correct text ("Or Describe It Instead"), `PenLine` icon, and className
- `Describe_Form` is NOT present on initial render

**Interaction tests**:
- Clicking `Camera_Button` triggers `fileInputRef.current.click()`
- Clicking `Gallery_Link` triggers `galleryInputRef.current.click()`
- Clicking `Describe_Link` sets `showDescribe = true`, causing `Describe_Form` to appear
- After `Describe_Form` appears: `Capture_Box` is still present, `Describe_Link` is hidden, `Describe_Form` has `animate-in fade-in duration-300` classes

**Describe form tests**:
- Submitting with empty name shows validation error, does not call API
- Submitting with whitespace-only name shows validation error, does not call API (edge case)
- Submitting with valid name calls `apiClient.api.recipes.describe.post` with correct payload
- Loading state shows spinner and disables button during submission
- API error sets `describeError` and displays it

**Photo path tests** (regression — unchanged behavior):
- When `images.length > 0`, preview area, rating buttons, notes textarea, and save button are rendered
- Save button calls `submitRecipe()` and navigates on success
