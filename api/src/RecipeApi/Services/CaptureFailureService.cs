using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public enum CaptureFailureRetryResult { Queued, AlreadyRetrying, NotFound, NotFailedCapture }
public enum CaptureFailureClearResultKind { Cleared, NotFound, NotFailedCapture }

public record CaptureFailureClearResult(CaptureFailureClearResultKind Kind, Guid? CleanupCommandId = null);

public class CaptureFailureService(RecipeDbContext db, IClock clock, IWorkflowOrchestrator orchestrator)
{
    public const string DeleteFailedCaptureResidueCommand = "DeleteFailedCaptureResidue";

    private static readonly HashSet<string> CaptureWorkflowIds =
        new(StringComparer.OrdinalIgnoreCase) { "url-import", "recipe-import", "goto-synthesis" };

    public async Task<List<CaptureFailureDto>> GetActiveFailuresAsync(CancellationToken ct = default)
    {
        var instances = await db.WorkflowInstances
            .Include(i => i.Tasks)
            .Where(i => (i.Status == WorkflowStatus.Paused || i.Status == WorkflowStatus.Failed)
                        && CaptureWorkflowIds.Contains(i.WorkflowId)
                        && i.Tasks.Any(t => t.Status == Models.TaskStatus.Failed))
            .OrderByDescending(i => i.UpdatedAt)
            .ToListAsync(ct);

        var recipeIds = instances
            .Select(i => TryGetRecipeId(i.Parameters))
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        var recipes = await db.Recipes
            .IgnoreQueryFilters()
            .Where(r => recipeIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id, ct);

        return instances.Select(instance =>
        {
            var failedTask = GetFailedTask(instance);
            var recipeId = TryGetRecipeId(instance.Parameters);
            recipes.TryGetValue(recipeId ?? Guid.Empty, out var recipe);

            return new CaptureFailureDto
            {
                Id = instance.Id,
                WorkflowInstanceId = instance.Id,
                RecipeId = recipeId,
                FamilyMemberId = recipe?.AddedBy,
                SourceWorkflowId = instance.WorkflowId,
                SourceType = ResolveSourceType(instance.WorkflowId),
                PreviewText = ResolvePreviewText(instance.WorkflowId, instance.Parameters, recipe),
                FriendlyReason = ResolveFriendlyReason(instance, failedTask),
                FailureCode = null,
                FailedStep = failedTask?.TaskName,
                Status = "failed",
                RetryCount = failedTask?.RetryCount ?? 0,
                IsReady = recipe?.IsReady ?? false,
                CreatedAt = instance.CreatedAt,
                LastFailedAt = failedTask?.UpdatedAt ?? instance.UpdatedAt,
            };
        }).ToList();
    }

    public async Task<CaptureFailureDetailsDto?> GetFailureDetailsAsync(Guid workflowInstanceId, CancellationToken ct = default)
    {
        var instance = await db.WorkflowInstances
            .AsNoTracking()
            .Include(i => i.Tasks)
            .FirstOrDefaultAsync(i => i.Id == workflowInstanceId, ct);

        if (instance is null || !IsFailedCapture(instance))
            return null;

        var failedTask = GetFailedTask(instance);
        return new CaptureFailureDetailsDto
        {
            WorkflowInstanceId = instance.Id,
            RecipeId = TryGetRecipeId(instance.Parameters),
            SourceWorkflowId = instance.WorkflowId,
            SourceType = ResolveSourceType(instance.WorkflowId),
            FailedStep = failedTask?.TaskName,
            FriendlyReason = ResolveFriendlyReason(instance, failedTask),
            ErrorMessage = failedTask?.ErrorMessage,
            StackTrace = failedTask?.StackTrace,
            RetryCount = failedTask?.RetryCount ?? 0,
            LastFailedAt = failedTask?.UpdatedAt ?? instance.UpdatedAt,
        };
    }

