using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class RecipeFilePublicationStore
{
    private sealed record RepairStepSource(Guid OperationId, string InputHash, string ResultHash, string PayloadHash,
        CanonicalRecipeContent Content);
    private sealed record ContentRepairInput(int Version, string[] Reasons, string GeneratedMetadata, RepairStepSource? StepSource);

    internal async Task<RecipePublicationCandidate> PrepareAcceptedRepairAsync(RecipePublicationCapture capture,
        string raw, RecipeInfo info, string producerInput, Guid operationId, CancellationToken ct)
    {
        var report = await db.RecipeImportReports.AsNoTracking().SingleAsync(x => x.RecipeId == capture.RecipeId, ct);
        if (!report.Reasons.Contains("steps"))
        {
            var ingredient = PreparePhotoIngredientRepair(capture, raw, operationId);
            return new(RecipeExportContent.WriteCurrent(ingredient.Export), info, producerInput,
                SourceKind: "canonical-ingredient-repair", MappingEvidence: ingredient.Evidence);
        }
        RepairStepSource? source = null;
        var current = CanonicalRecipeContentStore.Read(RestoreV4(capture))!;
        var publications = await db.RecipeFilePublications.AsNoTracking()
            .Where(x => x.RecipeId == capture.RecipeId && x.Delivered).ToDictionaryAsync(x => x.OperationId, ct);
        foreach (var publication in publications.Values.OrderBy(x => x.CreatedAt).ThenBy(x => x.OperationId))
        {
            var envelope = ReadEnvelope(publication);
            var owned = SourceOwnedSteps(envelope);
            if (owned is null || !CanonicalRecipeContentStore.SameOriginalSteps(current, owned)) continue;
            ValidateRepairSource(envelope.Candidate, capture.RecipeId, publications, [publication.OperationId]);
            source = new(publication.OperationId, publication.InputHash, publication.ResultHash,
                Hash(CanonicalRecipeContentStore.NormalizeJson(publication.Payload)), owned);
            break;
        }
        var input = new ContentRepairInput(1, report.Reasons, raw, source);
        var prepared = CanonicalRecipeContentStore.PrepareContentRepair(capture.Fields!, raw, input.Reasons,
            source?.Content, Guid.NewGuid().ToString("N"));
        var mapped = MapContentRepair(capture, prepared, operationId, input.Reasons.Contains("ingredients"));
        return new(RecipeExportContent.WriteCurrent(mapped.Export), info, producerInput,
            SourceContext: JsonSerializer.Serialize(input, Json), SourceKind: "canonical-content-repair", MappingEvidence: mapped.Evidence);
    }

    private static ContentRepairInput ReadContentRepair(RecipePublicationCandidate candidate)
    {
        var input = ReadRecoveryJson<ContentRepairInput>(candidate.SourceContext ?? throw new InvalidDataException("Repair input is absent."));
        if (input.Version != 1 || input.Reasons is null || !input.Reasons.Contains("steps")
            || input.Reasons.Any(x => x is not ("steps" or "ingredients")) || input.Reasons.Distinct().Count() != input.Reasons.Length
            || string.IsNullOrWhiteSpace(input.GeneratedMetadata))
            throw new InvalidDataException("Repair selection is invalid.");
        var parsed = RecipeExtractionParser.ParseAndNormalize(input.GeneratedMetadata);
        if (!parsed.IsSemanticallyComplete) throw new InvalidDataException("Repair output is incomplete.");
        if (input.StepSource is { } source)
        {
            if (source.OperationId == Guid.Empty || source.Content is null || new[] { source.InputHash, source.ResultHash, source.PayloadHash }
                .Any(x => x is not { Length: 64 } || !x.All(Uri.IsHexDigit)))
                throw new InvalidDataException("Original instruction producer reference is invalid.");
            _ = RecipeExportContent.WriteCurrent(new(candidate.Info.Id, source.Content, null));
        }
        return input;
    }

    internal static string ContentRepairGeneratedMetadata(RecipePublicationCandidate candidate) => ReadContentRepair(candidate).GeneratedMetadata;

    private static FoodMappingPreparation MapContentRepair(RecipePublicationCapture capture, CanonicalRecipeExport prepared,
        Guid operationId, bool ingredients)
    {
        var prior = CanonicalRecipeContentStore.Read(RestoreV4(capture))!;
        return ingredients
            ? FoodMappingQualification.PrepareCapturedPhotoRepair(prepared, capture.FoodAuthority!, operationId, prior,
                capture.FoodEvidence!.Value, capture.Fields!.SourceUrl)
            : FoodMappingQualification.Prepare(prepared, capture.FoodAuthority!, operationId, prior, capture.FoodEvidence!.Value);
    }

    private static IReadOnlyDictionary<string, byte[]?> PrepareContentRepair(RecipePublicationCapture capture,
        RecipePublicationCandidate candidate, Guid operationId)
    {
        if (capture.FieldHashVersion != 4 || capture.Fields?.CanonicalContent is null || candidate.RecipeJson is null
            || candidate.SourceFiles is not null || candidate.BootstrapIntent is not null || candidate.FollowupIntent is not null
            || candidate.ReviewReasons is not null || operationId == Guid.Empty
            || capture.Files.GetValueOrDefault("recipe.info") is not { } bytes
            || Hash(JsonSerializer.Deserialize<RecipeInfo>(bytes, Json)!) != Hash(candidate.Info))
            throw new InvalidDataException("Content repair selects canonical facts only.");
        var input = ReadContentRepair(candidate);
        using var document = JsonDocument.Parse(candidate.RecipeJson);
        var incoming = RecipeExportContent.ReadCurrent(document.RootElement, capture.RecipeId);
        var prepared = CanonicalRecipeContentStore.PrepareContentRepair(capture.Fields, input.GeneratedMetadata,
            input.Reasons, input.StepSource?.Content, incoming.Content.ContentRevision, incoming.Content);
        var mapped = MapContentRepair(capture, prepared, operationId, input.Reasons.Contains("ingredients"));
        if (!RecipeExportContent.IsIdenticalCurrent(incoming, mapped.Export)
            || CanonicalRecipeContentStore.NormalizeJson(candidate.MappingEvidence) != CanonicalRecipeContentStore.NormalizeJson(mapped.Evidence))
            throw new InvalidDataException("Content repair differs from its selected protected merge.");
        return new Dictionary<string, byte[]?> { ["recipe.json"] = Encoding.UTF8.GetBytes(candidate.RecipeJson) };
    }

    private static CanonicalRecipeContent? SourceOwnedSteps(Envelope envelope)
    {
        if (envelope.Candidate.SourceKind == "canonical-content-repair")
        {
            var input = ReadContentRepair(envelope.Candidate);
            var before = CanonicalRecipeContentStore.Read(RestoreV4(envelope.Capture))!;
            if (input.StepSource is null || !CanonicalRecipeContentStore.SameOriginalSteps(before, input.StepSource.Content)) return null;
        }
        else if (envelope.Candidate.SourceKind != "fresh-canonical") return null;
        using var document = JsonDocument.Parse(envelope.Candidate.RecipeJson!);
        return RecipeExportContent.ReadCurrent(document.RootElement, envelope.Capture.RecipeId).Content;
    }

    private static void ValidateRepairSource(RecipePublicationCandidate candidate, Guid recipeId,
        IReadOnlyDictionary<Guid, RecipeFilePublication> publications, HashSet<Guid>? visited = null)
    {
        if (candidate.SourceKind != "canonical-content-repair") return;
        var input = ReadContentRepair(candidate);
        if (input.StepSource is not { } source) return; // Missing source authority can only preserve existing steps.
        visited ??= [];
        if (!visited.Add(source.OperationId)) throw new InvalidDataException("Instruction source lineage is cyclic.");
        if (!publications.TryGetValue(source.OperationId, out var original) || !original.Delivered || original.RecipeId != recipeId
            || original.InputHash != source.InputHash || original.ResultHash != source.ResultHash
            || Hash(CanonicalRecipeContentStore.NormalizeJson(original.Payload)) != source.PayloadHash)
            throw new InvalidDataException("Instruction repair lacks its independent original publication.");
        var envelope = ReadEnvelope(original);
        var owned = SourceOwnedSteps(envelope);
        if (owned is null || Hash(owned) != Hash(source.Content))
            throw new InvalidDataException("Instruction repair cannot invent source ownership.");
        ValidateRepairSource(envelope.Candidate, recipeId, publications, visited);
    }

    private async Task ValidateContentRepairAsync(RecipePublicationCapture capture, RecipePublicationCandidate candidate,
        Guid operationId, CancellationToken ct)
    {
        var task = await db.WorkflowTasks.AsNoTracking().SingleAsync(x => x.TaskId == operationId, ct);
        var report = await db.RecipeImportReports.AsNoTracking().SingleAsync(x => x.RecipeId == capture.RecipeId, ct);
        if (candidate.ProducerInput != "ExtractRecipe\n" + CanonicalRecipeContentStore.NormalizeJson(task.Payload)
            || !ReadContentRepair(candidate).Reasons.SequenceEqual(report.Reasons)
            || !await CanRepairCanonicalSourceAsync(capture, operationId, ct))
            throw new InvalidDataException("Content repair differs from its original accepted command.");
        var publications = await db.RecipeFilePublications.AsNoTracking().Where(x => x.RecipeId == capture.RecipeId)
            .ToDictionaryAsync(x => x.OperationId, ct);
        ValidateRepairSource(candidate, capture.RecipeId, publications, [operationId]);
    }

    internal static void ValidateRecoveryRepairSources(IReadOnlyDictionary<Guid, RecipeFilePublication> publications)
    {
        foreach (var publication in publications.Values)
            ValidateRepairSource(ReadRecoveryJson<Envelope>(publication.Payload).Candidate, publication.RecipeId, publications, [publication.OperationId]);
    }
}
