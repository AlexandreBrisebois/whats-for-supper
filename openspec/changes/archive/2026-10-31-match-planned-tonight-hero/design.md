# Design

## Context and Existing Ownership

TonightMenuCard sets a 160–240 px viewport/container height clamp on TonightRecipeImage; TonightPivotCard sets aspect-[5/4]. Commit f955c12e introduced the planned clamp to reveal lower handoffs. TonightRecipeImage already owns cover cropping, rounded clipping, image loading/recovery and a separate modest icon fallback. HomeCommandCenter owns the shared responsive width cap.

## Decisions and Tradeoffs

Replace only the planned image height utility with aspect-[5/4], retaining mb-4 and all surrounding state-specific spacing. At equal inner widths the loaded photo height is 0.8 times width, independent of viewport height. Keep the existing container declaration to avoid adjacent cleanup. The user approved additional page scrolling; do not compensate by shrinking text, controls, padding or the pivot image. No runtime state, API contract or shared image implementation changes.

## First Observable Slice

A browser sees the ready GOTO with a loaded fixture photograph, activates Make this tonight through the existing Home/store/assignment seam, and measures the resulting planned photograph. Existing schema-compliant browser mocks own GET schedule/GOTO/recipe and POST schedule/assign responses; internal stores and components remain real. Assert matching image bounds and 5:4 ratio before any reachability helper scrolls the page. First observe the expected failure with the clamp, then make the one-utility change and repeat.

## User Experience

Keep planned Cook/Change plan/disclosure and pivot alternatives unchanged. Cover phones 390x844, 412x915, 320x640 and iPad 820x1180/1180x820 in EN/FR. Existing long title, 200% text, disclosure, focus/touch-target, navigation clearance and failed/missing-photo checks remain; update only obsolete height-shrinking and initial no-scroll assumptions. Inspect captured rendered planned/pivot results. No new screenshot deliverable or Library write is required.

## Risks and Deferrable Questions

The shared checkout contains concurrent telemetry work. Use a frozen temporary copy, copied dependency bytes and owned dev-server port for rendered checks; coordinate a shared-source freeze for the combined verification gate. Record snapshot identity, actual commands and remaining verification limits with task evidence. The user subsequently authorized this completed change's main-spec synchronization and archival, after gate success and freeze release.