    public async Task<List<CaptureActivityItemDto>> GetActivityAsync(CancellationToken ct = default)
    {
        var instances = await db.WorkflowInstances
            .AsNoTracking()
            .Include(i => i.Tasks)
            .Where(i => CaptureWorkflowIds.Contains(i.WorkflowId)
                        && i.Status != WorkflowStatus.Completed)
            .OrderByDescending(i => i.UpdatedAt)
            .ToListAsync(ct);

        var workflowRecipeIds = instances
            .Select(i => TryGetRecipeId(i.Parameters))
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .ToHashSet();

        var searchDocs = await db.RecipeSearchDocuments
            .AsNoTracking()
            .Include(d => d.Recipe)
            .Where(d => d.Recipe != null
                        && d.Recipe.DeletedAt == null
                        && d.Recipe.IsReady
                        && (d.IndexStatus != "ready" || d.EmbeddingStatus != "ready"))
            .OrderByDescending(d => d.Recipe!.UpdatedAt)
            .ToListAsync(ct);

        var allRecipeIds = workflowRecipeIds
            .Concat(searchDocs.Select(d => d.RecipeId))
            .Distinct()
            .ToList();

        var recipes = await db.Recipes
            .AsNoTracking()
            .Where(r => allRecipeIds.Contains(r.Id) && r.DeletedAt == null)
            .ToDictionaryAsync(r => r.Id, ct);

        var searchDocByRecipeId = searchDocs.ToDictionary(d => d.RecipeId);

        var duplicateRecipeIds = (await db.RecipeImportReports
            .AsNoTracking()
            .Where(r => allRecipeIds.Contains(r.RecipeId))
            .Select(r => new { r.RecipeId, r.Reasons })
            .ToListAsync(ct))
            .Where(r => r.Reasons.Contains("duplicate"))
            .Select(r => r.RecipeId)
            .ToHashSet();

        var items = new List<CaptureActivityItemDto>();
        var coveredRecipeIds = new HashSet<Guid>();

        foreach (var instance in instances)
        {
            var recipeId = TryGetRecipeId(instance.Parameters);
            Recipe? recipe = null;
            if (recipeId.HasValue)
                recipes.TryGetValue(recipeId.Value, out recipe);

            var previewText = ResolvePreviewText(instance.WorkflowId, instance.Parameters, recipe);
            var isReady = recipe?.IsReady ?? false;
            var isDuplicate = recipeId.HasValue && duplicateRecipeIds.Contains(recipeId.Value);

            if (IsFailedCapture(instance))
            {
                var failedTask = GetFailedTask(instance);
                if (recipeId.HasValue) coveredRecipeIds.Add(recipeId.Value);
                items.Add(new CaptureActivityItemDto
                {
                    Id = instance.Id,
                    WorkflowInstanceId = instance.Id,
                    RecipeId = recipeId,
                    Stage = "failed",
                    Title = ResolveTitle(recipe, previewText),
                    SourceWorkflowId = instance.WorkflowId,
                    SourceType = ResolveSourceType(instance.WorkflowId),
                    StepName = failedTask?.TaskName,
                    StepLabel = CaptureFailureReasonMapper.ToStepLabel(failedTask?.TaskName),
                    PreviewText = previewText,
                    FriendlyReason = ResolveFriendlyReason(instance, failedTask),
                    RetryCount = failedTask?.RetryCount ?? 0,
                    IsReady = isReady,
                    IsSuspectedDuplicate = isDuplicate,
                    UpdatedAt = failedTask?.UpdatedAt ?? instance.UpdatedAt,
                });
                continue;
            }

            if (instance.Status is WorkflowStatus.Pending or WorkflowStatus.Processing or WorkflowStatus.Paused)
            {
                var activeTask = GetActiveTask(instance);
                searchDocByRecipeId.TryGetValue(recipeId ?? Guid.Empty, out var doc);
                var stage = ResolveActiveStage(isReady, doc);
                if (recipeId.HasValue) coveredRecipeIds.Add(recipeId.Value);
                items.Add(new CaptureActivityItemDto
                {
                    Id = instance.Id,
                    WorkflowInstanceId = instance.Id,
                    RecipeId = recipeId,
                    Stage = stage,
                    Title = ResolveTitle(recipe, previewText),
                    SourceWorkflowId = instance.WorkflowId,
                    SourceType = ResolveSourceType(instance.WorkflowId),
                    StepName = activeTask?.TaskName,
                    StepLabel = CaptureFailureReasonMapper.ToStepLabel(activeTask?.TaskName),
                    PreviewText = previewText,
                    FriendlyReason = null,
                    RetryCount = activeTask?.RetryCount ?? 0,
                    IsReady = isReady,
                    IsSuspectedDuplicate = isDuplicate,
                    UpdatedAt = instance.UpdatedAt,
                });
            }
        }

        foreach (var doc in searchDocs)
        {
            if (coveredRecipeIds.Contains(doc.RecipeId) || doc.Recipe is null)
                continue;

            var stage = ResolveSearchDocumentStage(doc);
            if (stage is null)
                continue;

            items.Add(new CaptureActivityItemDto
            {
                Id = doc.RecipeId,
                WorkflowInstanceId = null,
                RecipeId = doc.RecipeId,
                Stage = stage,
                Title = doc.Recipe.Name ?? string.Empty,
                SourceWorkflowId = null,
                SourceType = !string.IsNullOrWhiteSpace(doc.Recipe.SourceUrl)
                    ? "url"
                    : doc.Recipe.ImageCount > 0 ? "photos" : "description",
                StepName = null,
                StepLabel = null,
                PreviewText = doc.Recipe.SourceUrl,
                FriendlyReason = stage == "enrichment_paused"
                    ? "Your recipe is saved and keyword-searchable, but smart search enrichment paused."
                    : null,
                RetryCount = 0,
                IsReady = true,
                IsSuspectedDuplicate = duplicateRecipeIds.Contains(doc.RecipeId),
                UpdatedAt = doc.LastIndexedAt ?? doc.Recipe.UpdatedAt,
            });
        }

        return items
            .OrderBy(i => GetStagePriority(i.Stage))
            .ThenByDescending(i => i.UpdatedAt)
            .ToList();
    }

