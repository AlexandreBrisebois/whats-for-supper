# Design

## Context and Existing Ownership

`pwa/src/lib/baseManifest.json` supplies the manifest description through `pdfManifest`, which only selects the share target. `pwa/src/app/manifest.json/route.ts` overlays identity names/icons and returns no-store metadata. `pwa/src/app/layout.tsx` independently supplies the HTML description through Next metadata. `app-identity.ts` owns baked release channel and runtime demo icon variants. None of these proves which field the user's Android settings screen displays.

## Decisions and Tradeoffs

Use the base manifest description as the shared HTML description source. Keep the exact expected tagline literal in regression assertions so source drift cannot silently update expectations. Preserve every other manifest field, identity resolver and launch path; do not add cache-busting identity changes. The safe metadata correction is authorized independently of unavailable Android qualification. Target-surface feasibility remains an explicit incomplete task, not an assumed product guarantee.

## First Observable Slice

Update the existing identity matrix unit assertions first and observe missing tagline failures, then align the base manifest and HTML consumer. Add initial HTML/manifest assertions to the existing install-identity browser check. The real application seam ends at public HTTP metadata; Android/WebAPK is a separate integration boundary with fresh and existing installations checked separately.

## Compatibility, Rollout and Reversal

No deployment is part of this work. Chrome owns WebAPK generation and updates. Its [manifest update documentation](https://web.dev/articles/manifest-updates) does not list description as an Android update trigger; no-store alone cannot force installed metadata refresh. Keep the manifest URL and install identity unchanged. Record actual device versions, navigation and before/after text when a supported device becomes available; do not reinstall an existing installation to substitute for refresh evidence.
