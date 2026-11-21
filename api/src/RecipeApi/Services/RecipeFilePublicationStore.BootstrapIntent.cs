using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class RecipeFilePublicationStore
{
    // The original dispatch capture is retained inside the immutable publication
    // candidate. Replacing the placeholder graph must not erase accepted intent.
    private static WorkflowInstance ReadBootstrapIntent(RecipePublicationCandidate candidate)
    {
        if (candidate.SourceKind != "bootstrap" || candidate.BootstrapIntent is null)
            throw new InvalidDataException("Missing bootstrap intent.");
        var launch = ReadRecoveryJson<DispatchLaunch>(candidate.BootstrapIntent);
        if (launch.Parameters is null || launch.Tasks is null || launch.Tasks.Any(x => x.Value is null))
            throw new InvalidDataException("Incomplete bootstrap intent.");
        var instance = new WorkflowInstance
        {
            Id = launch.InstanceId,
            WorkflowId = launch.WorkflowId,
            Status = WorkflowStatus.Paused,
            Parameters = JsonSerializer.Serialize(launch.Parameters),
            RecipePublicationCapture = candidate.BootstrapIntent,
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
        if (!UrlCaptureInitialization.IsPending(instance) || launch.Parameters.Count != 2
            || !launch.Parameters.TryGetValue("recipeId", out var recipe) || !Guid.TryParse(recipe, out var id)
            || id != candidate.Info.Id || !launch.Parameters.TryGetValue("url", out var url)
            || string.IsNullOrWhiteSpace(url) || url != candidate.Info.SourceUrl
            || instance.Tasks.Single().DependsOn.Length != 0 || instance.Tasks.Single().ScheduledAt is not null
            || instance.Tasks.Single().Payload != "null")
            throw new InvalidDataException("Bootstrap intent differs from accepted recipe input.");
        return instance;
    }

    private static void ValidateBootstrapWorkflow(RecipePublicationCandidate candidate, Guid operationId,
        WorkflowInstance instance, bool requirePending)
    {
        var original = ReadBootstrapIntent(candidate);
        if (original.Id != operationId || instance.Id != original.Id || instance.WorkflowId != original.WorkflowId
            || CanonicalRecipeContentStore.NormalizeJson(instance.Parameters) != CanonicalRecipeContentStore.NormalizeJson(original.Parameters))
            throw new InvalidDataException("Workflow differs from accepted bootstrap intent.");
        ValidateRecoveryLaunch(instance);
        if (requirePending || IsDispatchLaunch(instance.RecipePublicationCapture!))
        {
            if ((requirePending && !UrlCaptureInitialization.IsPending(instance))
                || CanonicalRecipeContentStore.NormalizeJson(instance.RecipePublicationCapture)
                    != CanonicalRecipeContentStore.NormalizeJson(original.RecipePublicationCapture))
                throw new InvalidDataException("Initialization differs from accepted bootstrap intent.");
        }
    }

    internal async Task ValidateBootstrapInitializationAsync(WorkflowInstance instance, CancellationToken ct)
    {
        // Lookup by immutable operation identity, never by mutable recipe/url input.
        var journal = await db.RecipeFilePublications.AsNoTracking().SingleOrDefaultAsync(x => x.OperationId == instance.Id, ct)
            ?? throw new InvalidDataException("URL initialization requires its accepted publication.");
        var envelope = ReadEnvelope(journal);
        ValidateBootstrapWorkflow(envelope.Candidate, journal.OperationId, instance, requirePending: true);
        if (!journal.Delivered) throw new InvalidDataException("URL initialization is waiting for source delivery.");
        var recipe = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == journal.RecipeId, ct)
            ?? throw new InvalidDataException("Accepted URL recipe is unavailable.");
        if (recipe.CanonicalContent is not null || Fields(recipe, envelope.Capture.FieldHashVersion) != journal.ResultHash
            || await db.RecipeFilePublications.AnyAsync(x => x.RecipeId == journal.RecipeId && !x.Delivered, ct))
            throw Conflict(recipe);
        var expected = envelope.Capture.Files.ToDictionary(x => x.Key, x => x.Value, StringComparer.Ordinal);
        foreach (var file in envelope.Output) expected[file.Key] = file.Value;
        IReadOnlyDictionary<string, byte[]?> current;
        try { current = await repository.CapturePublicationFilesAsync(journal.RecipeId, ct, allowMissingInfo: true); }
        catch (JsonException) { throw Conflict(recipe); }
        catch (InvalidDataException) { throw Conflict(recipe); }
        if (!SameFiles(expected, current)) throw Conflict(recipe);
    }

    internal static void ValidateRecoveryBootstrapIntent(RecipeFilePublication publication,
        IReadOnlyDictionary<Guid, WorkflowInstance> workflows)
    {
        var envelope = ReadEnvelope(publication);
        if (envelope.Candidate.BootstrapIntent is null) return; // Old facts supply no new authority.
        var original = ReadBootstrapIntent(envelope.Candidate);
        if (!workflows.TryGetValue(original.Id, out var workflow))
            throw new InvalidDataException("Accepted bootstrap intent requires its retained workflow.");
        ValidateBootstrapWorkflow(envelope.Candidate, publication.OperationId, workflow, requirePending: false);
        if (!IsDispatchLaunch(workflow.RecipePublicationCapture!))
        {
            var launch = ReadRecoveryJson<Launch>(workflow.RecipePublicationCapture!);
            var expected = envelope.Capture.Files.ToDictionary(x => x.Key, x => x.Value, StringComparer.Ordinal);
            foreach (var file in envelope.Output) expected[file.Key] = file.Value;
            if (!publication.Delivered || launch.Capture.RecipeId != publication.RecipeId
                || launch.Capture.FieldHash != publication.ResultHash
                || launch.Capture.FieldHashVersion != envelope.Capture.FieldHashVersion
                || !SameFiles(expected, launch.Capture.Files))
                throw new InvalidDataException("Initialized workflow differs from its accepted bootstrap publication.");
        }
        // Delivery is an independent fact; pending extraction never becomes complete here.
    }
}
