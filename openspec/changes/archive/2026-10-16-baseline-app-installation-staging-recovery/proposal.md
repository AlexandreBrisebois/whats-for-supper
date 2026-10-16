# Proposal

## Why

Browser share staging is temporary handoff state, and needs an explicit boundary from installed OS transport and durable recipe intake. Preserve the current one-slot ownership and interruption behavior without expanding the accepted capture owner.

## What Changes

- Add token-matched one-use staging, age-bound cleanup and departure from capture.
- Describe conditional foreground handoff using accepted capture eligibility, interruption and recovery requirements.
- Record substitutions, no draft resume, failed storage cleanup limits and no installed-delivery guarantee.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-installation`: browser staging ownership and capture handoff recovery.

## Impact

Documentation only. First observable path: `pdf-share.js` stage → claim transaction → `pdfShare.ts` → `PdfCapturePanel` → existing capture confirmation. `PdfShareLifecycle` discards tokens away from capture; `pdfCaptureStore` holds only foreground selection. Recipe-capture/household-identity remain unchanged owners. No consequential decision blocks this supported subset.
