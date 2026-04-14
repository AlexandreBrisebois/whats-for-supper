# Recipe Data Strategy Specification

This document defines the storage architecture and data models for the "What's For Supper" ecosystem. It is designed to be hosted on a home NAS via Docker, supporting structured recipe data, family preferences, calendar synchronization, and AI-driven agents.

## 1. Primary Data Store: PostgreSQL

The system uses a single **PostgreSQL** instance as a converged data platform. This approach minimizes the Docker footprint on the NAS while providing advanced capabilities for all system modules.

### 1.1 Core Extensions
- **pgvector**: Enables vector embeddings for Natural Language search and AI agent recommendations.
- **uuid-ossp**: For generating unique recipe and family identifiers.

---

## 2. Key Data Models

### 2.1 Recipe Store (Document-Relational Hybrid)
Recipes are stored in a hybrid format to balance structure with the flexibility required for AI-extracted data.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key. |
| `slug` | String | URL-friendly identifier. |
| `raw_metadata` | JSONB | Original `recipe.info` and `recipe.json` (extracted by Gemma). |
| `embedding` | Vector(1536) | Semantic representation for Natural Language search. |
| `notes` | Text | User-generated notes (self-contained in the recipe). |
| `added_by` | UUID | Reference to family member. |
| `ingredients` | JSONB | Normalized list of ingredients for allergen/nutrient mapping. |

### 2.2 Family & Preferences
Tracks identity, likes, dislikes, and safety constraints.

- **FamilyMembers**: `id`, `name`, `profile_icon`.
- **Preferences**: `member_id`, `recipe_id`, `state` (Love, Like, Dislike, Veto).
- **Allergies**: `member_id`, `ingredient_tag`.
- **DietaryGoals**: `family_id`, `target_kcal_day` (Best effort).

### 2.3 Schedule & Feedback
The source of truth for the Weekly Planner.

- **CalendarEvents**: `id`, `recipe_id`, `slot` (B/L/S), `date`, `status` (Planned, Cooked, Skipped).
- **SyncState**: Tracks the last successful sync with Google/Outlook calendars.

---

## 3. Agent Integration Strategy (The "Brain")

### 3.1 Retrieval-Augmented Generation (RAG)
Agents utilize a "Sliding Window" of context:
1.  **Search**: Natural language query is embedded using a light local model or Gemini API.
2.  **Filter**: SQL filters the results based on **Allergies** and **Preferences** stored in the relational tables.
3.  **Rank**: `pgvector` ranks the results by semantic similarity to the user's "vibe" or dietary need.

### 3.2 Nutritional Enrichment (CNF)
The **Canadian Nutrient File (CNF)** serves as the reference authority.
- **Mapping**: A background worker maps `Recipe.ingredients` to CNF IDs.
- **Reliability**: If a match is high-confidence, `kcal` is calculated. If low-confidence, the entry is flagged as "Best Effort."

---

## 4. Synchronization & Persistence

### 4.1 Calendar Sync (5-Minute Polling)
A dedicated **Calendar Sync Worker** runs every 5 minutes:
1.  **Pull**: Fetches the latest "Busy/Free" status from external calendars.
2.  **Resolve**: Updates the local `CalendarEvents` with time constraints (e.g., flagging "Busy" nights).
3.  **Push**: Updates external calendars with planned meal titles and prep times.

### 4.2 Local Sovereignty
- **Docker Volume**: All Postgres data and original recipe images are stored in a dedicated `/data` volume on the NAS for easy external backups.
- **Portability**: The entire state can be recovered by moving the `/data` folder and the `docker-compose.yml`.

---

## 5. Security & Identity
- **Passwordless**: Identity is managed at the device level (PWA) and matched to the `FamilyMembers` table.
- **NAS-Internal**: The database is not exposed to the public internet; all external calendar traffic is routed through the API service.
