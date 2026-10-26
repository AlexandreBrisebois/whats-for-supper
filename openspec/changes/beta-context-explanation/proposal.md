# Beta context explanation proposal

## Why

[Issue #345](https://github.com/AlexandreBrisebois/whats-for-supper/issues/345) asks for understandable pre-release context in place of the tiny unexplained Beta hint. Reusing the Demo interaction lets a household learn once and reopen the explanation without repeated interruptions.

## Outcome and Scope

**Reviewed design accepted; this revision remains planning-only.** Alex approved the reviewed Beta behavior with “Good to go” on 2026-10-26 and then approved continuing the existing implementation task. The specification writer has not implemented Beta behavior. This PR must not close #345. No runtime code, credentials, dependency pins, deployment or production testing changes are included.

Main `0a8b7850a26578551beb723713fcf8b3e920a863`, including merged Demo refinement [PR #354](https://github.com/AlexandreBrisebois/whats-for-supper/pull/354), is now merged into this branch at `cfa297e1eac15eeeaff3d9492821bce484a0a2e8`. The prerequisite is available: reuse its shared explanation presentation, manual Welcome wrapper, Home eligibility and corrected dismissal-only focus restoration. This PR's difference from main is the five Beta planning files plus removal of the obsolete Beta-only Welcome scenario from the active Demo refinement delta; no Demo implementation or stack is added. Recheck current source and specification ownership before any approved apply phase.

Alex approved the warmer English disclaimer on 2026-10-26; this revision records it exactly with matching French. Alex's final approval accepts initial query-free Home eligibility and Demo-first combined-mode precedence, including the documented identity mismatch. Including Welcome also exposes a policy choice: its existing Demo presenter uses server installation identity without runtime health, whereas the app-shell Beta proposal requires confirmed non-demo runtime. The scoped installation-identity Welcome exception in [design](design.md) is accepted. Alex also approved the shared band/modal title pair: `Beta · Better with your ideas` / `Bêta · Meilleure grâce à vos idées`. The reopen hint and dismissal actions are retained. Alex also selected GitHub Issues feedback instead of Demo's installation link and requested a streamlined feedback template. The reviewed link/helper labels and one bilingual form with only the task question required are accepted; the form does not exist yet and the direct-template release prerequisite still applies. The approved implementation task may derive bounded tasks from [design](design.md) without another design-approval gate. Merge, deployment and production tests are not authorized.

## What Changes

- Beta-only gets the same compact pale sage band, charcoal text and shared phone sheet / wider dialog as the latest Demo, with Beta-specific pre-release copy in EN/FR. Match the 32px minimum band, 13px/18px label and 16px help icon; modal controls remain at least 44px.
- Include Welcome (login): one manually opened band above the form, no automatic login popup or duplicate tiny Beta note. Share Beta acknowledgement with Home, not login interaction history. Explicit dismissal suppresses a later Home introduction; departure without dismissal does not.
- A first normal ready Home visit can introduce the explanation before interaction. Deep links and active work suppress automatic introduction for that app visit, with no delayed interruption.
- Explicit dismissal uses a separate browser-local Beta acknowledgement; failures use visit memory. Cosmetic edits, member changes and household resets do not replay it.
- Add a voluntary GitHub feedback link in the Beta explanation, not Demo's installation link. Plan a minimal feedback template and link directly to it only after the form is merged into the repository's default branch (`main`) and the exact URL is verified; use the Issues index until then, without a runtime availability probe. Open only on explicit activation, without automatic issue submission or app data in the URL; Demo retains its installation link.
- Proposed overlap policy retains Demo-first presentation and the existing accessible Beta-channel hint, without stacked introductions or cross-mode acknowledgement.
- Authentication, member selection, household data, AI policy, capture, cooking, planning, voting, resets, icons/manifests and release identity stay with their existing owners. Beta alone never prefills a passphrase or shows the Demo-prefill helper. Preserve the untranslated `Whats for Supper?` Welcome heading in EN/FR.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-installation`: add informational Beta release-context presentation and acknowledgement requirements. This owner already covers install-facing identity and shell presentation; access remains owned by `household-identity`, and Demo behavior by `demo-household`. No parallel onboarding capability is introduced.

## Impact

This change updates the existing Beta planning artifacts and removes the conflicting Beta-only Welcome scenario from the active Demo delta, as Alex approved. The approved implementation will reuse the installation identity accessor, DemoExplanation presentation seam, WelcomeDemoContext manual lifecycle, DemoContext Home policy, DemoDialog, shared Layout and locale owners; see immutable source links in [design](design.md). No API, OpenAPI, generated client, database or server acknowledgement change is proposed. Beta-only Welcome presentation is owned by this app-installation delta; Demo behavior and prefill policy remain unchanged. Do not copy Demo body claims, prefill policy or Home observers into login.
