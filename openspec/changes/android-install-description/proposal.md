# Proposal

## Why

Issue #274 requests `Swipe, Match, Cook.` in Android installed-app details. Current manifest and HTML descriptions instead contain different capture/planning copy; the actual Android field and its ownership remain unqualified.

## Outcome and Scope

Publish the exact tagline in app-controlled description metadata while preserving installation identity. Android target-surface success requires separate fresh-install and existing-install evidence; metadata-only verification cannot close the issue. No production operation, reinstall, app rename, icon change, or PR #285 visual work is included.

## What Changes

- Align manifest and HTML descriptions to the exact tagline.
- Add focused metadata regressions across the identity matrix and public initial HTML.
- Record source tracing, documented browser constraints and outstanding Android qualification.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-installation`: publish a consistent description without changing identity or certifying OS display.

## Impact

Base manifest, root HTML metadata, existing app-identity units and install-identity browser checks. No API, database, dependency or launch behavior changes. Android/Chrome owns WebAPK packaging, refresh and settings presentation.
