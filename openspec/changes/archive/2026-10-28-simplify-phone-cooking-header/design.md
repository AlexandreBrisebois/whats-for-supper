# Design

## Context and Existing Ownership

See proposal.md for scope. A design is useful here to settle responsive placement, space allocation and contrast measurement before coding.

`CooksMode.tsx` owns the hero/photo/title, `cooks-mode-header-controls`, `cooking-reading-context`, progressbar and instruction scroller. The phone photo has a minimum height of 8.5rem; the status row reserves at least 44px and contains the focused Edit action. The current title has `bg-charcoal/65` plus a full-photo gradient. The screenshot is a visual reference for direct white title text, not a request to restore its counter pill, instruction cards or older interactions.

`CooksMode.test.tsx` and `cook-mode-steps.spec.ts` assert the current indicator and Edit placement. Existing browser coverage already exercises light/dark food photos, EN/FR, viewport changes and source access. State and writes remain owned by the existing cooking component, stores and API wrapper; layout changes must not replace them.

## Decisions and Tradeoffs

- Use the existing stacked/sidebar breakpoint, rather than device detection. Remove the status row only from the stacked layout; retain tablet reading context. Prefer one responsive Edit control rather than mounting duplicate keyboard targets. Position it in the existing action area on phones and preserve its tablet presentation.
- Remove phone title backing and horizontal padding belonging to that backing. Retain bold live white text over a continuous gradient. Tune the gradient's lower region and title placement to guarantee 4.5:1 over every title line; do not substitute a shadow or an unmeasured translucent rectangle. Keep sidebar title styling unchanged.
- Start tuning with approximately 20px extra photo height at ordinary portrait sizes. This is a proposed initial value, not a fixed contract. Compare matched 390x844 and 430x932 captures: photo height and instruction viewport must both increase. Do not spend all recovered space on the photo or introduce a new badge/status row.
- Keep the thin terracotta bar, its numeric ARIA range and current bookmark logic. Expose reading position rather than completion in All steps. Use sufficient lightness difference between filled/remaining portions. Preparation and unavailable content retain existing honest body explanations and no fictitious count.
- The relocated focused Edit retains its accessible name and existing draft/save/cancel behaviour. It is absent during preparation, unavailable instructions, All steps and active editing. Preserve existing pending/guard behaviour; moving controls must not open hero detail. All steps row editing remains local to each instruction.

## First Observable Slice

Open a loaded recipe on a 390x844 phone, start Step by step, activate Edit in the action row below the image, change and save the current instruction through the existing recipe update wrapper, then advance. The separate phone status row is absent, the progressbar retains the correct bookmark/count and the saved text appears. This exercises entry, responsive composition, the real editor/wrapper and existing update boundary. Intercept only existing external API/asset boundaries in browser tests; no backend work is necessary.

Follow with All steps scrolling, preparation return, unavailable instructions and source consultation to establish preservation.

## User Experience

The phone order is photo/title with existing Close/Report actions, compact presentation/Original/focused Edit tools, thin progress bar, scrolling reading surface, then the existing footer. The photo and essential controls remain stationary during instruction scrolling. Header tools may wrap with at least 44x44px targets; labels and targets must not shrink to force a single row.

At 320px, in short landscape, with long EN/FR titles and at 200% text enlargement, allow content-driven header growth while retaining a usable instruction scroller, reachable footer and no horizontal overflow or title/action collisions. Reserve space for top-right actions. Keep fallback images, loading/retry content, preferences, drafts, Original consultation/return, ingredient checks, reporting and completion recovery unchanged.

Measure title contrast against actual rendered composites using the same image, crop, gradient and geometry with glyphs temporarily transparent for sampling. Sample all title regions, including wrapped lines and the brightest underlying areas; nominal gradient stops alone are not evidence. Check bar lightness contrast, keyboard focus, accessible names and targets separately from visual warmth. Use matched food photos for cookbook-character review; screenshots alone do not prove interactions or blanket accessibility compliance.

## Risks and Deferrable Questions

Extra Edit width can wrap tools and consume recovered space. Validate representative focused and All steps layouts rather than asserting a fixed total header height everywhere. Default portrait height gains are required only for the two ordinary All steps fixtures named in the delta; reflow takes priority for enlarged text/short screens. Exact gradient stops and responsive height tuning can be selected during implementation within these acceptance limits. Physical-device safe areas and zoom require separate evidence if unavailable locally.

## Apply-time serialization repair

Alex authorized a focused wrapper repair after browser acceptance demonstrated that passing a raw instruction array to Kiota's UntypedNode field serialized it as `{}`. Convert only defined instruction arrays through the installed Kiota JSON parser; keep the existing PATCH contract and generated code unchanged. Regression coverage uses the real generated serializer for string, nested HowToSection and empty arrays, plus stateful browser PATCH/GET acceptance.

## Verification maintenance

The required full browser gate twice exposed an existing Tomorrow-test teardown race: a fulfilled move response let the test finish before the mock finished its SSE callbacks. The single test now drains pending route callbacks before page closure and retains an API isolation boundary during that drain. All scenario assertions and shared mock/runtime behavior remain unchanged.