    public async Task<CaptureFailureRetryResult> RetryAsync(Guid workflowInstanceId, CancellationToken ct = default)
    {
        var instance = await db.WorkflowInstances
            .Include(i => i.Tasks)
            .FirstOrDefaultAsync(i => i.Id == workflowInstanceId, ct);

        if (instance is null) return CaptureFailureRetryResult.NotFound;
        if (!IsFailedCapture(instance)) return CaptureFailureRetryResult.NotFailedCapture;

        if (UrlCaptureInitialization.IsPending(instance))
        {
            var initialized = await orchestrator.InitializeUrlCaptureAsync(instance.Id, ct);
            if (initialized is null) return CaptureFailureRetryResult.NotFound;
            return UrlCaptureInitialization.IsPending(initialized)
                ? CaptureFailureRetryResult.NotFailedCapture
                : CaptureFailureRetryResult.Queued;
        }

        if (RecipeFollowupInitialization.IsPending(instance))
        {
            var initialized = await orchestrator.InitializeRecipeFollowupAsync(instance.Id, ct);
            if (initialized is null) return CaptureFailureRetryResult.NotFound;
            return RecipeFollowupInitialization.IsPending(initialized)
                ? CaptureFailureRetryResult.NotFailedCapture : CaptureFailureRetryResult.Queued;
        }

        var failedTask = GetFailedTask(instance);
        if (failedTask is null) return CaptureFailureRetryResult.NotFailedCapture;

        failedTask.Status = Models.TaskStatus.Pending;
        failedTask.ScheduledAt = clock.UtcNow;
        failedTask.ErrorMessage = null;
        failedTask.StackTrace = null;
        failedTask.UpdatedAt = clock.UtcNow;

        instance.Status = WorkflowStatus.Processing;
        instance.UpdatedAt = clock.UtcNow;

        await db.SaveChangesAsync(ct);
        return CaptureFailureRetryResult.Queued;
    }

