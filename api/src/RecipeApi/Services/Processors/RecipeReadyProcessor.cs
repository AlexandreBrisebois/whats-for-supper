using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>
/// Finalizes the recipe state to mark it as ready for discovery.
/// This processor runs as the final step in recipe import/describe workflows.
/// </summary>
public class RecipeReadyProcessor : IWorkflowProcessor
{
    private readonly RecipeDbContext db;
    private readonly ILogger<RecipeReadyProcessor> logger;
    private readonly IScheduleEventPublisher publisher;
    private readonly IClock? clock;
    private readonly IRecipeStore? recipeStore;
    private readonly RecipeImportReportService? reportService;

    [ActivatorUtilitiesConstructor]
    public RecipeReadyProcessor(
        RecipeDbContext db,
        ILogger<RecipeReadyProcessor> logger,
        IScheduleEventPublisher publisher,
        IClock? clock = null,
        IRecipeStore? recipeStore = null,
        RecipeImportReportService? reportService = null)
    {
        this.db = db;
        this.logger = logger;
        this.publisher = publisher;
        this.clock = clock;
        this.recipeStore = recipeStore;
        this.reportService = reportService;
    }

    public string ProcessorName => "RecipeReady";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(task.Payload))
            throw new ArgumentException("Task payload is empty.");

        using var doc = JsonDocument.Parse(task.Payload);
        if (!doc.RootElement.TryGetProperty("recipeId", out var idProp) &&
            !doc.RootElement.TryGetProperty("RecipeId", out idProp))
            throw new ArgumentException("Task payload does not contain recipeId.");

        var recipeId = idProp.GetGuid();
        var effectiveClock = clock ?? new SystemClock();

        Recipe? recipe;
        var alreadyReady = false;
        await using (var transaction = await RecipeRotation.LockAsync(db, recipeId, ct))
        {
            recipe = await db.Recipes.SingleOrDefaultAsync(x => x.Id == recipeId, ct);
            if (recipe is null)
            {
                if (transaction is not null) await transaction.CommitAsync(ct);
                logger.LogWarning("RecipeReady: recipe {RecipeId} not found — no-op", recipeId);
                return new { Message = MissingRecipeMessage(recipeId) };
            }

            if (recipe.IsReady)
            {
                alreadyReady = true;
            }
            else
            {
                recipe.IsDiscoverable = RecipeRotation.Suitable(recipe) && !recipe.RotationHumanOff && !recipe.CookedSuppressed;
                if (!recipe.RotationHumanOff) recipe.RotationSource = "AI";
                recipe.IsReady = true;
                recipe.UpdatedAt = effectiveClock.UtcNow;
                await db.SaveChangesAsync(ct);
            }

            if (transaction is not null) await transaction.CommitAsync(ct);
        }

        if (recipeStore is not null)
        {
            await EnsureRetainedPdfReadinessAsync(recipeStore, recipeId, ct);
        }

        if (alreadyReady)
        {
            logger.LogInformation("Recipe {RecipeId} is already finalized — skipping", recipeId);
            return new { Status = "AlreadyReady", RecipeId = recipeId };
        }

        logger.LogInformation("Recipe {RecipeId} marked as READY and DISCOVERABLE", recipeId);

        var isSuspectedDuplicate = false;
        try
        {
            var reports = reportService ?? new RecipeImportReportService(effectiveClock, db);
            isSuspectedDuplicate = await reports.FlagSuspectedDuplicateIfNoneAsync(recipeId, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Suspected duplicate check failed during readiness for recipe {RecipeId}", recipeId);
        }

        var name = recipe.Name ?? string.Empty;
        var imageUrl = recipe.ImageCount > 0 ? $"/api/recipes/{recipe.Id}/hero" : null;
        await publisher.PublishRecipeReadyAsync(recipeId, name, imageUrl, isSuspectedDuplicate: isSuspectedDuplicate);

        return new { Status = "Ready", RecipeId = recipeId };
    }

    private static async Task EnsureRetainedPdfReadinessAsync(IRecipeStore recipeStore, Guid recipeId, CancellationToken ct)
    {
        await using var pdf = await recipeStore.ReadSourcePdfAsync(recipeId, ct);
        if (pdf is null) return;
        var info = await recipeStore.ReadInfoAsync(recipeId, ct);
        if (info is null || info.IsReady == true) return;
        info.IsReady = true;
        await recipeStore.WriteInfoAsync(info, ct);
    }

    private static string MissingRecipeMessage(Guid recipeId) => $"Recipe {recipeId} not found — no-op";

    internal static Guid ValidateOriginalHistory(string? payload, string? returned, RecipeFilePublication[] publications)
    {
        static void Require(bool valid)
        {
            if (!valid) throw new InvalidDataException("Original readiness result differs from its invocation.");
        }
        static void Unique(JsonElement value)
        {
            Require(value.ValueKind == JsonValueKind.Object);
            var names = value.EnumerateObject().Select(x => x.Name).ToArray();
            Require(names.Distinct(StringComparer.Ordinal).Count() == names.Length);
        }
        using var input = JsonDocument.Parse(payload ?? "null");
        Unique(input.RootElement);
        var hasId = input.RootElement.TryGetProperty("recipeId", out var inputRecipe)
            || input.RootElement.TryGetProperty("RecipeId", out inputRecipe);
        Guid recipeId = default;
        Require(hasId && inputRecipe.ValueKind == JsonValueKind.String && inputRecipe.TryGetGuid(out recipeId) && recipeId != Guid.Empty);
        using var document = JsonDocument.Parse(returned ?? "null");
        var result = document.RootElement;
        Unique(result);
        if (result.TryGetProperty("message", out var message))
        {
            Require(message.ValueKind == JsonValueKind.String && message.GetString() == MissingRecipeMessage(recipeId)
                && !result.TryGetProperty("status", out _) && !result.TryGetProperty("recipeId", out _));
            return recipeId;
        }
        Require(result.TryGetProperty("recipeId", out var observedRecipe) && observedRecipe.ValueKind == JsonValueKind.String
            && observedRecipe.TryGetGuid(out var id) && id == recipeId);
        Require(result.TryGetProperty("status", out var status) && status.ValueKind == JsonValueKind.String
            && status.GetString() is "AlreadyReady" or "Ready");
        return recipeId;
    }
}
