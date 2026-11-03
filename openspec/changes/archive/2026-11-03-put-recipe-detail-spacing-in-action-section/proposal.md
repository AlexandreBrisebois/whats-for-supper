# Proposal

## Why

Alex clarified that the extra detail-sheet bottom space belongs to the section containing the buttons. The just archived `space-recipe-detail-actions-from-sheet-edge` change put the increment on the whole scroll container instead. Its geometry test checked only the final gap and could not distinguish the wrong owner.

## What changes

- Restore the recipe-detail scroller's original 24 CSS px ordinary trailing padding at normal text size.
- Add the 8 CSS px increment inside the final read-action section containing Cook This, Find Similar and Ask the Family, and likewise inside the edit Save/Cancel action section when it is final. Keep the overall final action-to-panel edge gap at approximately 32 CSS px on the normal read path; the action section itself owns the increment.
- Keep action order, button sizes, colors, behavior, focus and scroll reachability. Do not change the app dock, the stack Ask the Family panel, sheet placement or safe-area ownership.

## Capability

- Modify `recipe-library`'s detail-action spacing requirement. The archived prior change remains historical evidence; this new delta corrects its owner rather than rewriting its archive.

## Evidence and limits

`RecipeDetailSheet.tsx` currently has `overflow-y-auto px-6 pb-8 pt-4`, while the read action group has `pt-5` and no bottom padding. The edit action group has `py-4 mb-5`. The previous local browser tests measured the total last-action gap at the intended 32 px but did not measure which element supplied it. The two newly supplied Library PNGs (`libfile_e6eb167cde5c8191bc75c13b36b94fc4`, `libfile_f4272454eff481919560bf6170e9cd91`) resolved to image metadata, but both byte transfers failed; their pixels were not inspected. The earlier local rendered bottom-of-sheet capture `/tmp/wfs-detail-footer-390.png` was inspected. This proposal follows Alex's explicit owner correction.
