using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class RecipeFilePublicationStore
{
    internal async Task<RecipePublicationCandidate?> PrepareSynthesizedIntakeAsync(RecipePublicationCapture capture,
        string normalizedJson, RecipeInfo info, Guid operationId, string producerInput, CancellationToken ct)
    {
        if (capture.FieldHashVersion != 4) return null;
        if (!await HasFreshSynthesisAncestryAsync(capture, operationId, producerInput, ct)) return null;
        var mapped = PrepareMappedSource(capture,
            CanonicalRecipeContentStore.PrepareSynthesizedSource(capture.RecipeId, normalizedJson), operationId);
        return new(RecipeExportContent.WriteCurrent(mapped.Export), info, producerInput,
            SourceKind: "synthesized-canonical", MappingEvidence: mapped.Evidence);
    }

    private async Task<bool> HasFreshSynthesisAncestryAsync(RecipePublicationCapture capture, Guid operationId,
        string? producerInput, CancellationToken ct)
    {
        var task = await db.WorkflowTasks.AsNoTracking().SingleOrDefaultAsync(x => x.TaskId == operationId, ct);
        if (task is null || task.ProcessorName != "SynthesizeRecipe" || task.InstanceId == Guid.Empty
            || producerInput != "SynthesizeRecipe\n" + CanonicalRecipeContentStore.NormalizeJson(task.Payload)) return false;
        var workflow = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).SingleOrDefaultAsync(x => x.Id == task.InstanceId, ct);
        if (workflow is null || workflow.WorkflowId != "goto-synthesis" || workflow.RecipePublicationCapture is null) return false;
        ValidateExecutionLaunch(workflow);
        var launch = ReadRecoveryJson<Launch>(workflow.RecipePublicationCapture);
        if (launch.Capture.RecipeId != capture.RecipeId || launch.Capture.FieldHashVersion != 4
            || launch.Capture.FieldHash != capture.FieldHash || Hash(launch.Capture.FoodAuthority) != Hash(capture.FoodAuthority)
            || !SameFiles(launch.Capture.Files, capture.Files)
            || launch.Capture.Fields is not { Ingredients: null, RawMetadata: null, CanonicalContent: null, IsReady: false }
            || !launch.Tasks.TryGetValue(operationId, out var observed) || observed.Processor != "SynthesizeRecipe") return false;
        var bootstrap = await db.RecipeFilePublications.AsNoTracking().SingleOrDefaultAsync(x => x.RecipeId == capture.RecipeId && x.OperationId == workflow.Id, ct);
        if (bootstrap is null || !bootstrap.Delivered || bootstrap.ResultHash != launch.Capture.FieldHash) return false;
        var envelope = ReadEnvelope(bootstrap);
        if (envelope.Candidate.SourceKind != "bootstrap" || envelope.Candidate.RecipeJson is not null
            || envelope.Candidate.SourceFiles is not { Count: 0 } || envelope.Candidate.FollowupIntent is null) return false;
        ValidateFollowupWorkflow(envelope.Candidate, bootstrap.OperationId, workflow, requirePending: false);
        return true;
    }

    private async Task ValidateSynthesizedCanonicalAsync(RecipePublicationCapture capture, RecipePublicationCandidate candidate,
        Guid operationId, CancellationToken ct)
    {
        if (!await HasFreshSynthesisAncestryAsync(capture, operationId, candidate.ProducerInput, ct))
            throw new InvalidDataException("Canonical synthesis requires its witnessed Describe bootstrap and original workflow task.");
    }

    private async Task ValidateSynthesizedFollowupAsync(WorkflowInstance workflow, WorkflowTask task, Guid recipeId, CancellationToken ct)
    {
        ValidateExecutionLaunch(workflow);
        if (workflow.WorkflowId != "goto-synthesis" || workflow.RecipePublicationCapture is null)
            throw new InvalidDataException("Generated follow-up requires its witnessed synthesis workflow.");
        var launch = ReadRecoveryJson<Launch>(workflow.RecipePublicationCapture);
        var synthesis = workflow.Tasks.SingleOrDefault(x => x.ProcessorName == "SynthesizeRecipe");
        var visited = new HashSet<string>(StringComparer.Ordinal);
        bool HasAncestor(string name)
        {
            if (!visited.Add(name)) return false;
            var matches = launch.Tasks.Values.Where(x => x.Name == name).ToArray();
            return matches.Length == 1 && (synthesis?.TaskName == name || matches[0].DependsOn.Any(HasAncestor));
        }
        if (launch.Capture.RecipeId != recipeId || synthesis is null
            || !launch.Tasks.TryGetValue(task.TaskId, out var original) || original.Processor != task.ProcessorName
            || original.Payload != CanonicalRecipeContentStore.NormalizeJson(task.Payload)
            || !original.DependsOn.Any(HasAncestor))
            throw new InvalidDataException("Generated follow-up has no captured synthesis ancestor.");
        var publication = await db.RecipeFilePublications.AsNoTracking()
            .SingleOrDefaultAsync(x => x.RecipeId == recipeId && x.OperationId == synthesis.TaskId, ct);
        if (publication is null || !publication.Delivered)
            throw new InvalidDataException("Generated follow-up requires delivered canonical synthesis.");
        var envelope = ReadEnvelope(publication);
        if (envelope.Candidate.SourceKind != "synthesized-canonical"
            || !await HasFreshSynthesisAncestryAsync(envelope.Capture, synthesis.TaskId, envelope.Candidate.ProducerInput, ct))
            throw new InvalidDataException("Generated follow-up requires its original canonical synthesis authority.");
    }

    private static IReadOnlyDictionary<string, byte[]?> PrepareSynthesizedCanonical(RecipePublicationCapture capture,
        RecipePublicationCandidate candidate, Guid operationId)
    {
        if (capture.Fields is not { Ingredients: null, RawMetadata: null, CanonicalContent: null, IsReady: false }
            || candidate.RecipeJson is null || candidate.SourceFiles is not null || candidate.SourceContext is not null
            || candidate.BootstrapIntent is not null || candidate.FollowupIntent is not null || candidate.ReviewReasons is not null
            || !candidate.Info.IsSynthesized || candidate.Info.IsReady == true || operationId == Guid.Empty)
            throw new InvalidDataException("Canonical synthesis requires untouched fresh generated-content membership.");
        using var document = JsonDocument.Parse(candidate.RecipeJson);
        var incoming = RecipeExportContent.ReadCurrent(document.RootElement, capture.RecipeId);
        var raw = incoming.RawMetadata ?? throw new InvalidDataException("Normalized generated text is missing.");
        var original = CanonicalRecipeContentStore.PrepareSynthesizedSource(capture.RecipeId, raw);
        if (incoming.Content.IngredientLines.Count != original.Content.IngredientLines.Count)
            throw new InvalidDataException("Synthesized originals differ from retained generated text.");
        original = original with
        {
            Content = original.Content with
            {
                ContentRevision = incoming.Content.ContentRevision,
                IngredientLines = original.Content.IngredientLines.Select((line, index) => line with { Id = incoming.Content.IngredientLines[index].Id }).ToArray()
            }
        };
        var mapped = FoodMappingQualification.Prepare(original, capture.FoodAuthority!, operationId);
        if (incoming.Content.SourceRevision != original.Content.SourceRevision
            || FreshOriginalFacts(mapped.Export.Content) != FreshOriginalFacts(incoming.Content)
            || CanonicalRecipeContentStore.NormalizeJson(mapped.Evidence) != CanonicalRecipeContentStore.NormalizeJson(candidate.MappingEvidence))
            throw new InvalidDataException("Synthesized originals differ from retained generated text.");
        CookingStepRelationshipProducer.ValidateFresh(incoming.Content);
        var legacy = capture with { FieldHashVersion = 3, FieldHash = Hash(capture.Fields), FoodEvidence = null, FoodAuthority = null };
        var output = Prepare(legacy, candidate with { SourceKind = null, RecipeJson = raw, MappingEvidence = null }, operationId).ToDictionary(x => x.Key, x => x.Value);
        output["recipe.json"] = Encoding.UTF8.GetBytes(candidate.RecipeJson);
        return output;
    }
}
