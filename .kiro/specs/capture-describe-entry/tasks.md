# Implementation Plan: capture-describe-entry

## Overview

Refactor `pwa/src/components/capture/MinimalCapture.tsx` to remove the three-tab navigation bar and replace it with a single always-visible capture view. The "Describe It" path becomes a quiet tertiary link inside the `Capture_Box`. A new `showDescribe` boolean state controls whether the `Describe_Form` renders below the box. No API changes, no new source files beyond the updated E2E test.

## Tasks

- [x] 1. Remove Tab_Bar: delete dead code and simplify state
  - Delete the `Tab` type alias (`type Tab = 'camera' | 'gallery' | 'describe'`)
  - Delete the `tabs` array constant
  - Delete the `initialTab` variable
  - Delete the `activeTab` state declaration (`useState<Tab>(initialTab)`)
  - Delete the tab switcher JSX `<div>` (the pill bar with the three buttons)
  - Remove the `mode` prop from `MinimalCaptureProps` and the component signature
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Add `showDescribe` state and `Describe_Link` button
  - Add `const [showDescribe, setShowDescribe] = useState(false)` after the existing local state declarations
  - Inside `Capture_Box`, below the `Gallery_Link` button and above the hidden file inputs, add the `Describe_Link` button:
    - `type="button"`, `onClick={() => setShowDescribe(true)}`
    - className: `flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest text-terracotta/40 transition-colors hover:text-terracotta`
    - Children: `<PenLine size={16} />` + text `"Or Describe It Instead"`
  - Wrap the `Describe_Link` in `{!showDescribe && (...)}` so it hides once the form is open
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.3_

- [x] 3. Update render structure: unconditional camera/gallery content and relocated Describe_Form
  - Remove the `{(activeTab === 'camera' || activeTab === 'gallery') && (...)}` conditional wrapper so the camera/gallery content block always renders
  - Remove the `{activeTab === 'describe' && (...)}` conditional wrapper around the `Describe_Form`
  - Move the `Describe_Form` block to render below the camera/gallery content block (after the `{error && ...}` line), wrapped in `{showDescribe && (<div className="flex flex-col gap-6 animate-in fade-in duration-300">...</div>)}`
  - _Requirements: 3.1, 3.2, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 4. Checkpoint — verify TypeScript compiles cleanly
  - Run `task review` (or `cd pwa && npm run typecheck && npm run lint`) to confirm no type errors from the removed `Tab` type, removed `mode` prop, and removed `activeTab` references
  - Fix any call sites that passed `mode` to `MinimalCapture` (TypeScript will surface them as errors)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update E2E tests in `pwa/e2e/capture-flow.spec.ts`
  - [x] 5.1 Update the existing GOTO describe test to reach the form via `Describe_Link` instead of clicking the old tab button
    - Replace `await page.getByRole('button', { name: /describe/i }).click()` with `await page.getByRole('button', { name: /or describe it instead/i }).click()`
    - _Requirements: 2.5, 5.1, 5.2_

  - [ ]* 5.2 Add rendering tests for initial state
    - Assert tab switcher is absent: `expect(page.getByRole('button', { name: /camera/i })).not.toBeVisible()` (or equivalent absence check)
    - Assert `Camera_Button` (`aria-label="Take a photo"`) is visible
    - Assert `Gallery_Link` (`Pick from Gallery`) is visible
    - Assert `Describe_Link` (`Or Describe It Instead`) is visible
    - Assert `Describe_Form` (recipe name input) is NOT present
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.4_

  - [ ]* 5.3 Add interaction test: clicking `Describe_Link` reveals the form
    - Navigate to `/capture`, click `Or Describe It Instead`
    - Assert `Describe_Form` (recipe name input placeholder `our family spaghetti`) is visible
    - Assert `Capture_Box` (camera button) is still visible
    - Assert `Describe_Link` is no longer visible
    - _Requirements: 2.5, 3.1, 3.2, 3.3_

  - [ ]* 5.4 Add describe form validation test
    - Navigate to `/capture`, open form, click `Synthesize Recipe` with empty name
    - Assert validation error message is displayed, API is not called
    - _Requirements: 5.3_

- [x] 6. Final checkpoint — full review pass
  - Run `task review` to confirm formatting, linting, type-check, and tests all pass.
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The project uses Playwright for all PWA tests — there is no Vitest/Jest unit test runner configured; all test tasks target `pwa/e2e/capture-flow.spec.ts`
- No API changes are involved; `task agent:drift` should be a no-op but run it as part of `task review`
- Any call site passing `mode="photo"` to `MinimalCapture` will produce a TypeScript error after task 1 — fix those before task 4
