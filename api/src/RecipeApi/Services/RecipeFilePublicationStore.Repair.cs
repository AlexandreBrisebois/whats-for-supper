using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class RecipeFilePublicationStore
{
    private async Task ValidatePhotoRepairFollowupAsync(WorkflowInstance workflow, WorkflowTask task, Guid recipeId, CancellationToken ct)
    {
        workflow = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).SingleAsync(x => x.Id == workflow.Id, ct);
        ValidateExecutionLaunch(workflow);
        if (workflow.WorkflowId != "recipe-import" || workflow.RecipePublicationCapture is null
            || task.ProcessorName is not ("GenerateHero" or "CategorizeRecipe"))
            throw new InvalidDataException("Photo repair follow-up requires its original workflow task.");
        var launch = ReadRecoveryJson<Launch>(workflow.RecipePublicationCapture);
        var extraction = workflow.Tasks.SingleOrDefault(x => x.ProcessorName == "ExtractRecipe");
        var visited = new HashSet<string>(StringComparer.Ordinal);
        bool HasAncestor(string name)
        {
            if (!visited.Add(name)) return false;
            var matches = launch.Tasks.Values.Where(x => x.Name == name).ToArray();
            return matches.Length == 1 && (extraction?.TaskName == name || matches[0].DependsOn.Any(HasAncestor));
        }
        if (launch.Capture.RecipeId != recipeId || extraction is null
            || !launch.Tasks.TryGetValue(task.TaskId, out var original) || original.Processor != task.ProcessorName
            || original.Payload != CanonicalRecipeContentStore.NormalizeJson(task.Payload) || !original.DependsOn.Any(HasAncestor))
            throw new InvalidDataException("Photo repair follow-up has no captured extraction ancestor.");
        var publication = await db.RecipeFilePublications.AsNoTracking()
            .SingleOrDefaultAsync(x => x.RecipeId == recipeId && x.OperationId == extraction.TaskId, ct);
        if (publication is null || !publication.Delivered)
            throw new InvalidDataException("Photo repair follow-up requires delivered ingredient repair.");
        var envelope = ReadEnvelope(publication);
        if (envelope.Candidate.SourceKind != "photo-ingredient-repair"
            || !await CanRepairCanonicalPhotoAsync(envelope.Capture, extraction.TaskId, ct))
            throw new InvalidDataException("Photo repair follow-up requires its accepted report and original captured source.");
    }

    internal async Task<bool> CanRepairCanonicalPhotoAsync(RecipePublicationCapture capture, Guid operationId, CancellationToken ct)
    {
        if (capture.FieldHashVersion != 4 || capture.Fields?.CanonicalContent is null || capture.Fields.RawMetadata is null
            || capture.Fields.SourceUrl is not null || capture.Fields.ImageCount is < 1 or > 20
            || capture.Files.GetValueOrDefault("original/source.pdf") is not null
            || capture.Files.GetValueOrDefault("original/content.html") is not null) return false;
        var task = await db.WorkflowTasks.AsNoTracking().SingleOrDefaultAsync(x => x.TaskId == operationId, ct);
        if (task is null || task.InstanceId == Guid.Empty || task.ProcessorName != "ExtractRecipe") return false;
        var workflow = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks).SingleOrDefaultAsync(x => x.Id == task.InstanceId, ct);
        var report = await db.RecipeImportReports.AsNoTracking().SingleOrDefaultAsync(x => x.RecipeId == capture.RecipeId, ct);
        if (workflow is null || workflow.WorkflowId != "recipe-import" || workflow.RecipePublicationCapture is null
            || report?.RepairIntentId is not Guid intentId || report.LastWorkflowInstanceId != workflow.Id
            || report.Status != RecipeImportReportStatus.Reimporting || !report.Reasons.SequenceEqual(["ingredients"])
            || string.IsNullOrWhiteSpace(report.Note)) return false;
        var intent = await db.RecipeRepairIntents.AsNoTracking().SingleOrDefaultAsync(x => x.Id == intentId, ct);
        if (intent is null) throw new InvalidDataException("Accepted ingredient repair command is missing.");
        RecipeReportRepairIntent.ValidateAccepted(intent, workflow);
        var command = RecipeReportRepairIntent.Read(intent);
        if (!command.Parameters.TryGetValue("repairReasons", out var reasons) || reasons != string.Join(',', report.Reasons)
            || !command.Parameters.TryGetValue("repairNote", out var note) || note != report.Note) return false;
        var launch = ReadRecoveryJson<Launch>(workflow.RecipePublicationCapture);
        if (launch.Capture.RecipeId != capture.RecipeId || launch.Capture.FieldHashVersion != 4
            || launch.Capture.FieldHash != capture.FieldHash || launch.Capture.SourceRevision != capture.SourceRevision
            || launch.Capture.ContentRevision != capture.ContentRevision || !SameFiles(launch.Capture.Files, capture.Files)
            || Hash(launch.Capture.FoodAuthority!) != Hash(capture.FoodAuthority!)
            || !launch.Tasks.TryGetValue(operationId, out var original) || original.Processor != "ExtractRecipe"
            || original.Payload != CanonicalRecipeContentStore.NormalizeJson(task.Payload)) return false;
        for (var index = 0; index < capture.Fields.ImageCount; index++)
        {
            var sources = capture.Files.Where(x => x.Key.StartsWith($"original/{index}.", StringComparison.Ordinal) && x.Value is not null).ToArray();
            if (sources.Length != 1 || sources[0].Value is not { Length: > 0 }) return false;
        }
        return true;
    }

    internal FoodMappingPreparation PreparePhotoIngredientRepair(RecipePublicationCapture capture, string raw, Guid operationId,
        string? revision = null)
    {
        ValidateOriginalFields(capture);
        var prepared = CanonicalRecipeContentStore.PreparePhotoIngredientRepair(capture.Fields!, raw, revision ?? Guid.NewGuid().ToString("N"));
        var prior = CanonicalRecipeContentStore.Read(RestoreV4(capture))!;
        return FoodMappingQualification.PrepareCapturedPhotoRepair(prepared, capture.FoodAuthority!, operationId, prior, capture.FoodEvidence!.Value);
    }

    private static IReadOnlyDictionary<string, byte[]?> PreparePhotoRepair(RecipePublicationCapture capture,
        RecipePublicationCandidate candidate, Guid operationId)
    {
        if (capture.FieldHashVersion != 4 || candidate.RecipeJson is null || capture.Fields?.CanonicalContent is null
            || candidate.SourceFiles is not null || candidate.SourceContext is not null || candidate.BootstrapIntent is not null
            || candidate.FollowupIntent is not null || candidate.ReviewReasons is not null || operationId == Guid.Empty
            || capture.Files.GetValueOrDefault("recipe.info") is not { } infoBytes)
            throw new InvalidDataException("Photo ingredient repair requires captured canonical facts and no media selection.");
        var info = JsonSerializer.Deserialize<RecipeInfo>(infoBytes, Json)!;
        if (Hash(info) != Hash(candidate.Info)) throw new InvalidDataException("Ingredient repair cannot replace captured metadata.");
        using var document = JsonDocument.Parse(candidate.RecipeJson);
        var incoming = RecipeExportContent.ReadCurrent(document.RootElement, capture.RecipeId);
        var prepared = CanonicalRecipeContentStore.PreparePhotoIngredientRepair(capture.Fields,
            incoming.RawMetadata ?? throw new InvalidDataException("Repair has no normalized source."), incoming.Content.ContentRevision);
        var prior = CanonicalRecipeContentStore.Read(RestoreV4(capture))!;
        var mapped = FoodMappingQualification.PrepareCapturedPhotoRepair(prepared, capture.FoodAuthority!, operationId, prior, capture.FoodEvidence!.Value);
        if (!RecipeExportContent.IsIdenticalCurrent(incoming, mapped.Export)
            || CanonicalRecipeContentStore.NormalizeJson(candidate.MappingEvidence) != CanonicalRecipeContentStore.NormalizeJson(mapped.Evidence))
            throw new InvalidDataException("Ingredient repair differs from its captured protected merge.");
        return new Dictionary<string, byte[]?> { ["recipe.json"] = Encoding.UTF8.GetBytes(candidate.RecipeJson) };
    }
}
