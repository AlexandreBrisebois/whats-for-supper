using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

internal sealed record V1TransitionWitness(int Version, string Kind, string CaptureRequestSha256, string CaptureAttemptSha256,
    string CorpusInventorySha256, string SelectionInventorySha256, Guid PlanOperationId, Guid RecipeId, Guid ConversionOperationId,
    byte[] TypedOutputUtf8, byte[] RequestUtf8, byte[] ResultUtf8, byte[] RowUtf8,
    byte[] RecipeBeforeUtf8, byte[] RecipeAfterUtf8, byte[] SearchBeforeUtf8, byte[] SearchAfterUtf8);
internal sealed record V1TransitionOutcome(string State, Guid OperationId, Guid RecipeId, Guid ConversionOperationId,
    int OriginalReceipts, int Converted, int RequiresForwardAssessment, int RetiredDeferred, int Weeks);

public partial class RecoverySnapshotService
{
    private static readonly UTF8Encoding TransitionUtf8 = new(false, true);
    private static T TransitionRead<T>(byte[] bytes) => FoodVocabularyDefinitions.ReadStrict<T>(TransitionUtf8.GetString(bytes));
    private static byte[] TransitionBytes<T>(T value) => JsonSerializer.SerializeToUtf8Bytes(value, Json);
    private static string TransitionHash(byte[] bytes) => FoodVocabularyDefinitions.Sha256(bytes);

