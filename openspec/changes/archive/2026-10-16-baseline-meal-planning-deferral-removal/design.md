# Design

## Context

See proposal.md — Why. Exact-date defer, generic removal and read-then-assign placement use different target semantics and failure boundaries.

## Goals / Non-Goals

**Goals:** Extract BSL-meal-planning-028–030 and reconcile reused accepted requirements.

**Non-Goals:** No cooking-history ownership expansion, grocery algorithms, Tonight flow redesign, transactional reservation or application fixes.

## Decisions

- First slice: Planner replacement next_week / Home consumer → generated defer with DateOnly source → OpenAPI/controller → exact source and status gate → next-current-week search → calendar save plus last-cooked recalculation → two-week recompute/publication → result. Home consumes this operation but owns its own dialog/Today/navigation behavior; do not extract that owner journey here.
- Keep unbounded server date search separate from the bounded 520-week browser helper. The former uses any entry as occupancy; the latter consumes projected dates/normalized recipes and excludes status three. They are not the same eligibility policy.
- Reuse accepted “Delete the recipe-free entry before clear follow-up work” and protected non-cooking operation's DELETE boundary, extending applicability to recipe-backed entries. Do not duplicate its side-effect grammar. Date-only deletion lacks expected-kind/version checks (U120), so new requirements cannot promise deleting the originally displayed recipe after a race.
- removeRecipe's local grocery filter removes recipe contribution identities/sole-contributor rows; quantity recomputation remains grocery-owned and is not promised locally. DELETE service does not recalculate LastCookedDate after deleting Cooked history. Record that gap without changing cooking-history policy.
- Last-cooked recalculation is a planning consequence through an existing transactional helper. Record derived value source and no guarantee that InMemory proves transactionality. A cooking-history accepted main capability does not yet exist.

## Risks / Trade-offs

- [No reservation/version guard across search and save] → MP-U06; no winning-writer, safe retry or exact rollback guarantees.
- [Browser local weekday versus server UTC relative dates] → Retain timezone mismatch boundaries; no midnight equivalence.
- [Cooked deletion and defer metadata] → Record MP-U07 outside normative guarantees; no invented history repair.
- [Server defer message uses culture-sensitive date formatting and English prefix] → No localized message guarantee.

## Migration Plan

Documentation only; validate this slice and continue week/day transition extraction. Human acceptance/promotion pending, runtime not-run under A34.
