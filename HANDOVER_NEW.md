# Image Loading Regression on Planner

## Problem
After frontend fixes to add `/backend` prefix to image paths, **no recipe images load anymore**.

**Previous state**: 3 of 7 images loaded (Unsplash URLs)
**Current state**: 0 of 7 images load (regression)

## Root Cause
Two types of image sources exist:
1. **Backend hero images**: `/api/recipes/{id}/hero` → needs `/backend` prefix
2. **External images** (Unsplash): `https://images.unsplash.com/...` → already full URLs

The fix incorrectly added `/backend` prefix to ALL image paths, breaking external URLs:
- `https://images.unsplash.com/...` became `/backend/https://images.unsplash.com/...` ❌

## Files Modified
- `pwa/src/app/(app)/planner/page.tsx` (lines 585-598)
  - Added `/backend` prefix to all image sources
  - Added `unoptimized` flag
  - Added `onError` error handler

## Solution
Conditionally add `/backend` prefix only for backend API paths:
```typescript
// Only prefix if it's a backend API path, not an external URL
const imageSrc = day.recipe.image?.startsWith('/api/') 
  ? `/backend${day.recipe.image}` 
  : day.recipe.image;
```

## Text Wrapping Status ✓
Recipe name wrapping with `line-clamp-2` is working correctly and should be preserved.

## Test Cases
After fix, verify:
- ✓ Unsplash mock images load (3 recipes on current week)
- ✓ Backend hero images load when available (or fail gracefully)
- ✓ Recipe names wrap across 2 lines without truncation