    public async Task<CaptureFailureClearResult> ClearAsync(Guid workflowInstanceId, Guid? requestedBy = null, CancellationToken ct = default)
    {
        // Match publication's leading supper-input boundary before workflow/recipe rows.
        await using var transaction = await SupperServingsService.BeginAsync(db, ct)
            ?? await db.Database.BeginTransactionAsync(ct);
        Guid? recipeId = null;
        Guid? commandId = null;
        try
        {
            var instance = await WorkflowLifecycle.LoadLockedAsync(db, workflowInstanceId, ct);

            if (instance is null) return new(CaptureFailureClearResultKind.NotFound);
            if (!IsFailedCapture(instance)) return new(CaptureFailureClearResultKind.NotFailedCapture);

            recipeId = TryGetRecipeId(instance.Parameters);
            if (recipeId is not null)
            {
                await RecipeRotation.LockRowAsync(db, recipeId.Value, ct);
                var recipe = await db.Recipes
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(r => r.Id == recipeId.Value, ct);

                if (recipe is not null && !ShouldRetainRecipe(db, recipe))
                {
                    recipe.DeletedAt ??= clock.UtcNow;
                    recipe.DeletedBy ??= requestedBy;
                    recipe.DeleteNote = $"failed-capture-clear workflowInstanceId={workflowInstanceId}";
                    recipe.IsDiscoverable = false;
                    recipe.UpdatedAt = clock.UtcNow;
                }
            }

            var command = new MaintenanceCommand
            {
                Id = Guid.NewGuid(),
                CommandType = DeleteFailedCaptureResidueCommand,
                Status = "pending",
                Payload = JsonSerializer.Serialize(new
                {
                    recipeId,
                    workflowInstanceId,
                    sourceWorkflowId = instance.WorkflowId,
                    reason = "user-cleared-failed-capture",
                }, JsonDefaults.CamelCase),
                RequestedBy = requestedBy,
                CreatedAt = clock.UtcNow,
            };

            commandId = command.Id;
            db.MaintenanceCommands.Add(command);
            await WorkflowLifecycle.RetainAsync(db, instance, "cleared", command.Id, clock.UtcNow, ct, command);
            db.WorkflowInstances.Remove(instance);
            await db.SaveChangesAsync(ct);

            await transaction.CommitAsync(ct);
            return new(CaptureFailureClearResultKind.Cleared, command.Id);
        }
        catch
        {
            try { await transaction.RollbackAsync(CancellationToken.None); } catch { /* Preserve an uncertain committed outcome. */ }
            await transaction.DisposeAsync();
            await WorkflowLifecycle.ReloadAttemptAsync(db, workflowInstanceId, commandId, recipeId);
            throw;
        }
    }

    internal static Guid? TryGetRecipeId(string? parameters)
    {
        if (string.IsNullOrWhiteSpace(parameters)) return null;

        try
        {
            using var doc = JsonDocument.Parse(parameters);
            if (doc.RootElement.TryGetProperty("recipeId", out var recipeId) ||
                doc.RootElement.TryGetProperty("RecipeId", out recipeId))
            {
                return recipeId.ValueKind == JsonValueKind.String
                    ? Guid.Parse(recipeId.GetString()!)
                    : recipeId.GetGuid();
            }
        }
        catch
        {
            return null;
        }

        return null;
    }

    private static string? TryGetStringParameter(string? parameters, string name)
    {
        if (string.IsNullOrWhiteSpace(parameters)) return null;

        try
        {
            using var doc = JsonDocument.Parse(parameters);
            return doc.RootElement.TryGetProperty(name, out var value) ? value.GetString() : null;
        }
        catch
        {
            return null;
        }
    }

    private static bool IsFailedCapture(WorkflowInstance instance) =>
        (instance.Status == WorkflowStatus.Paused || instance.Status == WorkflowStatus.Failed)
        && CaptureWorkflowIds.Contains(instance.WorkflowId)
        && instance.Tasks.Any(t => t.Status == Models.TaskStatus.Failed);

    private static WorkflowTask? GetFailedTask(WorkflowInstance instance) =>
        instance.Tasks
            .Where(t => t.Status == Models.TaskStatus.Failed)
            .OrderByDescending(t => t.UpdatedAt)
            .FirstOrDefault();

