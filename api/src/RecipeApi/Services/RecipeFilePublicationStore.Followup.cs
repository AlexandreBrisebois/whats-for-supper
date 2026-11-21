using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class RecipeFilePublicationStore
{
    // No definition or destination read: acceptance keeps the original command
    // even when the definition cannot currently be loaded.
    public WorkflowInstance CaptureFollowup(string workflowId, Dictionary<string, string> parameters)
    {
        var instance = RecipeFollowupInitialization.Create(workflowId, parameters, clock.UtcNow);
        CaptureDispatchLaunch(instance);
        return instance;
    }

    private static WorkflowInstance ReadFollowupIntent(RecipePublicationCandidate candidate)
    {
        if (candidate.FollowupIntent is null || candidate.BootstrapIntent is not null)
            throw new InvalidDataException("Missing or conflicting follow-up intent.");
        var launch = ReadRecoveryJson<DispatchLaunch>(candidate.FollowupIntent);
        if (launch.Parameters is null || launch.Tasks is null || launch.Tasks.Any(x => x.Value is null))
            throw new InvalidDataException("Incomplete follow-up intent.");
        var instance = new WorkflowInstance
        {
            Id = launch.InstanceId,
            WorkflowId = launch.WorkflowId,
            Status = WorkflowStatus.Paused,
            Parameters = JsonSerializer.Serialize(launch.Parameters),
            RecipePublicationCapture = candidate.FollowupIntent,
            Tasks = launch.Tasks.Select(x => new WorkflowTask
            {
                TaskId = x.Key,
                InstanceId = launch.InstanceId,
                TaskName = x.Value.Name,
                ProcessorName = x.Value.Processor,
                Payload = x.Value.Payload,
                DependsOn = x.Value.DependsOn,
                ScheduledAt = x.Value.ScheduledAt,
                Status = Models.TaskStatus.Failed
            }).ToArray()
        };
        ValidateDispatchLaunch(instance);
        if (!RecipeFollowupInitialization.IsPending(instance) || launch.Tasks.Keys.Any(x => x == Guid.Empty)
            || !launch.Parameters.TryGetValue("recipeId", out var recipe) || !Guid.TryParse(recipe, out var id) || id != candidate.Info.Id
            || instance.Tasks.Single().Payload != "null" || instance.Tasks.Single().DependsOn.Length != 0
            || instance.Tasks.Single().ScheduledAt is not null)
            throw new InvalidDataException("Follow-up intent differs from accepted recipe membership.");
        var valid = candidate.SourceKind switch
        {
            "bootstrap" when candidate.RecipeJson is null && candidate.Info.IsReady != true => instance.WorkflowId switch
            {
                "recipe-import" => launch.Parameters.Count == 1 && candidate.SourceFiles is { Count: > 0 }
                    && (candidate.SourceFiles.ContainsKey("original/source.pdf") || candidate.Info.ImageCount > 0),
                "goto-synthesis" => launch.Parameters.Count == 2 && launch.Parameters.TryGetValue("description", out var description)
                    && description == (candidate.Info.Description ?? string.Empty) && candidate.Info.ImageCount == 0,
                _ => false
            },
            "human-original" => instance.WorkflowId == "recipe-hero-regeneration" && launch.Parameters.Count == 1,
            _ => false
        };
        if (!valid) throw new InvalidDataException("Follow-up intent differs from accepted source work.");
        return instance;
    }

    private static void ValidateFollowupWorkflow(RecipePublicationCandidate candidate, Guid operationId,
        WorkflowInstance instance, bool requirePending)
    {
        var original = ReadFollowupIntent(candidate);
        if (operationId != original.Id || instance.Id != original.Id || instance.WorkflowId != original.WorkflowId
            || CanonicalRecipeContentStore.NormalizeJson(instance.Parameters) != CanonicalRecipeContentStore.NormalizeJson(original.Parameters))
            throw new InvalidDataException("Workflow differs from accepted follow-up intent.");
        if (instance.RecipePublicationCapture is null) throw new InvalidDataException("Accepted follow-up capture is missing.");
        ValidateRecoveryLaunch(instance);
        if (requirePending || IsDispatchLaunch(instance.RecipePublicationCapture!))
            if ((requirePending && !RecipeFollowupInitialization.IsPending(instance))
                || CanonicalRecipeContentStore.NormalizeJson(instance.RecipePublicationCapture)
                    != CanonicalRecipeContentStore.NormalizeJson(original.RecipePublicationCapture))
                throw new InvalidDataException("Initialization differs from accepted follow-up intent.");
    }

    internal async Task ValidateFollowupInitializationAsync(WorkflowInstance instance, CancellationToken ct)
    {
        var journal = await db.RecipeFilePublications.AsNoTracking().SingleOrDefaultAsync(x => x.OperationId == instance.Id, ct)
            ?? throw new InvalidDataException("Follow-up requires its accepted publication.");
        var envelope = ReadEnvelope(journal);
        ValidateFollowupWorkflow(envelope.Candidate, journal.OperationId, instance, requirePending: true);
        if (!journal.Delivered) throw new InvalidDataException("Follow-up is waiting for source delivery.");
        var recipe = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == journal.RecipeId, ct)
            ?? throw new InvalidDataException("Accepted recipe is unavailable.");
        if (recipe.CanonicalContent is not null || Fields(recipe, envelope.Capture.FieldHashVersion) != journal.ResultHash
            || await db.RecipeFilePublications.AnyAsync(x => x.RecipeId == recipe.Id && !x.Delivered, ct)) throw Conflict(recipe);
        var expected = envelope.Capture.Files.ToDictionary(x => x.Key, x => x.Value, StringComparer.Ordinal);
        foreach (var file in envelope.Output) expected[file.Key] = file.Value;
        IReadOnlyDictionary<string, byte[]?> current;
        try { current = await repository.CapturePublicationFilesAsync(recipe.Id, ct, allowMissingInfo: true); }
        catch (JsonException) { throw Conflict(recipe); }
        catch (InvalidDataException) { throw Conflict(recipe); }
        if (!SameFiles(expected, current)) throw Conflict(recipe);
    }

    internal static void ValidateRecoveryFollowupIntent(RecipeFilePublication publication,
        IReadOnlyDictionary<Guid, WorkflowInstance> workflows)
    {
        var envelope = ReadEnvelope(publication);
        if (envelope.Candidate.FollowupIntent is null) return;
        var original = ReadFollowupIntent(envelope.Candidate);
        if (!workflows.TryGetValue(original.Id, out var workflow))
            throw new InvalidDataException("Accepted follow-up requires its retained workflow.");
        ValidateFollowupWorkflow(envelope.Candidate, publication.OperationId, workflow, requirePending: false);
        if (!IsDispatchLaunch(workflow.RecipePublicationCapture!))
        {
            var launch = ReadRecoveryJson<Launch>(workflow.RecipePublicationCapture!);
            var expected = envelope.Capture.Files.ToDictionary(x => x.Key, x => x.Value, StringComparer.Ordinal);
            foreach (var file in envelope.Output) expected[file.Key] = file.Value;
            if (!publication.Delivered || launch.Capture.RecipeId != publication.RecipeId
                || launch.Capture.FieldHash != publication.ResultHash || launch.Capture.FieldHashVersion != envelope.Capture.FieldHashVersion
                || !SameFiles(expected, launch.Capture.Files))
                throw new InvalidDataException("Initialized workflow differs from accepted follow-up publication.");
        }
    }
}
