# Discovery Prompt: Data Strategy, Sync & AI Agents

## Background
You are a Data Architect and AI Reasoning Specialist. You are in the "Discovery & Design" phase for the **Data Layer and Diet Agents** of "What's For Supper". Your goal is to design the complex sync and reasoning systems.

## Objective
Review the following documents and define the missing technical details:
- [recipe-data.spec.md](file:///Users/alex/Code/whats-for-supper/src/specs/recipe-data.spec.md)
- [001-data-strategy.md](file:///Users/alex/Code/whats-for-supper/src/specs/decisions/001-data-strategy.md)

## Missing Definitions to Resolve
1. **Calendar Sync OAuth**: Design the strategy for external Google/Outlook calendar access. Given it's a self-hosted app, how will users provide "Secret" keys or OAuth permissions? 
2. **CNF Schema**: Define the PostgreSQL schema for the **Canadian Nutrient File (CNF)** and the import strategy for the raw data files.
3. **Diet Agent Persona**: Define the specific "System Prompt" and reasoning model (e.g., Chain of Thought) for the Diet Agent. How does it analyze the "Sliding Window" of family history?

## Deliverable
Do NOT write code. Instead, produce:
1. An **Update** to `recipe-data.spec.md` with the finalized CNF schema and Calendar sync flow.
2. A **New ADR** (`011-external-sync-and-agent-logic.md`) documenting the security implications of external API access.
