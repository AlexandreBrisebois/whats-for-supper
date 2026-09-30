# Dietary preferences and planning exploration — Design

**Status:** Exploration only; no architecture is approved.

## Current material to salvage carefully

- `discovery-intelligence.md` concerns Quick Find fallback and household discovery ranking, which belongs first with discovery/planning specifications.
- `02_cooks_mode_persistence.md` concerns instruction extraction and persistence, which belongs with Cook's Mode and recipe-processing work.
- `duplicate-key-fix.md` is a bounded UI correction, not dietary functionality.

These files may inform later discovery, Cook's Mode, or maintenance tasks, but none defines the dietary initiative by itself.

## Discovery approach

First identify a family decision that cannot be solved by current filters, preferences, recipe metadata, or planning policy. Then trace the smallest affected path through its current UI, API, storage, search/discovery, grocery, and testing boundaries. Only after that trace should a proposed data model or any model-assisted behavior be designed.

## Guardrails

The server owns persisted household policy and eligibility. A model, if later approved, may assist interpretation but cannot silently create dietary facts, replace explicit member decisions, or override safety-critical constraints.
