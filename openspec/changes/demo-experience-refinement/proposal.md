# Proposal

## Why

Demo visitors can see the server-selected Demo identity while Welcome still asks for a family passphrase: its prefill depends on a separate browser health response. Current main confirms the two inputs can disagree; this is a source-supported failure mechanism, not a verified cause on the deployed demo. The tiny login hint also hides the explanation already available in the app.

## Outcome and Scope

Refine Welcome so eligible public demos arrive with the public passphrase filled in, an honest next-action helper, and the existing compact sage explanation control. Entry remains explicit, editable and subject to ordinary household authentication. Private installations and demos using custom or missing secrets retain manual entry.

This PR contains planning artifacts only. Alex approved the three directions, but the delegated stage requires written specification and design review before product implementation. Stop after publishing this draft; implementation tasks require the subsequent approval. No deployment, merge, release image, credential change, production test, spec sync or archive is included.

## What Changes

- Resolve Welcome presentation from the same server installation-identity owner as the document, independent of browser health. Prefill only when PWA Demo is enabled and the configured secret exactly equals the deliberately public constant `Swipe-Match-Cook`; emit that constant or no prefill, never an arbitrary configured secret.
- Preserve explicit Enter, edits and clearing, validation, retry, token/cookie ordering and member onboarding. No new authentication role or automatic login.
- Replace Welcome's tiny Demo note with the existing 32px minimum sage band and shared EN/FR explanation. Opening there is manual; automatic introduction remains owned by eligible Home entry. Share the existing Demo acknowledgement without letting login interaction consume Home eligibility.
- Show the new helper only while an actual initial prefill remains untouched. Any edit, including clearing or retyping the same value, restores the ordinary localized helper for that mounted form.
- Preserve Beta identification through the existing accessible channel description on Demo and the existing Beta-only note outside Demo; add no Beta introduction.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `demo-household`: guarded health-independent Welcome prefill, truthful helper, a manual login entry to the existing explanation, and Welcome-to-Home lifecycle preservation. Ordinary access requirements remain owned by [household-identity](../../specs/household-identity/spec.md).

## Impact

Source baseline: main `e680fb7966978da3fbde25453a241c7e69e2b2a1`, matching the clean saved cloud checkout. Likely future seams are Welcome's server/client boundary, `resolveAppIdentity`, the existing DemoContext presentation and visit store, IdentityHint, EN/FR common strings, and focused unit/browser tests. No REST operation, OpenAPI payload, generated client, database, provider policy or release configuration change is proposed.

Competing work was checked through GitHub: [#348](https://github.com/AlexandreBrisebois/whats-for-supper/pull/348) is merged and supplies the reusable Demo pattern; [#340](https://github.com/AlexandreBrisebois/whats-for-supper/pull/340) remains a draft for broader capture/reset work; [#351](https://github.com/AlexandreBrisebois/whats-for-supper/pull/351) remains a draft Beta proposal sharing presenter/focus seams. Their older prose is not current-main evidence. This change neither applies nor supersedes them. Reconcile shared presenter changes against current main before later implementation.
