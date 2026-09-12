# ADR 013: Discovery and Match Logic
# Status: Accepted

## Context
As part of Phase 3, we implemented the "Discovery" system where family members can vote on recipes. We needed a formal definition of what constitutes a "Match" for planning purposes and how recipe difficulty is determined to help users choose meals.

## Decision
We implemented a centralized `DiscoveryService` that encapsulation these business rules.

### 1. Match Logic
A recipe is identified as a **Match** when it receives a `Like` vote from **50% or more** of the total active family members.
- **Total Members**: Count of all records in the `family_members` table.
- **Votes**: Count of `VoteType.Like` records for that recipe.
- **Consensus**: `(Matches / Total) >= 0.5`.

### 2. Difficulty Inference
Difficulty is inferred automatically during the synchronization phase (whenever AI extraction finishes and results are saved to the DB).
- **Easy**: `< 5` ingredients AND `< 20` min prep time (parsed from ISO 8601 duration).
- **Hard**: `> 12` ingredients OR `> 45` min prep time.
- **Medium**: Default for all other recipes.

### 3. Implementation Patterns
- **Centralization**: All logic resides in `DiscoveryService`, which is consumed by both the API Controllers and the `RecipeImportWorker`.
- **Parsing**: Used `System.Xml.XmlConvert.ToTimeSpan` to reliably handle schema.org/Recipe `totalTime` durations.
- **API Header**: `X-Family-Member-Id` is strictly required to identify voters and filter unvoted content.

## Rationale
- **Centralizing Business Logic**: Ensures consistency between what the user sees in the "Discovery" stack and what the worker calculates.
- **Automatic Difficulty**: Offloads manual entry from the user; uses AI-extracted data to provide immediate value.
- **Percentage-Based Consensus**: Allows the system to scale naturally as family members are added or removed.

## Participants
- **Antigravity** (AI Coding Assistant)
- **Architect Alex** (Infrastructure Lead)
