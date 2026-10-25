# Proposal

## Why

A reported Beta Home card says six minutes for a six-hour recipe while Browse is correct. Current main reproduces the source cause: Home preformats `PT6H` to `6h`, then TonightMenuCard formats that string as six minutes.

## Outcome and Scope

Preserve the recipe's total duration on Home for ISO hours, mixed hours/minutes and minutes, using existing English/French wrappers. Keep missing/empty behavior, copy, navigation and other raw-duration surfaces unchanged. The screenshot's stored payload and deployed SHA are unknown; this is a source-backed display diagnosis, not a data-quality claim.

Extraction prompts, parser, persistence and relevant history receive a separate read-only audit. No AI calls, production tests, household reads, reimports, migrations, broader parsing policy, deployment or merge. The existing invented missing-time estimate is reported separately.

## What Changes

- Home passes raw totalTime to the existing display owner, which formats once.
- Add regression evidence through real Home/card/formatter composition and retain raw-duration surface checks.
- Record the duration inventory and extraction/history findings with their limits.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tonight-meal-decisions`: clarify preservation of supplied total duration in the planned recipe card.

## Impact

UI-only Home handoff and focused regression coverage. No API, SDK, dependency, schema or stored-data changes. Baseline main is `ba8dca21c83000d03ce03dbe51bd7542daa76b88`; open PR #339 at `2378942` overlaps Home and is not copied or overwritten. Demo work remains separate.
