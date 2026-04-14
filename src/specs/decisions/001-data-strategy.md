# ADR 001: Unified Data Strategy for NAS Deployment

## Status
Accepted

## Context
The "What's For Supper" ecosystem requires a data foundation that supports:
1.  **High-Volume Recipe Storage**: > 1,000 recipes with variable JSON metadata.
2.  **AI/LLM Interaction**: Natural language search and agent-based diet planning.
3.  **Family Coordination**: Real-time preferences (likes/dislikes), allergies, and communal "swiping" game.
4.  **Calendar Integration**: 5-minute polling sync with Google and Outlook calendars.
5.  **Environment**: Self-hosted on a home NAS using Docker (resource-constrained).

## Decision: Converged PostgreSQL Architecture
We will use **PostgreSQL** as the single primary data store, leveraging the following capabilities:
-   **JSONB Store**: For flexible, document-style recipe storage extracted by AI.
-   **pgvector**: For semantic search rankings and RAG-based agent recommendations.
-   **ACID Compliance**: For reliable multi-user coordination and calendar synchronization.

### Debated Options & Detailed Rationales

#### Option 1: The "Best of Breed" Distributed Stack
*   **Infrastructure**: MongoDB (Recipes) + PostgreSQL (Schedules/Family) + Pinecone/Chroma (Vector DB).
*   **Maya's Argument (AI)**: "We get native document performance for messy Gemma-extracted JSON and a specialized vector engine for high-precision RAG."
*   **Architect Alex's Objection (Infra)**: "This is a NAS, not a cloud datacenter. Running three DB engines is a massive resource hog (3-4GB RAM idle) and a backup nightmare. It’s a semi-truck to move a toaster."
*   **David's Objection (UX)**: "API latency! Every swiped card would require 'Frankensteining' data from three containers. The UI will lose its snap."
*   **Verdict**: **REJECTED.** Over-engineered for 1,000 recipes in a self-hosted environment.

#### Option 2: The "Slim-Fast" Minimalist Stack
*   **Infrastructure**: SQLite (Relational) + DuckDB (Vectors) + JSON files on the NAS filesystem.
*   **David's Argument (UX)**: "Fast, zero-overhead, and the recipes remain searchable files on the NAS disk. If the server dies, the data is still just a folder of files."
*   **Maya's Objection (AI)**: "Concurrency risk. If an agent is indexing while a family member is swiping, SQLite's locking will cause hangs. Also, DuckDB lacks the semantic search maturity we need for natural language."
*   **Architect Alex's Objection (Infra)**: "The Canadian Nutrient File is a relational beast. Joining disk-based JSON recipes with SQL nutritional data would require complex, fragile custom code."
*   **Verdict**: **REJECTED.** Too fragile for multi-user, agentic workloads.

#### Option 3: The "Converged Powerhouse" (Selected)
*   **Infrastructure**: **PostgreSQL** + **pgvector** + **JSONB** (Single Container).
*   **Architect Alex's Endorsement**: "One container, one backup job. PostgreSQL handles JSONB with near-native document performance and fits comfortably in 512MB of RAM."
*   **Maya's Endorsement**: "The killer feature is the **Hybrid Query**. I can filter by 'Allergies' (Relational), check 'CNF Nutritional Data' (Relational), and rank by 'Semantic Vibe' (Vector) in a *single SQL statement*. That's incredibly powerful for the agents."
*   **David's Endorsement**: "Low-latency and ACID compliant. The 5-minute calendar sync remains transactional and reliable, ensuring the family stays updated."
*   **Verdict**: **SELECTED.** Optimal balance of performance, features, and NAS infrastructure efficiency.

## Consequences
-   **Positive**: Simplified infrastructure, unified backup strategy, ability to perform complex hybrid queries (e.g., "Filter by allergies (relational) AND rank by nutritional vibe (vector)").
-   **Neutral**: Requires the `pgvector` extension to be included in the Docker image.
-   **Negative**: Slight learning curve for optimized `JSONB` and `vector` indexing in PostgreSQL.

## Participants
-   **Architect Alex** (Infrastructure Lead)
-   **Maya** (AI/LLM Specialist)
-   **David** (Product/UX Engineer)
