# Recipe serving projection rollout

Apply `api/database/compatibility.sql` and `schema.sql` through the existing migration sequence before running application code that reads `recipes.servings`. The additive column has no default and rejects nonpositive counts. The existing migration rebuilds `vw_discovery_recipes`; its final projection also includes the count so shared RecipeDto reads retain it. Run the complete compatibility/declarative sequence before application rollout. Leave the column in place on application rollback; dropping it loses the projection.

After schema rollout, an operator can explicitly request the deterministic backfill:

```http
POST /api/workflows/recipe-servings-backfill/trigger
Content-Type: application/json
X-Hearth-Secret: <configured secret>

{"parameters":{}}
```

This implementation task does not trigger that operation against development or production. It is exercised only on disposable fixtures.

Each task examines at most 25 null-count rows, including soft-deleted rows, ordered by recipe ID. It uses the common finite serving grammar and writes only when the count is still null and raw metadata still equals the read value. It updates the projection timestamp; ingredients and metadata remain unchanged. It makes no provider calls and writes no recipe files. A full batch schedules another workflow with its keyset cursor.

Inspect `GET /api/workflows/instances/{instanceId}` and task results: `Examined`, `Updated`, `Unresolved`, `Changed` (rows changed concurrently), and `NextCursor`. Results contain counts and cursors, not recipe content. Unknown yields remain null. A failure/cancellation retains completed writes; retrying the task or triggering from the beginning safely skips known values. A new beginning pass picks up concurrent replacements skipped behind a cursor. Do not force-replace known counts. This also protects a manual correction saved through recipe editing while a backfill task is in flight; its conditional null check skips that row.

Current version-1 recipe.json envelopes add optional `servings`. Explicit null is authoritative; an absent field uses legacy raw-metadata parsing. Invalid present counts are whole-record load errors. recipeYield stays in rawMetadata. Neither field is added to recipe.info. Exact recovery retains its exact schema fingerprint preflight: pre-column snapshots are incompatible and are rejected before publication; ordinary legacy merge recovery remains the supported fallback. No implicit backfill runs during reads or exact restore.
