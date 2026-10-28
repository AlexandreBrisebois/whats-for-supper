# Proposal

## Why

The installed app's Quick Find / Find shortcut currently advertises `/discovery`, the voting journey, rather than recipe search at `/recipes`. The manifest, canonical requirement and regression assertion all preserve that mismatch, so this needs an explicit requirement correction rather than a silent implementation change.

## Outcome and Scope

Prepare the requested small reviewable correction: Find opens `/recipes`; Capture continues opening `/capture`. Preserve shortcut names, descriptions, icons, household access and member-context gates. The requested behavior is bounded, but this handoff authorizes specification preparation first; application was explicitly approved after the separate draft review.

## What Changes

- Advertise `/recipes` as Quick Find's destination, retaining short name Find and existing copy/icon.
- Update destination acceptance to distinguish recipe search from voting and preserve normal household/member entry handling.
- Leave Capture, launch identity, other manifest fields and installation behavior unchanged. No migration, new route or API is needed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-installation`: correct the advertised Quick Find destination without bypassing existing entry gates.

## Impact

Local implementation changes one destination in `pwa/src/lib/baseManifest.json` and the corresponding assertion in `pwa/e2e/install-identity.spec.ts`, with focused destination/gate coverage as needed. The canonical requirement currently specifies `/discovery`; this delta records the intentional correction and leaves canonical files unchanged until the normal change lifecycle. Source inspection is at HEAD `733d51c8`; the separate cooking implementation remains independent. No deployment or installed-device update claim is made by the local verification.
