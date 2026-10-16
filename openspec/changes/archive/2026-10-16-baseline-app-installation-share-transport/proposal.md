# Proposal

## Why

Install-facing share declarations and worker transport need a baseline distinct from browser staging and API capture. Source and synthetic tests do not establish installed OS delivery.

## What Changes

- Add deployment-selected share advertisement, controlled-worker link/PDF handoff and failure outcomes.
- Record worker network boundaries without an offline guarantee.
- Reference recipe-capture for link review and PDF acquisition; retain U11/U74 and mode-propagation limitations.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-installation`: add conditional share transport and worker request boundaries.

## Impact

Documentation only. First entry: manifest `pdfManifest` → controlled `/share-target` POST → `pdf-share.js` → capture redirect. No API upload or document rendering in the worker. No consequential question prevents documenting this supported subset. No code, deployment or owner-spec changes.
