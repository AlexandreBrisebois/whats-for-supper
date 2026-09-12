---
name: nextjs-qa
description: Diagnose Next.js test failures, hydration/UI state bugs and E2E flakiness. Use for bounded QA and test maintenance, not new feature implementation.
---

# Next.js QA

Follow [contract/testing](../../core/contract-testing.md) and the selected scope.
Diagnose the observed failure before changing approved tests or application behavior.
A failed test does not by itself distinguish a product defect from stale expectations,
mock state, missing runtime/service or permissions. Reuse supplied authorization;
clarify only consequential unknowns, without a mandatory interview or file-count stop.

1. Read the failing test, output and affected DOM/network/state path. Reproduce with
   `task test:unit` or `task test:e2e -- <spec>` as appropriate; inspect command effects
   and use isolated resources. Do not retry a harness child already timed out/stopped.
2. Diagnose locator, data, hydration, contract and environment evidence. Load only the
   relevant [locator](locators-and-stability.md), [hydration](debugging-hydration.md)
   or [mocking](mocking-strategy.md) reference. Do not infer a race solely from CI failure.
3. Derive a regression from approved intent before implementing the smallest fix.
   Trace affected seams; a mismatch does not authorize rewriting the contract.
4. Prepare formatting/generation and finish through the shared
   [execution harness](../../core/execution-harness.md). Record actual results and
   blocked checks. A static audit never proves live service/database availability.

Use testid-first interactions; retain semantic accessibility assertions for role,
name, state and labeling. Assert optimistic and reconciled store behavior separately.
Preserve shared schema-compliant builders and network boundary mocks.

`task agent:audit AREA=<keyword>` optionally discovers PWA unit/E2E and API coverage,
logic/mock-heavy candidates and selector heuristics. Confirm findings against the
actual test; semantic accessibility assertions are not brittle interactions. Within
an authorized test migration, move pure logic to unit tests using shared builders and
retain E2E seam coverage. Record unrelated findings without refactoring or deleting
suites. Do not cascade into death-audit or invent a separate mock server command.
