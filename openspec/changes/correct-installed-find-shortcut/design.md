# Design

## Context and Existing Ownership

`pwa/src/lib/baseManifest.json` currently sets Quick Find to `/discovery` and Capture to `/capture`. `openspec/specs/app-installation/spec.md`'s “Advertise direct household shortcuts” and the manifest assertion in `pwa/e2e/install-identity.spec.ts` encode those same destinations. The app already has recipe search at `/recipes`; this is a destination correction, not a new feature route.

The server install-identity owner derives shortcut metadata from the base manifest. Existing household-identity/member-context owners govern access; a manifest shortcut is not an authentication bypass. No current installed-device behavior or update timing was observed here.

## Decisions and Tradeoffs

Keep Find's name/copy/icon and point it to `/recipes`. Renaming it Vote while retaining Discovery would describe the old destination, but Alex chose the recipe-search correction. Capture and all other manifest identity/metadata stay unchanged. No API/client generation, new redirect, new query parameter or separate shortcut-specific gate is needed.

This draft intentionally changes the existing requirement's `/discovery` value. Do not rewrite unrelated preserved installation requirements. Alex separately confirmed this draft for application; cooking is already separately authorized and continues independently.

## First Observable Slice

Request the actual manifest → inspect its Find/Capture URL values → follow the advertised destinations through the existing household/member gates. First change the destination regression to expect `/recipes` and observe the intended failure against the current manifest. After application is approved, change that single manifest URL, then verify the same regression and existing entry policy. Keep Capture's route and icon/text preservation assertions.

No installation/reinstallation is needed to establish local manifest correctness. Whether or when an existing phone launcher refreshes its shortcut is separate platform/deployed-build evidence, not something a passing local test certifies.
