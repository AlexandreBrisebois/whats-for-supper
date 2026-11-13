using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

internal sealed record RecipePhysicalResult(string Outcome, bool? FilesRemoved = null)
{
    public bool Deleted => Outcome == "deleted";
}

/// <summary>
/// One retirement owner for recipe files and cascaded history. The committed intent
/// fences publication; observed pending history never becomes a delivery receipt.
/// Callers hold the existing recovery write lease across all three transactions.
/// </summary>
internal static class RecipePhysicalLifecycle
{
    internal static async Task RequireWritableAsync(RecipeDbContext db, Guid id, CancellationToken ct)
    {
        if (await db.RecipePhysicalDeletions.AsNoTracking().AnyAsync(x => x.RecipeId == id, ct))
            throw new RecoveryBusyException("Recipe identity has a retained physical retirement intent.");
    }

    internal static async Task<RecipePhysicalResult> DeleteAsync(RecipeDbContext db, Guid id, string kind,
        IClock clock, RecipesRootResolver root, Func<Recipe, bool> eligible, Func<Task<bool?>> deliver,
        Func<Task>? enlistRetirement = null, Func<Task>? enlistRemoval = null,
        MaintenanceCommand? command = null, CancellationToken ct = default)
    {
        if (kind is not ("purge" or "delete" or "failed-capture")) throw new ArgumentException("Unsupported physical retirement kind.");
        // Commit the original command and pre-cascade facts before the first physical effect.
        await InTransaction(db, id, async () =>
        {
            if (command is not null && await db.RecipePhysicalDeletions.AsNoTracking().AnyAsync(x => x.OperationId == command.Id && x.RecipeId != id, ct))
                throw new InvalidDataException("Original physical command cannot target another recipe.");
            var prior = await LoadAsync(db, id, ct);
            if (prior is not null)
            {
                if (prior.CompletedAt is null || command is not null) Validate(prior, kind, command);
                return;
            }
            var recipe = await db.Recipes.IgnoreQueryFilters().SingleOrDefaultAsync(x => x.Id == id, ct);
            if (recipe is null || !eligible(recipe)) return;
            if (enlistRetirement is not null) await enlistRetirement();
            var facts = RecipeFacts(db, recipe);
            var operationId = command?.Id ?? Guid.NewGuid();
            var physicalCapture = CaptureDirectory(root, id, ct);
            var history = await ReadHistoryAsync(db, id, ct);
            var payload = JsonSerializer.Serialize(new
            {
                version = 2,
                physicalIntent = new { recipeId = id, operationId, kind, target = "recipe-aggregate" },
                physicalCapture,
                historyDisposition = "inert",
                recipe = facts,
                historyHash = Hash(JsonSerializer.Serialize(history, JsonDefaults.CamelCase)),
                // Every recipe-level operation, including operations unrelated to a workflow task.
                history.Publications,
                history.CanonicalOperations,
                history.RepairCommands,
                history.Reports,
                originalMaintenanceCommand = command,
                // Explicit associations supplied by this retirement, without guessed ancestry.
                workflowRetirements = db.ChangeTracker.Entries<WorkflowLifecycleRecord>()
                    .Where(x => command != null && x.Entity.OperationId == command.Id)
                    .Select(x => new { x.Entity.Id, x.Entity.Disposition, x.Entity.PayloadHash }).OrderBy(x => x.Id).ToArray()
            }, JsonDefaults.CamelCase);
            db.RecipePhysicalDeletions.Add(new RecipePhysicalDeletion
            {
                RecipeId = id,
                OperationId = operationId,
                Kind = kind,
                Payload = payload,
                PayloadHash = Hash(payload),
                RecipeHash = Hash(JsonSerializer.Serialize(facts, JsonDefaults.CamelCase)),
                CreatedAt = clock.UtcNow
            });
        }, ct);

        RecipePhysicalResult result = new("recipe-not-found");
        await InTransaction(db, id, async () =>
        {
            var intent = await LoadAsync(db, id, ct);
            var recipe = await db.Recipes.IgnoreQueryFilters().SingleOrDefaultAsync(x => x.Id == id, ct);
            if (intent is null)
            {
                result = new(recipe is null ? "recipe-not-found" : "ineligible");
                return;
            }
            if (intent.CompletedAt is null || command is not null) Validate(intent, kind, command);
            if (intent.CompletedAt is not null)
            {
                // Reconcile only the original explicitly identified command. Ordinary
                // DELETE keeps its existing not-found behavior once membership is gone.
                if (recipe is not null) throw new InvalidDataException("Retired recipe identity reappeared.");
                result = command is null ? new("recipe-not-found") : new("deleted", intent.FilesRemoved);
                return;
            }
            if (recipe is null || Hash(JsonSerializer.Serialize(RecipeFacts(db, recipe), JsonDefaults.CamelCase)) != intent.RecipeHash)
                throw new InvalidDataException("Pending physical retirement differs from its captured recipe facts.");
            await ValidateHistoryAsync(db, intent, ct);
            var capture = ReadCapture(intent);
            ValidateDirectory(capture, root, id, intent.FilesDeliveredAt is not null, ct);
            if (intent.FilesDeliveredAt is null)
            {
                ct.ThrowIfCancellationRequested();
                intent.FilesRemoved = await deliver();
                // A returned delete call is not a physical receipt until absence is
                // verified, directory durability succeeds and this receipt commits.
                if (Directory.Exists(Path.Combine(root.Root, id.ToString())) || File.Exists(Path.Combine(root.Root, id.ToString())))
                    throw new IOException("Recipe directory remains after physical delivery.");
                ct.ThrowIfCancellationRequested();
                intent.FilesDeliveredAt = clock.UtcNow;
            }
        }, ct);
        await InTransaction(db, id, async () =>
        {
            var intent = await LoadAsync(db, id, ct);
            if (intent is null) return;
            if (intent.CompletedAt is not null) return;
            Validate(intent, kind, command);
            if (intent.FilesDeliveredAt is null) throw new InvalidDataException("Physical delivery receipt is missing.");
            var recipe = await db.Recipes.IgnoreQueryFilters().SingleOrDefaultAsync(x => x.Id == id, ct);
            if (recipe is null || Hash(JsonSerializer.Serialize(RecipeFacts(db, recipe), JsonDefaults.CamelCase)) != intent.RecipeHash)
                throw new InvalidDataException("Physical retirement differs from its captured recipe facts.");
            await ValidateHistoryAsync(db, intent, ct);
            ValidateDirectory(ReadCapture(intent), root, id, delivered: true, ct);
            if (enlistRemoval is not null) await enlistRemoval();
            db.Recipes.Remove(recipe);
            intent.CompletedAt = clock.UtcNow;
            result = new("deleted", intent.FilesRemoved);
        }, ct);
        return result;
    }