    private static WorkflowTask? GetActiveTask(WorkflowInstance instance) =>
        instance.Tasks
            .Where(t => t.Status == Models.TaskStatus.Processing)
            .OrderByDescending(t => t.UpdatedAt)
            .FirstOrDefault()
        ?? instance.Tasks
            .Where(t => t.Status == Models.TaskStatus.Pending)
            .OrderBy(t => t.CreatedAt)
            .FirstOrDefault();

    private static string ResolveSourceType(string workflowId) =>
        workflowId.Equals("url-import", StringComparison.OrdinalIgnoreCase)
            ? "url"
            : workflowId.Equals("goto-synthesis", StringComparison.OrdinalIgnoreCase)
                ? "description"
                : "photos";

    private static string? ResolvePreviewText(string workflowId, string? parameters, Recipe? recipe)
    {
        if (workflowId.Equals("goto-synthesis", StringComparison.OrdinalIgnoreCase))
        {
            return TryGetStringParameter(parameters, "description")
                   ?? (!IsPlaceholderRecipeName(recipe?.Name) ? recipe?.Name : null);
        }

        if (workflowId.Equals("url-import", StringComparison.OrdinalIgnoreCase))
            return TryGetStringParameter(parameters, "url") ?? recipe?.SourceUrl;

        return (!IsPlaceholderRecipeName(recipe?.Name) ? recipe?.Name : null)
               ?? TryGetStringParameter(parameters, "url")
               ?? recipe?.SourceUrl;
    }

    private static string ResolveTitle(Recipe? recipe, string? previewText)
    {
        if (recipe is not null && (recipe.IsReady || !IsPlaceholderRecipeName(recipe.Name)))
            return recipe.Name!;

        return previewText ?? recipe?.Name ?? string.Empty;
    }

    private static bool IsPlaceholderRecipeName(string? name) =>
        string.IsNullOrWhiteSpace(name)
        || name.Equals("Captured Recipe", StringComparison.OrdinalIgnoreCase)
        || name.Equals("Importing Recipe", StringComparison.OrdinalIgnoreCase)
        || name.Equals("Creating Recipe...", StringComparison.OrdinalIgnoreCase);

    private static string ResolveFriendlyReason(WorkflowInstance instance, WorkflowTask? failedTask) =>
        (UrlCaptureInitialization.IsPending(instance) || RecipeFollowupInitialization.IsPending(instance))
            ? "Your recipe was saved, but its import has not started. Retry to start importing it."
            : CaptureFailureReasonMapper.ToFriendlyReason(null, failedTask?.TaskName, instance.WorkflowId);

    private static string ResolveActiveStage(bool isReady, RecipeSearchDocument? doc)
    {
        if (!isReady) return "preparing";
        if (doc is not null)
        {
            return ResolveSearchDocumentStage(doc) ?? "indexing";
        }
        return "indexing";
    }

    private static string? ResolveSearchDocumentStage(RecipeSearchDocument doc)
    {
        if (doc.IndexStatus == "ready")
        {
            if (doc.EmbeddingStatus == "failed") return "enrichment_paused";
            if (doc.EmbeddingStatus is "pending" or "indexing") return "enriching";
            return null;
        }
        if (doc.IndexStatus is "pending" or "indexing")
            return "indexing";

        return null;
    }

    private static int GetStagePriority(string stage) => stage switch
    {
        "failed" => 0,
        "preparing" => 1,
        "indexing" => 2,
        "enriching" => 3,
        "enrichment_paused" => 4,
        _ => 5,
    };

    // Non-null persisted content also represents explicit human clears.
    internal static bool HasRetainedRecipeContent(Recipe recipe) =>
        recipe.Ingredients is not null || recipe.RawMetadata is not null || recipe.StructuredContent is not null;

    internal static bool ShouldRetainRecipe(Recipe recipe) => recipe.IsReady;

    internal static bool ShouldRetainRecipe(RecipeDbContext db, Recipe recipe) =>
        recipe.IsReady
        || db.RecipeImportReports.AsNoTracking()
            .Any(r => r.RecipeId == recipe.Id && r.Status == RecipeImportReportStatus.ReadyToReview);
}
