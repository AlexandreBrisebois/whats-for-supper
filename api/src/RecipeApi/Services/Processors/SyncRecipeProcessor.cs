using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

public class SyncRecipeProcessor(
    IClock clock,
    RecipeDbContext db,
    RecipeRepository recipeRepository,
    SupperProjectionInvalidation projectionInvalidation,
    ISupperProjectionPublisher projectionPublisher,
    ILogger<SyncRecipeProcessor> logger,
    FoodVocabularyStore vocabulary) : IWorkflowProcessor
{
    public string ProcessorName => "SyncRecipe";

    // Captured by this invocation before delivery, never reconstructed by the
    // Worker's later post-read. Delivered is only the observed delivery state.
    private sealed record PublicationFacts(Guid RecipeId, Guid OperationId, string InputHash,
        string Payload, string ResultHash, bool Delivered, DateTimeOffset CreatedAt)
    {
        public RecipeFilePublication Restore() => new()
        {
            RecipeId = RecipeId,
            OperationId = OperationId,
            InputHash = InputHash,
            Payload = Payload,
            ResultHash = ResultHash,
            Delivered = Delivered,
            CreatedAt = CreatedAt
        };
        public static PublicationFacts Observe(RecipeFilePublication value) => new(value.RecipeId, value.OperationId,
            value.InputHash, value.Payload, value.ResultHash, value.Delivered, value.CreatedAt);
    }
    private sealed record Confirmation(int Version, PublicationFacts[] Publications);
    private static string ConfirmationMessage(Guid id) => $"Confirmed committed recipe publication for {id}.";
    private static string ReplayMessage(Guid id) => $"Verified identical current recipe content for {id}.";

    private static (Guid RecipeId, bool Replay) ReadInput(string? payload)
    {
        if (string.IsNullOrEmpty(payload)) throw new ArgumentException("Task payload is empty.");
        using var doc = JsonDocument.Parse(payload);
        if (!doc.RootElement.TryGetProperty("recipeId", out var idProp) && !doc.RootElement.TryGetProperty("RecipeId", out idProp))
            throw new ArgumentException("Task payload does not contain recipeId.");
        return (idProp.GetGuid(), doc.RootElement.TryGetProperty("mode", out var mode) && mode.ValueKind == JsonValueKind.String
            && mode.GetString() == "current-format-replay");
    }

    internal static Guid ValidateOriginalHistory(string? payload, string? returned, WorkflowInstance original,
        Guid taskId, bool requireConfirmation)
    {
        WorkflowProcessorHistory.ReadObservation<JsonElement>(payload ?? "null");
        var (recipeId, replay) = ReadInput(payload);
        var result = WorkflowProcessorHistory.ReadObservation<JsonElement>(returned ?? "null");
        if (recipeId == Guid.Empty || result.ValueKind != JsonValueKind.Object
            || !result.TryGetProperty("message", out var message) || message.ValueKind != JsonValueKind.String
            || message.GetString() != (replay ? ReplayMessage(recipeId) : ConfirmationMessage(recipeId)))
            throw new InvalidDataException("Original recipe sync receipt differs from its invocation.");
        if (result.TryGetProperty("publicationConfirmation", out var observed))
        {
            if (replay || observed.ValueKind != JsonValueKind.Object)
                throw new InvalidDataException("Recipe replay cannot claim publication confirmation.");
            var confirmation = WorkflowProcessorHistory.ReadObservation<Confirmation>(observed.GetRawText());
            if (confirmation.Version != 1 || confirmation.Publications is not { Length: > 0 }
                || confirmation.Publications.Any(x => x is null || string.IsNullOrWhiteSpace(x.Payload)
                    || string.IsNullOrWhiteSpace(x.InputHash) || string.IsNullOrWhiteSpace(x.ResultHash)))
                throw new InvalidDataException("Original recipe publication confirmation is incomplete.");
            RecipeFilePublicationStore.ValidateOriginalSyncPublications(original, taskId, payload,
                recipeId, confirmation.Publications.Select(x => x.Restore()).ToArray());
        }
        else if (!replay && requireConfirmation)
            throw new InvalidDataException("Original recipe publication confirmation is absent.");
        // Older receipts contain no original sibling association. Replay text
        // binds the invocation only, not historical file/content equality.
        return recipeId;
    }

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        var (recipeId, replay) = ReadInput(task.Payload);
        if (replay)
            return await VerifyCurrentReplayAsync(recipeId, ct);
        if (task.InstanceId != Guid.Empty)
        {
            var producers = db.WorkflowTasks.Where(x => x.InstanceId == task.InstanceId).Select(x => x.TaskId);
            var publications = await db.RecipeFilePublications.AsNoTracking()
                .Where(x => x.RecipeId == recipeId && producers.Contains(x.OperationId))
                .ToListAsync(ct);
            if (publications.Count > 0)
            {
                // The producer already committed the facts and durable obligations.
                // Deliver its pending files, but never re-import a historical candidate
                // over a human edit made between generation and this workflow step.
                var confirmation = new Confirmation(1, publications.Select(PublicationFacts.Observe).ToArray());
                foreach (var publication in publications)
                    await new RecipeFilePublicationStore(db, recipeRepository, clock, projectionInvalidation, vocabulary)
                        .ResumeAsync(recipeId, publication.OperationId, ct);
                IReadOnlyList<DateOnly> weeks;
                await using (var transaction = await RecipeRotation.LockAsync(db, recipeId, ct, lockSupperInputs: true))
                {
                    weeks = await projectionInvalidation.EnlistRecipeAsync(recipeId, ct);
                    if (transaction is not null) await transaction.CommitAsync(ct);
                }
                await projectionPublisher.PublishAsync(weeks);
                return new { Message = ConfirmationMessage(recipeId), PublicationConfirmation = confirmation };
            }
        }
        // Old/bare tasks have no captured destination baseline or field selection.
        // Reading files now cannot grant authority to replace current human facts.
        // Current-format merge/exact restore belong to their explicit recovery owners.
        logger.LogWarning("Refused unlinked recipe sync for {RecipeId}; no committed producer publication.", recipeId);
        throw new InvalidDataException("Recipe sync requires a linked committed producer publication; use explicit current-format recovery for disk content.");
    }

    private async Task<object> VerifyCurrentReplayAsync(Guid recipeId, CancellationToken ct)
    {
        // Explicit current-format verification is a read-only operation. Cooperating
        // publishers/delivery cannot change either side while equality is checked.
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
        if (transaction is not null)
            await db.Database.ExecuteSqlAsync($"SELECT id FROM recipes WHERE id = {recipeId} FOR SHARE", ct);
        var recipe = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == recipeId, ct)
            ?? throw new InvalidDataException("Current recipe replay requires an existing canonical destination.");
        var content = CanonicalRecipeContentStore.Read(recipe)
            ?? throw new InvalidDataException("Current recipe replay requires an existing canonical destination.");
        if (await db.RecipeFilePublications.AsNoTracking().AnyAsync(x => x.RecipeId == recipeId && !x.Delivered, ct))
            throw new InvalidDataException("Current recipe replay cannot verify pending file publication.");
        using var document = JsonDocument.Parse(await recipeRepository.GetRecipeJsonAsync(recipeId, ct));
        var incoming = RecipeExportContent.ReadCurrent(document.RootElement, recipeId);
        if (!RecipeExportContent.IsIdenticalCurrent(incoming, new(recipeId, content, recipe.RawMetadata)))
            throw new InvalidDataException("Divergent recipe content requires reviewed current-format recovery with captured destination authority.");
        return new { Message = ReplayMessage(recipeId) };
    }
}
