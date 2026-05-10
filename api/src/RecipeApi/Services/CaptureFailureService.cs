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

public class CaptureFailureService(RecipeDbContext db, IClock clock)
{
    public const string DeleteFailedCaptureResidueCommand = "DeleteFailedCaptureResidue";

    private static readonly HashSet<string> CaptureWorkflowIds =
        new(StringComparer.OrdinalIgnoreCase) { "url-import", "recipe-import" };

    public async Task<List<CaptureFailureDto>> GetActiveFailuresAsync(CancellationToken ct = default)
    {
        var instances = await db.WorkflowInstances
            .Include(i => i.Tasks)
            .Where(i => i.Status == WorkflowStatus.Paused
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
                PreviewText = TryGetStringParameter(instance.Parameters, "url") ?? recipe?.SourceUrl,
                FriendlyReason = CaptureFailureReasonMapper.ToFriendlyReason(null),
                FailureCode = null,
                FailedStep = failedTask?.TaskName,
                Status = "failed",
                RetryCount = failedTask?.RetryCount ?? 0,
                CreatedAt = instance.CreatedAt,
                LastFailedAt = failedTask?.UpdatedAt ?? instance.UpdatedAt,
            };
        }).ToList();
    }

    public async Task<CaptureFailureRetryResult> RetryAsync(Guid workflowInstanceId, CancellationToken ct = default)
    {
        var instance = await db.WorkflowInstances
            .Include(i => i.Tasks)
            .FirstOrDefaultAsync(i => i.Id == workflowInstanceId, ct);

        if (instance is null) return CaptureFailureRetryResult.NotFound;
        if (!IsFailedCapture(instance)) return CaptureFailureRetryResult.NotFailedCapture;

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
        var instance = await db.WorkflowInstances
            .Include(i => i.Tasks)
            .FirstOrDefaultAsync(i => i.Id == workflowInstanceId, ct);

        if (instance is null) return new(CaptureFailureClearResultKind.NotFound);
        if (!IsFailedCapture(instance)) return new(CaptureFailureClearResultKind.NotFailedCapture);

        var recipeId = TryGetRecipeId(instance.Parameters);
        if (recipeId is not null)
        {
            var recipe = await db.Recipes
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(r => r.Id == recipeId.Value, ct);

            if (recipe is not null && !IsReadyOrDiscoverable(recipe))
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

        db.MaintenanceCommands.Add(command);
        db.WorkflowInstances.Remove(instance);
        await db.SaveChangesAsync(ct);

        return new(CaptureFailureClearResultKind.Cleared, command.Id);
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
        instance.Status == WorkflowStatus.Paused
        && CaptureWorkflowIds.Contains(instance.WorkflowId)
        && instance.Tasks.Any(t => t.Status == Models.TaskStatus.Failed);

    private static WorkflowTask? GetFailedTask(WorkflowInstance instance) =>
        instance.Tasks
            .Where(t => t.Status == Models.TaskStatus.Failed)
            .OrderByDescending(t => t.UpdatedAt)
            .FirstOrDefault();

    private static string ResolveSourceType(string workflowId) =>
        workflowId.Equals("url-import", StringComparison.OrdinalIgnoreCase) ? "url" : "photos";

    private static bool IsReadyOrDiscoverable(Recipe recipe) =>
        recipe.IsDiscoverable
        || (!string.IsNullOrWhiteSpace(recipe.Name) && (recipe.ImageCount > 0 || recipe.IsSynthesized));
}
