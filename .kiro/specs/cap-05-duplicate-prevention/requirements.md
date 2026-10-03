# CAP-05 — Duplicate prevention requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **CAP-05-R1.** Recipe import/capture paths use server-side duplicate lookup rules over persisted recipe identifiers/names/source URLs where their route requests it.
- **CAP-05-R2.** Duplicate identification is a decision input for the importing flow, not a universal guarantee that textually similar recipes cannot coexist.
- **CAP-05-R3.** Import issue reports can record `duplicate` as a review reason, separately from automatic import-time detection.

## Limits and boundaries

Matching is exact/route-defined and does not establish semantic deduplication, cross-household detection, or transactional protection for every concurrent import. CAP-01/04 own their input paths, QUAL-01 owns manual duplicate reporting, and recipe search indexing is PLAT-03 work.
