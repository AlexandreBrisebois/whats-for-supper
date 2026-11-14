using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class RecipeFilePublicationStore
{
    public async Task PublishCategorizationAsync(WorkflowTask task, RecipePublicationCapture capture,
        Recipe classified, CancellationToken ct = default)
    {
        if (classified.Id != capture.RecipeId || task.ProcessorName != "CategorizeRecipe")
            throw new InvalidDataException("Categorization identity differs from its captured task.");
        var info = JsonSerializer.Deserialize<RecipeInfo>(capture.Files["recipe.info"]!, Json)
            ?? throw new InvalidDataException("Categorization metadata is missing.");
        info.Category = classified.Category;
        info.CuisineType = classified.CuisineType;
        info.MealTypes = classified.MealTypes;
        info.IsVegetarian = classified.IsVegetarian;
        var input = task.ProcessorName + "\n" + CanonicalRecipeContentStore.NormalizeJson(task.Payload);
        await PublishAsync(capture, new(null, info, input, SourceKind: "categorization"), task.TaskId, ct);
    }

    private static IReadOnlyDictionary<string, byte[]?> PrepareCategorization(RecipePublicationCapture capture,
        RecipePublicationCandidate candidate)
    {
        if (capture.FieldHashVersion != 3 || capture.Fields is null || candidate.RecipeJson is not null
            || candidate.SourceFiles is not null || candidate.SourceContext is not null || candidate.ReviewReasons is not null
            || candidate.BootstrapIntent is not null || candidate.FollowupIntent is not null
            || capture.Files.GetValueOrDefault("recipe.info") is not { } bytes)
            throw new InvalidDataException("Categorization selects captured metadata only.");
        var info = JsonSerializer.Deserialize<RecipeInfo>(bytes, Json)
            ?? throw new InvalidDataException("Categorization metadata is invalid.");
        if (info.Id != capture.RecipeId || candidate.Info.Id != capture.RecipeId)
            throw new InvalidDataException("Categorization metadata membership differs.");
        info.Category = candidate.Info.Category;
        info.CuisineType = candidate.Info.CuisineType;
        info.MealTypes = candidate.Info.MealTypes;
        info.IsVegetarian = candidate.Info.IsVegetarian;
        if (Hash(info) != Hash(candidate.Info))
            throw new InvalidDataException("Categorization cannot replace unrelated metadata.");
        return new Dictionary<string, byte[]?> { ["recipe.info"] = JsonSerializer.SerializeToUtf8Bytes(info, Json) };
    }

    private async Task ValidateCategorizationTaskAsync(Guid recipeId, Guid operationId, string? producerInput, CancellationToken ct)
    {
        var task = await db.WorkflowTasks.AsNoTracking().SingleOrDefaultAsync(x => x.TaskId == operationId, ct);
        if (task is null || task.ProcessorName != "CategorizeRecipe" || task.InstanceId == Guid.Empty)
            throw new InvalidDataException("Categorization needs its original workflow task.");
        var workflow = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks)
            .SingleAsync(x => x.Id == task.InstanceId, ct);
        if (workflow.WorkflowId == "goto-synthesis")
        {
            if (producerInput != "CategorizeRecipe\n" + CanonicalRecipeContentStore.NormalizeJson(task.Payload))
                throw new InvalidDataException("Categorization input differs from its synthesis task.");
            await ValidateSynthesizedFollowupAsync(workflow, task, recipeId, ct);
            return;
        }
        if (workflow.WorkflowId is not ("url-import" or "recipe-import") || workflow.RecipePublicationCapture is null)
            throw new InvalidDataException("Categorization needs its witnessed source workflow.");
        ValidateExecutionLaunch(workflow);
        var launch = ReadRecoveryJson<Launch>(workflow.RecipePublicationCapture);
        if (launch.Capture.RecipeId != recipeId || !launch.Tasks.TryGetValue(operationId, out var original)
            || original.Processor != "CategorizeRecipe" || producerInput != original.Processor + "\n" + original.Payload)
            throw new InvalidDataException("Categorization input differs from its launch.");
        var extraction = workflow.Tasks.SingleOrDefault(x => x.ProcessorName == "ExtractRecipe");
        var visited = new HashSet<string>(StringComparer.Ordinal);
        bool HasAncestor(string name)
        {
            if (!visited.Add(name)) return false;
            var matches = launch.Tasks.Values.Where(x => x.Name == name).ToArray();
            return matches.Length == 1 && (extraction?.TaskName == name || matches[0].DependsOn.Any(HasAncestor));
        }
        if (extraction is null || !original.DependsOn.Any(HasAncestor))
            throw new InvalidDataException("Categorization has no captured extraction ancestor.");
        var publication = await db.RecipeFilePublications.AsNoTracking()
            .SingleOrDefaultAsync(x => x.RecipeId == recipeId && x.OperationId == extraction.TaskId, ct);
        if (publication is { Delivered: true } && ReadEnvelope(publication).Candidate.SourceKind == "photo-ingredient-repair")
        {
            await ValidatePhotoRepairFollowupAsync(workflow, task, recipeId, ct);
            return;
        }
        if (publication is null || !publication.Delivered
            || ReadEnvelope(publication).Candidate.SourceKind is not ("fresh-canonical" or "review-canonical"))
            throw new InvalidDataException("Categorization needs delivered canonical source ancestry.");
    }
}