    private static async Task<RecipePhysicalDeletion?> LoadAsync(RecipeDbContext db, Guid id, CancellationToken ct)
    {
        var tracked = db.ChangeTracker.Entries<RecipePhysicalDeletion>().SingleOrDefault(x => x.Entity.RecipeId == id);
        if (tracked is not null) await tracked.ReloadAsync(ct);
        return await db.RecipePhysicalDeletions.SingleOrDefaultAsync(x => x.RecipeId == id, ct);
    }

    private static SortedDictionary<string, object?> RecipeFacts(RecipeDbContext db, Recipe recipe) =>
        new(db.Entry(recipe).Properties.ToDictionary(x => JsonNamingPolicy.CamelCase.ConvertName(x.Metadata.Name), x => x.CurrentValue), StringComparer.Ordinal);

    private static string Hash(string payload) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(CanonicalRecipeContentStore.NormalizeJson(payload))));

    private static void Validate(RecipePhysicalDeletion intent, string kind, MaintenanceCommand? command)
    {
        using var document = JsonDocument.Parse(intent.Payload);
        var original = document.RootElement.GetProperty("physicalIntent");
        if (document.RootElement.GetProperty("version").GetInt32() is not (1 or 2)
            || original.GetProperty("recipeId").GetGuid() != intent.RecipeId
            || original.GetProperty("operationId").GetGuid() != intent.OperationId
            || original.GetProperty("kind").GetString() != intent.Kind
            || Hash(document.RootElement.GetProperty("recipe").GetRawText()) != intent.RecipeHash
            || intent.Kind != kind || command is not null && intent.OperationId != command.Id
            || intent.PayloadHash != Hash(intent.Payload))
            throw new InvalidDataException("Physical retirement differs from its original command or retained facts.");
        if (command is not null)
        {
            var captured = document.RootElement.GetProperty("originalMaintenanceCommand");
            if (captured.ValueKind != JsonValueKind.Object || captured.GetProperty("commandType").GetString() != command.CommandType
                || CanonicalRecipeContentStore.NormalizeJson(captured.GetProperty("payload").GetString())
                    != CanonicalRecipeContentStore.NormalizeJson(command.Payload))
                throw new InvalidDataException("Original physical command payload changed.");
        }
    }

    internal static RecipePhysicalResult CompletedResult(RecipePhysicalDeletion intent, MaintenanceCommand command)
    {
        Validate(intent, "failed-capture", command);
        if (intent.FilesDeliveredAt is null || intent.CompletedAt is null)
            throw new InvalidDataException("Physical completion receipt is absent.");
        return new("deleted", intent.FilesRemoved);
    }

    private sealed record PhysicalHistory(RecipeFilePublication[] Publications, CanonicalRecipeOperation[] CanonicalOperations,
        RecipeRepairIntent[] RepairCommands, SortedDictionary<string, object?>[] Reports);

    private static async Task<PhysicalHistory> ReadHistoryAsync(RecipeDbContext db, Guid id, CancellationToken ct)
    {
        var reports = await db.RecipeImportReports.AsNoTracking().Where(x => x.RecipeId == id).ToArrayAsync(ct);
        return new(
            await db.RecipeFilePublications.AsNoTracking().Where(x => x.RecipeId == id).OrderBy(x => x.OperationId).ToArrayAsync(ct),
            await db.CanonicalRecipeOperations.AsNoTracking().Where(x => x.RecipeId == id).OrderBy(x => x.OperationId).ToArrayAsync(ct),
            await db.RecipeRepairIntents.AsNoTracking().Where(x => x.RecipeId == id).OrderBy(x => x.Id).ToArrayAsync(ct),
            reports.Select(x => new SortedDictionary<string, object?>(db.Entry(x).Properties.ToDictionary(
                p => JsonNamingPolicy.CamelCase.ConvertName(p.Metadata.Name), p => p.CurrentValue), StringComparer.Ordinal)).ToArray());
    }

    private static async Task ValidateHistoryAsync(RecipeDbContext db, RecipePhysicalDeletion intent, CancellationToken ct)
    {
        using var document = JsonDocument.Parse(intent.Payload);
        if (document.RootElement.GetProperty("historyHash").GetString()
            != Hash(JsonSerializer.Serialize(await ReadHistoryAsync(db, intent.RecipeId, ct), JsonDefaults.CamelCase)))
            throw new InvalidDataException("Recipe operation history differs from its captured physical retirement.");
    }

    private sealed record PhysicalCapture(string Root, string? Generation, bool DirectoryExisted,
        SortedDictionary<string, string> Files, string[] Directories, SortedDictionary<string, byte[]> StagedJournals);

    private static PhysicalCapture ReadCapture(RecipePhysicalDeletion intent)
    {
        using var document = JsonDocument.Parse(intent.Payload);
        return document.RootElement.GetProperty("physicalCapture").Deserialize<PhysicalCapture>(JsonDefaults.CamelCase)
            ?? throw new InvalidDataException("Physical capture is missing.");
    }

    private static PhysicalCapture CaptureDirectory(RecipesRootResolver root, Guid id, CancellationToken ct)
    {
        var directory = Path.Combine(root.Root, id.ToString());
        // The configured root is the authority. Reject links at/below it before
        // descending; system ancestors such as macOS /var may themselves be links.
        if (new DirectoryInfo(root.Root).LinkTarget is not null || new DirectoryInfo(directory).LinkTarget is not null)
            throw new InvalidDataException("Recipe retirement storage cannot contain symbolic links.");
        if (File.Exists(directory)) throw new InvalidDataException("Recipe directory is a file.");
        var files = new SortedDictionary<string, string>(StringComparer.Ordinal);
        var directories = new List<string>();
        var stages = new SortedDictionary<string, byte[]>(StringComparer.Ordinal);
        void Visit(string path)
        {
            foreach (var entry in Directory.EnumerateFileSystemEntries(path).Order(StringComparer.Ordinal))
            {
                ct.ThrowIfCancellationRequested();
                if (new FileInfo(entry).LinkTarget is not null)
                    throw new InvalidDataException("Recipe retirement files cannot be symbolic links.");
                var relative = Path.GetRelativePath(directory, entry).Replace(Path.DirectorySeparatorChar, '/');
                if (Directory.Exists(entry)) { directories.Add(relative); Visit(entry); }
                else
                {
                    using var stream = File.OpenRead(entry);
                    files.Add(relative, Convert.ToHexString(SHA256.HashData(stream)));
                    // Retain file-only rejected/interrupted stages, not just committed DB journals.
                    if (relative.StartsWith(".publications/", StringComparison.Ordinal)) stages.Add(relative, File.ReadAllBytes(entry));
                }
            }
        }
        var exists = Directory.Exists(directory);
        if (exists) Visit(directory);
        return new(Path.GetFullPath(root.Root), root.Generation, exists, files, directories.Order(StringComparer.Ordinal).ToArray(), stages);
    }

    private static void ValidateDirectory(PhysicalCapture capture, RecipesRootResolver root, Guid id, bool delivered, CancellationToken ct)
    {
        if (capture.Root != Path.GetFullPath(root.Root) || capture.Generation != root.Generation)
            throw new InvalidDataException("Physical retirement storage generation changed.");
        var current = CaptureDirectory(root, id, ct);
        if (delivered && current.DirectoryExisted || !capture.DirectoryExisted && current.DirectoryExisted
            || current.Files.Any(x => !capture.Files.TryGetValue(x.Key, out var hash) || hash != x.Value)
            || current.Directories.Any(x => !capture.Directories.Contains(x, StringComparer.Ordinal)))
            throw new InvalidDataException("Recipe files differ from their captured physical retirement.");
    }

    private static async Task InTransaction(RecipeDbContext db, Guid id, Func<Task> work, CancellationToken ct)
    {
        await using var transaction = await SupperServingsService.BeginAsync(db, ct);
        EntityEntry[] attempted = [];
        try
        {
            await RecipeRotation.LockRowAsync(db, id, ct);
            // Drain updates to existing journals/reports too. A new FK member
            // cannot commit past the recipe FOR UPDATE lock while we compare/remove.
            if (db.Database.IsNpgsql())
                await db.Database.ExecuteSqlAsync($"SELECT recipe_id FROM recipe_file_publications WHERE recipe_id = {id} ORDER BY operation_id FOR UPDATE; SELECT recipe_id FROM canonical_recipe_operations WHERE recipe_id = {id} ORDER BY operation_id FOR UPDATE; SELECT recipe_id FROM recipe_import_reports WHERE recipe_id = {id} FOR UPDATE", ct);
            await work();
            attempted = db.ChangeTracker.Entries().Where(x => x.State != EntityState.Unchanged).ToArray();
            await db.SaveChangesAsync(ct);
            if (transaction is not null) await transaction.CommitAsync(ct);
        }
        catch
        {
            if (transaction is not null)
            {
                try { await transaction.RollbackAsync(CancellationToken.None); } catch { /* Read back; never compensate file delivery. */ }
                await transaction.DisposeAsync();
            }
            // Includes detached entries after SaveChanges but before a failed commit.
            var entries = attempted.Concat(db.ChangeTracker.Entries().Where(x => x.State != EntityState.Unchanged)).Distinct().ToArray();
            foreach (var entry in entries)
            {
                if (entry.State == EntityState.Added) entry.State = EntityState.Detached;
                else
                {
                    if (entry.State == EntityState.Detached) entry.State = EntityState.Unchanged;
                    await entry.ReloadAsync(CancellationToken.None);
                }
            }
            throw;
        }
    }
    private sealed record RetainedRecipe(Guid Id, RecipeRating Rating, Guid? AddedBy, string? Notes, string? Description,
        string? Name, string? TotalTime, string? SourceUrl, int ImageCount, bool IsSynthesized, bool IsDiscoverable,
        bool RotationHumanOff, string RotationSource, bool CookedSuppressed, bool? SupperSuitable, bool IsReady,
        string? Category, string? CuisineType, string[]? MealTypes, bool? IsVegetarian, string? RawMetadata,
        string? Ingredients, string? CanonicalContent, int? Servings,
        DateTimeOffset? DeletedAt, Guid? DeletedBy, string? DeleteNote, DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt, DateTimeOffset? LastCookedDate, int FinishedDishIndex, string? FoodMappingEvidence = null);
    private sealed record RetainedReport(Guid RecipeId, string[] Reasons, string? Note, RecipeImportReportStatus Status,
        Guid? ReportedBy, Guid? UpdatedBy, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt,
        Guid? RepairIntentId, Guid? LastWorkflowInstanceId, DateTimeOffset? LastAttemptAt,
        DateTimeOffset? ReimportedAt, string? LastError);
    private sealed record RetainedIntent(Guid RecipeId, Guid OperationId, string Kind, string Target);
    private sealed record RetainedWorkflowLink(Guid Id, string Disposition, string PayloadHash);
    private sealed record RetainedPayload(int Version, RetainedIntent PhysicalIntent, PhysicalCapture PhysicalCapture,
        string HistoryDisposition, RetainedRecipe Recipe, string HistoryHash, RecipeFilePublication[] Publications,
        CanonicalRecipeOperation[] CanonicalOperations, RecipeRepairIntent[] RepairCommands, RetainedReport[] Reports,
        MaintenanceCommand? OriginalMaintenanceCommand, RetainedWorkflowLink[] WorkflowRetirements);

    internal static FoodVocabularyReference[] VocabularyReferences(RecipePhysicalDeletion intent)
    {
        var json = new JsonSerializerOptions(JsonDefaults.CamelCase)
        {
            RespectRequiredConstructorParameters = true,
            UnmappedMemberHandling = System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow
        };
        using var raw = JsonDocument.Parse(intent.Payload);
        var version = raw.RootElement.GetProperty("version").GetInt32();
        var hasEvidenceObservation = raw.RootElement.GetProperty("recipe").TryGetProperty("foodMappingEvidence", out _);
        if (version is not (1 or 2) || version == 2 && !hasEvidenceObservation)
            throw new InvalidDataException("Unsupported or incomplete physical retirement evidence format.");
        foreach (var row in raw.RootElement.GetProperty("publications").EnumerateArray())
            if (new[] { "recipeId", "operationId", "inputHash", "payload", "resultHash", "delivered", "createdAt" }
                .Any(name => !row.TryGetProperty(name, out _)))
                throw new InvalidDataException("Retained physical publication observation is incomplete.");
        foreach (var row in raw.RootElement.GetProperty("repairCommands").EnumerateArray())
            if (new[] { "id", "recipeId", "payload", "inputHash", "createdAt" }.Any(name => !row.TryGetProperty(name, out _)))
                throw new InvalidDataException("Retained physical repair observation is incomplete.");
        var payload = WorkflowProcessorHistory.ReadObservation<RetainedPayload>(intent.Payload, json);
        Validate(intent, intent.Kind, null);
        if (intent.CompletedAt is null)
            throw new RecoveryBusyException("Complete or reconcile pending recipe physical retirement before capturing vocabulary authority.");
        if (intent.RecipeId == Guid.Empty || intent.OperationId == Guid.Empty || intent.CreatedAt == default
            || intent.FilesDeliveredAt is null || payload.Version is not (1 or 2)
            || payload.HistoryDisposition != "inert" || payload.PhysicalIntent is not { Target: "recipe-aggregate" }
            || payload.Recipe is null || payload.Recipe.Id != intent.RecipeId || payload.PhysicalCapture is null
            || payload.Publications is null || payload.CanonicalOperations is null || payload.RepairCommands is null
            || payload.Reports is null || payload.WorkflowRetirements is null
            || payload.PhysicalCapture.StagedJournals is null || payload.PhysicalCapture.Files is null)
            throw new InvalidDataException("Retained physical retirement is incomplete or inconsistent.");
        var history = JsonSerializer.Serialize(new
        {
            payload.Publications,
            payload.CanonicalOperations,
            payload.RepairCommands,
            payload.Reports
        }, JsonDefaults.CamelCase);
        if (Hash(history) != payload.HistoryHash) throw new InvalidDataException("Retained physical history hash differs.");
        var references = FoodVocabularyInventoryQualification.RecipeReferences(new(intent.RecipeId,
            payload.Recipe.CanonicalContent, payload.Recipe.FoodMappingEvidence)).ToList();
        if (payload.Publications.Any(x => x.RecipeId != intent.RecipeId)
            || payload.CanonicalOperations.Any(x => x.RecipeId != intent.RecipeId)
            || payload.RepairCommands.Any(x => x.RecipeId != intent.RecipeId)
            || payload.Reports.Any(x => x.RecipeId != intent.RecipeId))
            throw new InvalidDataException("Retained physical history targets another recipe.");
        references.AddRange(payload.Publications.SelectMany(RecipeFilePublicationStore.VocabularyReferences));
        references.AddRange(payload.CanonicalOperations.SelectMany(CanonicalRecipeContentStore.VocabularyReferences));
        references.AddRange(payload.RepairCommands.SelectMany(RecipeReportRepairIntent.VocabularyReferences));
        foreach (var stage in payload.PhysicalCapture.StagedJournals)
        {
            var publication = payload.Publications.SingleOrDefault(x => stage.Key == $".publications/{x.OperationId:N}/{x.InputHash}.json")
                ?? throw new InvalidDataException("Retained staged journal has no matching committed publication.");
            if (!payload.PhysicalCapture.Files.TryGetValue(stage.Key, out var hash)
                || hash != Convert.ToHexString(SHA256.HashData(stage.Value)))
                throw new InvalidDataException("Retained staged journal bytes differ from their captured file hash.");
            references.AddRange(RecipeFilePublicationStore.VocabularyReferences(new(intent.RecipeId,
                publication.OperationId, publication.InputHash, stage.Value), payload.Publications));
        }
        // V1 predates the evidence column. Its exact omission is historical
        // only when all original canonical/publication/repair facts are unmapped.
        // A V2 observation, including null, is always mandatory.
        if (!hasEvidenceObservation && references.Count != 0)
            throw new InvalidDataException("Historical physical omission cannot erase vocabulary authority.");
        return references.Distinct().ToArray();
    }

    internal static void ValidateRetainedWorkflowReferences(RecipePhysicalDeletion record,
        IReadOnlyList<WorkflowLifecycleRecord> workflows)
    {
        var json = new JsonSerializerOptions(JsonDefaults.CamelCase)
        {
            RespectRequiredConstructorParameters = true,
            UnmappedMemberHandling = System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow
        };
        var payload = WorkflowProcessorHistory.ReadObservation<RetainedPayload>(record.Payload, json);
        if (payload.WorkflowRetirements is null || payload.WorkflowRetirements.Select(x => x.Id).Distinct().Count() != payload.WorkflowRetirements.Length)
            throw new InvalidDataException("Retained physical workflow links are inconsistent.");
        foreach (var link in payload.WorkflowRetirements)
        {
            var retained = workflows.SingleOrDefault(x => x.Id == link.Id);
            if (retained is null || retained.OperationId != record.OperationId || retained.Disposition != link.Disposition
                || retained.PayloadHash != link.PayloadHash)
                throw new InvalidDataException("Retained physical workflow link is unresolved.");
        }
    }

}
