# Integration Specification

This document defines how "What's For Supper" integrates with external services and internal components.

## 1. Internal Component Map

```
[Next.js PWA]
    ↕ HTTP (REST)
[Recipe API (.NET 10)]
    ├── Writes → [NAS Filesystem] (recipe images, recipe.info)
    ├── Writes → [PostgreSQL] (recipe metadata, family data, schedule)
    └── Inserts → [PostgreSQL: recipe_imports]

[Import Worker (.NET 10)]
    ├── Polls ← [PostgreSQL: recipe_imports]
    ├── Reads ← [NAS Filesystem] (originals/)
    ├── Calls → [Ollama/Gemma] (Pass 1: OCR + Schema.org)
    ├── Calls → [Google GenAI: models/gemini-2.0-flash-preview-image-generation] (Pass 2: hero.jpg)
    └── Writes → [PostgreSQL] (raw_metadata, ingredients, embedding)

[Calendar Sync Worker]
    ├── Polls ← [Google Calendar API]
    ├── Polls ← [Microsoft Graph API (Outlook)]
    └── Reads/Writes → [PostgreSQL] (CalendarEvents, SyncState)

[Agent Service]
    ├── Reads ← [PostgreSQL] (recipes, preferences, allergies, schedule)
    ├── Calls → [Ollama] (embeddings, re-ranking)
    └── Calls → [Google GenAI] (embedding fallback)
```

## 2. External Service Integrations

### 2.1 Ollama (Local)
- **Purpose**: Pass 1 OCR + structured extraction (Gemma); agent embeddings and re-ranking.
- **Protocol**: HTTP REST (`http://ollama:11434`).
- **Model**: `gemma2:27b` or equivalent for OCR; `mistral` / `neural-chat` for agents.
- **Auth**: None (internal Docker network).

### 2.2 Google GenAI
- **Purpose**: Pass 2 hero image enhancement; embedding fallback.
- **Model**: `models/gemini-2.0-flash-preview-image-generation` (image transform).
- **Auth**: `GEMINI_API_KEY` environment variable.
- **Protocol**: Google AI SDK (gRPC/HTTP).

### 2.3 Google Calendar
- **Purpose**: Pull "Busy/Free" blocks; push planned meal titles.
- **Auth**: OAuth 2.0 service account or user OAuth token (TBD).
- **Polling interval**: 5 minutes.

### 2.4 Microsoft Outlook (Graph API)
- **Purpose**: Same as Google Calendar.
- **Auth**: Azure AD app registration (client credentials flow).
- **Polling interval**: 5 minutes.

## 3. Command Tables (recipe_imports)

| Column | Purpose |
|---|---|
| `status` | State of the job: `Pending`, `Processing`, `Failed` |
| `recipe_id` | Foreign key to the `recipes` table |
| `error_message` | Captured logs for failed imports |

- **Polling**: The Import Worker polls every 5-10 seconds for `Pending` items.
- **Cleanup**: Successful imports results in the record being **deleted** from `recipe_imports` once metadata is synchronized back to the main `recipes` table.

## 4. PostgreSQL Connectivity

All services connect to the same PostgreSQL instance:
- **Connection string**: `POSTGRES_CONNECTION_STRING` env var.
- **ORM/Driver**: `Npgsql` (.NET services), `pg` (Next.js API routes if needed).
- **Extensions required**: `uuid-ossp`, `vector` (pgvector).

## 5. Environment Variables Summary

| Variable | Used By | Description |
|---|---|---|
| `POSTGRES_CONNECTION_STRING` | API, Worker, Agents | PostgreSQL connection |
| `RECIPES_ROOT` | API, Worker | NAS filesystem mount path |
| `API_BASE_URL` | API | Base URL for the API |
| `OLLAMA_BASE_URL` | Worker, Agents | Ollama endpoint |
| `GEMINI_API_KEY` | Worker, Agents | Google GenAI key |
| `NEXT_PUBLIC_API_BASE_URL` | PWA | Recipe API base URL |
| `GOOGLE_CALENDAR_CREDENTIALS` | Calendar Worker | OAuth credentials |
| `OUTLOOK_CLIENT_ID/SECRET` | Calendar Worker | Azure AD credentials |
