# Implementation Prompt: Data Strategy & AI Agents

## Background
You are a Data Architect and AI Specialist. You are implementing the core "brain" of "What's For Supper", which includes the **PostgreSQL** data store and the **Diet/Recommendation Agents**.

## Objective
Implement the data layer and agentic logic as defined in [recipe-data.spec.md](file:///Users/alex/Code/whats-for-supper/src/specs/recipe-data.spec.md) and [ADR-001](file:///Users/alex/Code/whats-for-supper/src/specs/decisions/001-data-strategy.md).

## Key Requirements
1.  **Database Setup**: Deploy a Dockerized **PostgreSQL** instance with the **pgvector** extension. 
2.  **Hybrid RAG Architecture**:
    -   Implement the `Recipe` table with `JSONB` for metadata and `Vector` for semantic search.
    -   Implement the `Canadian Nutrient File (CNF)` lookup logic for ingredient-based kcal estimation.
3.  **The Diet Agent**:
    -   Build a reasoning agent that analyzes the "sliding window" of recent family history.
    -   Goal: Identify nutritional gaps and proactively feed the "Inspiration Pool" in the PWA.
    -   Constraints: Must honor **Allergies** and **Likes/Dislikes** in the relational tables.
4.  **Calendar Sync**: Implement the 5-minute polling sync between the PWA's schedule and external Google/Outlook calendars.

## Supporting Docs
- Specification: `src/specs/recipe-data.spec.md`
- Decision Record: `src/specs/decisions/001-data-strategy.md`
- API Context: `src/specs/recipe-api.spec.md`

## Initial Task
Create the `docker-compose.yml` that initializes PostgreSQL with `pgvector`. Define the initial SQL schema for `Recipes`, `FamilyMembers`, and `CalendarEvents`. Propose a strategy for importing the **Canadian Nutrient File** open data.
