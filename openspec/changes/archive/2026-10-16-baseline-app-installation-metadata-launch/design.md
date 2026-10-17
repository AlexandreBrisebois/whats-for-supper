# Design

## Context

See proposal.md for motivation. This records existing cross-module behavior, not future architecture. First observable slice: public manifest and initial HTML → app-identity/baseManifest → proxy/IdentityValidator at launch. There is no API or persistence mutation in metadata generation. Evidence and requirement/scenario mapping: BSL-app-installation-001–003 in [capability plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/app-installation.md).

## Goals / Non-Goals

**Goals:** preserve the observable ordinary stable/non-demo metadata and use accepted identity owners for launch.

**Non-Goals:** demo/beta extraction, install-prompt UX, real device installation, OS rendering, application changes, runtime qualification.

## Decisions

- Describe declarations, not device outcomes. `baseManifest.json`, manifest `GET`, layout `generateMetadata`, safe-area CSS and registration script support these requirements. `next.config.js` requests initial-head metadata via `htmlLimitedBots`.
- Reference household-identity page gates and hydrated landing routing. The comment on `app/page.tsx` attributing Home redirection to middleware is not the executable owner: `IdentityValidator` requests it after hydration.
- Keep source mechanics here and mapping in the plan. All icon descriptors point to repository assets; descriptor existence is not runtime asset delivery.

## Risks / Trade-offs

- Install/browser behavior varies → U11, no device guarantee.
- `install-identity.spec.ts` inspects manifest equality, asset status/body and initial head, but uses test secret, mock APIs, channel artifact and `WFS_IDENTITY_TEST_*` expectations → assertions inspected, not run; no deployment qualification.
- `app-identity.test.ts` mocks release channel, Next connection/fonts/providers and environment → source identity evidence only.
- No registration rejection UI is implemented → no retry or successful-control guarantee.
- Safe-area styling lacks selected device geometry assertions → implementation-supported, medium confidence.

## Migration Plan

Documentation-only delta validation and authorized sync to main; no deployment, data migration, rollback or implementation tasks.