    internal async Task<V1TransitionOutcome> CaptureAttestedV1AuthorityTransitionAsync(string repositoryRoot, string sourceDataRoot,
        byte[] requestBytes, byte[] attemptBytes, string bundle, RecoverySnapshotService sourceService,
        CanonicalRecipeContentStore store, RecipesRootResolver executionRoots, CancellationToken ct)
    {
        requestBytes = requestBytes.ToArray(); attemptBytes = attemptBytes.ToArray();
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(ct);
        deadline.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue("Recovery:MaxFreezeSeconds", 30), 1, 3600)));
        ct = deadline.Token;
        var request = V1AuthorityTransitionPolicy.Request(repositoryRoot, requestBytes);
        RequireTransitionBuild(repositoryRoot, request);
        _ = V1AuthorityTransitionPolicy.Attempt(requestBytes, attemptBytes, new DeploymentCalendar(configuration));
        FoodVocabularyDefinitions.Require(bundle == V1AuthorityTransitionPolicy.Bundle(repositoryRoot) && sourceDataRoot == request.SourceDataRoot);
        V1AuthorityTransitionPolicy.RequireCallerInputs(repositoryRoot, requestBytes, attemptBytes);
        await RequireTransitionGraphsAsync(request, sourceService, executionRoots, ct);
        return await boundary.RunMaintenanceAsync(request.Selection.OperationId, request.CandidateCommit, TransitionHash(request.HoldAfterBytes), async token =>
        {
            RequireTransitionDate(request);
            await using var source = await sourceService.OpenTransitionSourceAsync(repositoryRoot, sourceDataRoot, request, token);
            await using var write = await boundary.EnterAsync(RecoveryAccess.Write, token);
            using var binding = boundary.BindLease(write);
            await using var transaction = await RecipeRotation.LockAsync(db, request.Selection.Selected[0].RecipeId, token, lockSupperInputs: true);
            await LockTransitionRemainderAsync(request, token);
            store.RequireMigrationTarget(db, executionRoots, boundary);
            using var original = new V1MigrationSource(source.Protection, source.Identity, source.Attestation, db, executionRoots);
            var corpus = await store.ObserveAttestedMigrationManifestAsync(request.Corpus, executionRoots, original, request.EvaluationDate, token);
            var selection = await store.ObserveAttestedMigrationManifestAsync(request.Selection, executionRoots, original, request.EvaluationDate, token);
            RequireTransitionAccounting(repositoryRoot, corpus, selection);
            await RequireTransitionOriginalBaselineAsync(request, sourceService, selection, token);
            var captures = new Dictionary<string, byte[]>
            {
                ["request.json"] = requestBytes,
                ["attempt.json"] = attemptBytes,
                ["corpus-inventory.json"] = TransitionBytes(corpus),
                ["selection-inventory.json"] = TransitionBytes(selection)
            };
            await RetainTransitionBundleAsync(Path.Combine(bundle, "capture"), captures, token);
            using var context = new V1AuthorityTransitionContext(db, recipes, boundary, source.Authority, source.Facts,
                request.Selection.OperationId, request.CandidateCommit, request.ApiAssemblySha256, (MaintenanceCommandObservation?)null, (CanonicalRecipeOperation?)null);
            var plan = CanonicalRecipeMigrationReceipt.Plan(selection, request.CandidateCommit, request.CapturedAt);
            CanonicalRecipeOperation conversion;
            var producerDirectory = Path.Combine(bundle, "producer");
            var retainedPath = Path.Combine(producerDirectory, "conversion-producer.json");
            if (File.Exists(retainedPath))
            {
                RejectLinks(retainedPath);
                conversion = TransitionRead<CanonicalRecipeOperation>(TransitionRead<V1TransitionWitness>(await File.ReadAllBytesAsync(retainedPath, token)).TypedOutputUtf8);
                await store.RequireMigrationPreparationAsync(selection.Recipes.Single(), conversion, context, token);
            }
            else conversion = await store.PrepareMigrationConversionAsync(selection.Recipes.Single(), request.CapturedAt, token, context);
            var planPg = await ProjectTransitionPlanAsync(plan, token);
            var conversionPg = await ProjectTransitionConversionAsync(conversion, token);
            var planRow = await ProjectTransitionCommandRowAsync(planPg, token);
            var conversionRow = await ProjectTransitionCanonicalRowAsync(conversionPg, token);
            var recipeBefore = await TransitionRowAsync("recipes", conversion.RecipeId, token);
            var searchBefore = await TransitionRowAsync("recipe_search_documents", conversion.RecipeId, token);
            var (recipeAfter, searchAfter) = await ProjectTransitionRowsAsync(conversion, token);
            V1TransitionWitness Witness(string kind, byte[] output, string requestText, string resultText, byte[] row) => new(1, kind,
                TransitionHash(requestBytes), TransitionHash(attemptBytes), TransitionHash(captures["corpus-inventory.json"]),
                TransitionHash(captures["selection-inventory.json"]), plan.Id, conversion.RecipeId, conversion.OperationId,
                output, TransitionUtf8.GetBytes(requestText), TransitionUtf8.GetBytes(resultText), row, recipeBefore, recipeAfter, searchBefore, searchAfter);
            var producers = new Dictionary<string, byte[]>
            {
                ["plan-producer.json"] = TransitionBytes(Witness("plan-producer", TransitionBytes(plan), plan.Payload, plan.Result!, planRow)),
                ["plan-postgres.json"] = TransitionBytes(Witness("plan-postgres", TransitionBytes(planPg), planPg.Payload, planPg.Result!, planRow)),
                ["conversion-producer.json"] = TransitionBytes(Witness("conversion-producer", TransitionBytes(conversion), conversion.OriginalRequest!, conversion.Result, conversionRow)),
                ["conversion-postgres.json"] = TransitionBytes(Witness("conversion-postgres", TransitionBytes(conversionPg), conversionPg.OriginalRequest!, conversionPg.Result, conversionRow))
            };
            await RetainTransitionBundleAsync(producerDirectory, producers, token);
            await source.RevalidateAsync(token);
            if (checkpoint is not null) await checkpoint.ReachedAsync("v1-transition-final-source-validated", token);
            await source.RequireBeforeImagesAsync(token);
            await RequireTransitionOriginalBaselineAsync(request, sourceService, selection, token);
            RequireTransitionBundle(Path.Combine(bundle, "capture"), captures);
            RequireTransitionBundle(producerDirectory, producers);
            V1AuthorityTransitionPolicy.RequireCallerInputs(repositoryRoot, requestBytes, attemptBytes);
            _ = V1AuthorityTransitionPolicy.Request(repositoryRoot, requestBytes);
            RequireTransitionBuild(repositoryRoot, request);
            RequireTransitionDate(request);
            boundary.ValidateMaintenanceInvocation(request.Selection.OperationId, request.CandidateCommit, request.ApiAssemblySha256);
            await transaction!.RollbackAsync(token);
            return new V1TransitionOutcome("A-prepared-no-domain-writes", plan.Id, conversion.RecipeId, conversion.OperationId, 46, 0, 198, 23, 36);
        }, ct);
    }

    private void RequireTransitionDate(V1TransitionRequest request) => FoodVocabularyDefinitions.Require(
        new DeploymentCalendar(configuration).Capture(clock.UtcNow).Today == request.EvaluationDate);

    private async Task LockTransitionRemainderAsync(V1TransitionRequest request, CancellationToken ct)
    {
        var existing = new HashSet<string>(["weekly_plans", "calendar_events", "supper_servings", "family_settings", "family_members"], StringComparer.Ordinal);
        var mutated = new HashSet<string>(["recipes", "maintenance_commands", "canonical_recipe_operations", "recipe_search_documents"], StringComparer.Ordinal);
        var connection = (NpgsqlConnection)db.Database.GetDbConnection();
        foreach (var table in request.SchemaDomains.Single(x => x.Name == "migration").Relations.Where(x => !existing.Contains(x)).Order(StringComparer.Ordinal))
            await ScalarAsync(connection, "LOCK TABLE public." + new NpgsqlCommandBuilder().QuoteIdentifier(table)
                + (mutated.Contains(table) ? " IN SHARE ROW EXCLUSIVE MODE" : " IN SHARE MODE"), ct);
    }

    private static void RequireTransitionAccounting(string root, CanonicalMigrationInventory corpus, CanonicalMigrationInventory selection)
    {
        var expected = V1AuthorityTransitionPolicy.Load(root).GetProperty("prospectiveSelection");
        var recipe = selection.Recipes.Single();
        FoodVocabularyDefinitions.Require(corpus.Recipes.Count == 221 && corpus.Recipes.Count(x => x.Status == "requires-forward-assessment") == 198
            && corpus.Recipes.Count(x => x.Status != "requires-forward-assessment") == 23 && corpus.Weeks.Count == 36
            && corpus.Weeks.Sum(x => x.StoredPlanIds.Count) == 36 && corpus.Weeks.Sum(x => x.AssignmentIds.Count) == 55
            && corpus.Tables.Single(x => x.Name == "calendar_events").Rows.Count == 69
            && corpus.Tables.Count == 32 && corpus.Files.Count == 1374 && corpus.RequiredReferences.Count == 0
            && TransitionBytes(corpus.Tables).AsSpan().SequenceEqual(TransitionBytes(selection.Tables))
            && TransitionBytes(corpus.Files).AsSpan().SequenceEqual(TransitionBytes(selection.Files))
            && TransitionBytes(corpus.Weeks).AsSpan().SequenceEqual(TransitionBytes(selection.Weeks))
            && recipe.Status == "requires-forward-assessment" && recipe.RecipeId == expected.GetProperty("recipeId").GetGuid()
            && recipe.ContentRevision == expected.GetProperty("contentRevision").GetString()
            && recipe.SourceRevision == expected.GetProperty("sourceRevision").GetString()
            && recipe.OriginalFieldsSha256 == expected.GetProperty("originalFieldsSha256").GetString()
            && selection.Tables.Single(x => x.Name == "recipe_search_documents").Rows.Any(x => x.Key.Contains(recipe.RecipeId.ToString("D"), StringComparison.Ordinal)));
    }

    private async Task RequireTransitionOriginalBaselineAsync(V1TransitionRequest request, RecoverySnapshotService source,
        CanonicalMigrationInventory selection, CancellationToken ct, bool compareTables = true)
    {
        var connection = (NpgsqlConnection)source.TransitionDb.Database.GetDbConnection();
        foreach (var table in compareTables ? selection.Tables : [])
        {
            var text = (string)(await new NpgsqlCommand("SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]')::text FROM public."
                + new NpgsqlCommandBuilder().QuoteIdentifier(table.Name) + " t", connection).ExecuteScalarAsync(ct))!;
            using var json = JsonDocument.Parse(text);
            FoodVocabularyDefinitions.Require(TransitionBytes(table).AsSpan().SequenceEqual(TransitionBytes(
                CanonicalRecipeMigrationManifest.ObserveTable(table.Name, table.KeyColumns, json.RootElement))));
        }
        var original = SafeFiles(request.SourceDataRoot).ToDictionary(x => Path.GetRelativePath(request.SourceDataRoot, x), File.ReadAllBytes, StringComparer.Ordinal);
        var actual = SafeFiles(request.ExecutionDataRoot).ToDictionary(x => Path.GetRelativePath(request.ExecutionDataRoot, x), File.ReadAllBytes, StringComparer.Ordinal);
        FoodVocabularyDefinitions.Require(original.Count == 1576 && original.Keys.ToHashSet(StringComparer.Ordinal).SetEquals(actual.Keys));
        foreach (var (path, bytes) in original)
        {
            if (path.Replace('\\', '/') == "recipes/.maintenance-hold.json")
                FoodVocabularyDefinitions.Require(bytes.AsSpan().SequenceEqual(request.HoldBeforeBytes) && actual[path].AsSpan().SequenceEqual(request.HoldAfterBytes));
            else FoodVocabularyDefinitions.Require(bytes.AsSpan().SequenceEqual(actual[path]));
        }
    }

    private static async Task RetainTransitionBundleAsync(string path, Dictionary<string, byte[]> files, CancellationToken ct)
    {
        RejectLinks(path); Directory.CreateDirectory(path);
        var complete = TransitionBytes(new
        {
            version = 1,
            files = files.OrderBy(x => x.Key, StringComparer.Ordinal)
            .Select(x => new RecoveryFile(x.Key, x.Value.LongLength, TransitionHash(x.Value))).ToArray()
        });
        foreach (var file in files) await RetainCoverageArtifactAsync(path, file.Key, file.Value, ct);
        await RetainCoverageArtifactAsync(path, "complete.json", complete, ct);
        RecoveryDurability.FlushTree(path, ct);
        RequireTransitionBundle(path, files);
    }

    private static void RequireTransitionBundle(string path, Dictionary<string, byte[]> files)
    {
        RejectLinks(path);
        var expected = files.Keys.Append("complete.json").ToHashSet(StringComparer.Ordinal);
        FoodVocabularyDefinitions.Require(Directory.EnumerateFileSystemEntries(path).Select(Path.GetFileName).ToHashSet(StringComparer.Ordinal).SetEquals(expected));
        foreach (var file in files) { var item = Path.Combine(path, file.Key); RejectLinks(item); FoodVocabularyDefinitions.Require(File.ReadAllBytes(item).AsSpan().SequenceEqual(file.Value)); }
        var complete = TransitionBytes(new
        {
            version = 1,
            files = files.OrderBy(x => x.Key, StringComparer.Ordinal)
            .Select(x => new RecoveryFile(x.Key, x.Value.LongLength, TransitionHash(x.Value))).ToArray()
        });
        var completion = Path.Combine(path, "complete.json"); RejectLinks(completion);
        FoodVocabularyDefinitions.Require(File.ReadAllBytes(completion).AsSpan().SequenceEqual(complete));
    }

    private async Task<string> TransitionJsonbAsync(string text, CancellationToken ct)
    {
        await using var command = new NpgsqlCommand("SELECT @value::jsonb::text", (NpgsqlConnection)db.Database.GetDbConnection());
        command.Parameters.AddWithValue("value", text);
        return (string)(await command.ExecuteScalarAsync(ct))!;
    }
    private async Task<MaintenanceCommandObservation> ProjectTransitionPlanAsync(MaintenanceCommand plan, CancellationToken ct)
        => MaintenanceCommandObservation.From(plan) with { Payload = await TransitionJsonbAsync(plan.Payload, ct), Result = await TransitionJsonbAsync(plan.Result!, ct) };
    private async Task<CanonicalRecipeOperation> ProjectTransitionConversionAsync(CanonicalRecipeOperation operation, CancellationToken ct)
        => new()
        {
            RecipeId = operation.RecipeId,
            OperationId = operation.OperationId,
            InputHash = operation.InputHash,
            OriginalRequest = operation.OriginalRequest,
            Result = await TransitionJsonbAsync(operation.Result, ct),
            CreatedAt = operation.CreatedAt
        };
    private async Task<byte[]> ProjectTransitionCommandRowAsync(MaintenanceCommandObservation command, CancellationToken ct)
        => TransitionUtf8.GetBytes((await CanonicalRecipeContentStore.MigrationCommandRowAsync((NpgsqlConnection)db.Database.GetDbConnection(), command, ct)).GetRawText());

    private async Task<byte[]> ProjectTransitionCanonicalRowAsync(CanonicalRecipeOperation operation, CancellationToken ct)
    {
        var value = JsonSerializer.Serialize(new
        {
            recipe_id = operation.RecipeId,
            operation_id = operation.OperationId,
            input_hash = operation.InputHash,
            original_request = operation.OriginalRequest,
            result = JsonSerializer.Deserialize<JsonElement>(operation.Result),
            created_at = operation.CreatedAt
        });
        await using var query = new NpgsqlCommand("SELECT to_jsonb(jsonb_populate_record(NULL::canonical_recipe_operations, @value::jsonb))::text", (NpgsqlConnection)db.Database.GetDbConnection());
        query.Parameters.AddWithValue("value", value);
        return TransitionUtf8.GetBytes((string)(await query.ExecuteScalarAsync(ct))!);
    }

    private async Task<byte[]?> TransitionReceiptRowAsync(string table, Guid id, Guid? recipeId, CancellationToken ct)
    {
        FoodVocabularyDefinitions.Require(table is "maintenance_commands" or "canonical_recipe_operations");
        await using var query = new NpgsqlCommand("SELECT to_jsonb(t)::text FROM " + table + " t WHERE "
            + (table == "maintenance_commands" ? "id=@id" : "operation_id=@id AND recipe_id=@recipe"), (NpgsqlConnection)db.Database.GetDbConnection());
        query.Parameters.AddWithValue("id", id);
        if (recipeId is { } recipe) query.Parameters.AddWithValue("recipe", recipe);
        var actual = await query.ExecuteScalarAsync(ct);
        return actual is null ? null : TransitionUtf8.GetBytes((string)actual);
    }

    private async Task<byte[]> TransitionRowAsync(string table, Guid id, CancellationToken ct)
    {
        FoodVocabularyDefinitions.Require(table is "recipes" or "recipe_search_documents");
        await using var command = new NpgsqlCommand("SELECT to_jsonb(t)::text FROM " + table + " t WHERE " + (table == "recipes" ? "id" : "recipe_id") + "=@id", (NpgsqlConnection)db.Database.GetDbConnection());
        command.Parameters.AddWithValue("id", id);
        return TransitionUtf8.GetBytes((string)(await command.ExecuteScalarAsync(ct) ?? throw new InvalidDataException("Selected projection row is absent.")));
    }
    private async Task<(byte[] Recipe, byte[] Search)> ProjectTransitionRowsAsync(CanonicalRecipeOperation operation, CancellationToken ct)
    {
        var result = CanonicalRecipeContentStore.ReadValidatedRetainedResult(operation);
        var connection = (NpgsqlConnection)db.Database.GetDbConnection();
        await ScalarAsync(connection, "DROP TABLE IF EXISTS pg_temp.transition_recipe_projection, pg_temp.transition_search_projection", ct);
        await ScalarAsync(connection, "CREATE TEMP TABLE transition_recipe_projection ON COMMIT DROP AS SELECT * FROM recipes WITH NO DATA", ct);
        await ScalarAsync(connection, "CREATE TEMP TABLE transition_search_projection ON COMMIT DROP AS SELECT * FROM recipe_search_documents WITH NO DATA", ct);
        await using var command = new NpgsqlCommand("INSERT INTO transition_recipe_projection SELECT * FROM recipes WHERE id=@id; INSERT INTO transition_search_projection SELECT * FROM recipe_search_documents WHERE recipe_id=@id; UPDATE transition_recipe_projection SET canonical_content=@content::jsonb,ingredients=@ingredients::jsonb,food_mapping_evidence=NULL,updated_at=@at; UPDATE transition_search_projection SET index_status='pending',embedding_status='pending',embedding_fingerprint=NULL", connection);
        command.Parameters.AddWithValue("id", operation.RecipeId); command.Parameters.AddWithValue("content", JsonSerializer.Serialize(result.Content, Json));
        command.Parameters.AddWithValue("ingredients", JsonSerializer.Serialize(result.Content.IngredientLines.Select(CanonicalRecipeContentStore.Render)));
        command.Parameters.AddWithValue("at", operation.CreatedAt);
        await command.ExecuteNonQueryAsync(ct);
        var recipe = (string)(await new NpgsqlCommand("SELECT to_jsonb(t)::text FROM transition_recipe_projection t", connection).ExecuteScalarAsync(ct))!;
        var search = (string)(await new NpgsqlCommand("SELECT to_jsonb(t)::text FROM transition_search_projection t", connection).ExecuteScalarAsync(ct))!;
        return (TransitionUtf8.GetBytes(recipe), TransitionUtf8.GetBytes(search));
    }
}
