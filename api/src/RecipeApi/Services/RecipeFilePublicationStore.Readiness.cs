using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class RecipeFilePublicationStore
{
    // The journal commits readiness and its selected PDF metadata together. A
    // retry resumes that original output, never captures today's source as repair.
    // null = missing; false = already ready without this operation; true = accepted.
    public async Task<bool?> CompleteReadinessAsync(WorkflowTask task, Guid recipeId, CancellationToken ct = default)
    {
        var recipe = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == recipeId, ct);
        if (recipe is null) return null;
        var input = "RecipeReady\n" + CanonicalRecipeContentStore.NormalizeJson(task.Payload);
        if (await TryResumeAsync(recipeId, task.TaskId, input, ct)) return true;
        // Historical DB readiness is not proof that retained PDF completion was
        // captured. Do not manufacture that authority on an already-ready replay.
        if (recipe.IsReady) return false;
        var capture = await CaptureForTaskAsync(task, recipeId, ct);
        var info = JsonSerializer.Deserialize<RecipeInfo>(capture.Files["recipe.info"]!, Json)
            ?? throw new InvalidDataException("Readiness metadata is missing.");
        info.IsReady = true;
        await PublishAsync(capture, new RecipePublicationCandidate(null, info, input, SourceKind: "readiness"), task.TaskId, ct);
        return true;
    }

    private static IReadOnlyDictionary<string, byte[]?> PrepareReadiness(RecipePublicationCapture capture, RecipePublicationCandidate candidate)
    {
        if (candidate.RecipeJson is not null || candidate.SourceFiles is not null || candidate.SourceContext is not null
            || candidate.BootstrapIntent is not null || candidate.FollowupIntent is not null || candidate.Info.IsReady != true
            || !capture.Files.TryGetValue("recipe.info", out var bytes) || bytes is null)
            throw new InvalidDataException("Readiness requires captured metadata and no content or media replacement.");
        var info = JsonSerializer.Deserialize<RecipeInfo>(bytes, Json)
            ?? throw new InvalidDataException("Readiness metadata is invalid.");
        if (info.Id != capture.RecipeId) throw new InvalidDataException("Readiness recipe membership differs.");
        // Only retained PDF metadata owns this completion bit. All other captured
        // metadata, source and media bytes remain unselected and unchanged.
        var output = new Dictionary<string, byte[]?>(StringComparer.Ordinal);
        if (capture.Files.GetValueOrDefault("original/source.pdf") is not null)
        {
            info.IsReady = true;
            output.Add("recipe.info", JsonSerializer.SerializeToUtf8Bytes(info, Json));
        }
        return output;
    }
}
