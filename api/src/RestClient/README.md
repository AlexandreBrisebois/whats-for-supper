# REST Client requests

Hand-run requests for the VS Code REST Client extension. Nothing here runs automatically.

## Environments

Pick the environment in the VS Code status bar before sending anything.
They are defined in `.vscode/settings.json` (git-ignored; keep secrets there only).

| Environment | API                       | Notes                                      |
| ----------- | ------------------------- | ------------------------------------------ |
| `local`     | `http://localhost:9001`   | Safe for experiments                       |
| `nas`       | `https://wfs.srvrlss.dev` | **Production — real family data**          |
| `beta`      | `https://bt.srvrlss.dev`  | Pre-release                                |
| `demo`      | `https://dm.srvrlss.dev`  | Demo Mode; the only place for 08-demo-mode |

Each environment provides `baseUrl`, `hearthSecret` and `familyMemberId`.

## Labels

Every request title starts with one of these:

| Label        | Meaning                                     |
| ------------ | ------------------------------------------- |
| READ ONLY    | Safe to send any time                       |
| CHANGES DATA | Edits data, usually something you can undo  |
| START        | Starts a background job                     |
| AI           | Calls Gemini: uses quota and may cost money |
| DESTRUCTIVE  | Overwrites or deletes data; hard to undo    |

## Which file

| I want to…                                                      | File                      |
| --------------------------------------------------------------- | ------------------------- |
| Check the API is up                                             | `00-health.rest`          |
| Manage family members                                           | `02-family.rest`          |
| Read, edit, create, delete or restore a recipe                  | `03-recipes.rest`         |
| Back up, restore, or take a recovery snapshot                   | `04-management.rest`      |
| Look at or vote in Discovery                                    | `05-discovery.rest`       |
| Plan, move, defer or lock suppers                               | `06-schedule.rest`        |
| Reindex, regenerate, backfill; check or retry a job             | `07-workflow.rest`        |
| Capture or restore the demo snapshot                            | `08-demo-mode.rest`       |
| See what search returns                                         | `10-search.rest`          |
| Reimport a recipe, or investigate a failed reimport             | `11-recipe-reimport.rest` |
| Test the embedding provider directly (Google, not WFS)          | `12-embeddings.rest`      |
| Check capture activity, inspect, retry or clear failed captures | `13-captures.rest`        |

## Conventions

- Variables a file needs are at its top. Placeholder IDs are all zeros, so a
  request fails instead of hitting a real recipe by accident.
- A request that returns an ID is named (`# @name …`). The request after it
  reads that ID directly, so you don't copy IDs by hand.
- Requests that would delete your own data use the ID created earlier in the
  same file, not your environment's `familyMemberId`.
