# Recipe on one page — Requirements

**Kind:** Feature specification

**Status:** Approved for implementation on 2026-09-30

**Feature flag:** `single-page-recipe-steps`

## Outcome

After gathering ingredients, a cook can read and correct every cooking instruction
on one vertically scrollable page without losing their place. The established
tablet composition remains cookbook-like while the phone experience stays readable
and interruption-safe.

## Scope

- Use the generic feature-flag system as its first real consumer.
- Preserve the existing **Getting ready** ingredient checklist in both experiences.
- Preserve the existing one-step-at-a-time experience as the legacy path.
- Add a single-page instruction path after preparation.
- Preserve recipe completion, issue reporting, fallback instructions, structured
  and legacy instruction parsing, and in-place step editing.

## Requirements

### SPRV-01 — Shared preparation

Both experiences shall begin with the existing ingredient checklist. Checked state,
ingredient issue reporting, and the explicit transition into cooking shall remain
available and shall not depend on the feature flag.

### SPRV-02 — Single decision boundary

After preparation, `single-page-recipe-steps` shall select either the existing
focused-step presentation or the single-page presentation at one named boundary.
Loading, missing, unknown, or failed flag state shall select the focused-step path.

### SPRV-03 — One scrollable page

The feature path shall render every parsed cooking step in recipe order within one
vertical scrolling surface. It shall not require Next or Previous to read another
instruction. The explicit completion action shall remain available, labeled **Finish cooking**
in the single-page presentation. Scrolling shall update reading position, preserve
the step bookmark for reopening, and never mark the meal cooked.

### SPRV-04 — Existing tablet composition

The feature shall retain the current responsive Cook's Mode shell: on tablet-sized
viewports the full-height recipe image/title panel remains beside the instruction
surface. The feature changes the instruction surface rather than introducing a
simulated book, page-turn animation, or second independently scrolling text column.

### SPRV-05 — In-place correction

Every instruction shall expose an accessible **Edit step N** action. Editing shall
replace only that row with its input and Save/Cancel actions. Saving shall persist
through the existing recipe update API and update the visible step without
navigating, losing checklist state, or resetting scroll position.

### SPRV-06 — Safe edit recovery

Only one step may be edited at a time. Save shall disable only that editor while
pending. A failed save shall keep the draft, show **Couldn't save this step. Try
again.**, and provide Retry. Cancel shall restore the confirmed value and return
focus to the initiating edit control.

### SPRV-07 — Accessible cooking use

Repeated controls shall identify their step, keyboard focus shall be visible, touch
targets shall be at least 44 by 44 CSS pixels, and save status shall be announced
without stealing focus. The feature shall not rely on gesture, hover, or color.

### SPRV-08 — Completion and compatibility

Completing either instruction experience shall invoke the same cooked-completion
behavior. Structured HowTo sections/steps, flat legacy instructions, fallback steps,
issue reporting, recipe detail access, and current progress data shall remain
compatible.

## Member-facing copy

- **Name:** Recipe on one page
- **Description:** After getting ready, scroll through all the cooking steps on one page.

## Graduation criterion

Graduate only after responsive and accessibility acceptance passes on phone and
iPad-sized viewports and the cooking-experience owner approves graduation after the
opt-in observation period.

## Removal checklist

1. Set `WFS_FEATURE_SINGLE_PAGE_RECIPE_STEPS=on` and verify both target viewports.
2. Replace the decision boundary with the single-page path.
3. Delete focused-step-only presentation and dual-path tests.
4. Rename preview symbols to durable Cook's Mode names.
5. Remove registry copy/configuration and member overrides for the key.
6. Prove the key and environment variable no longer occur in active code/config.
