using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class StructuredRecipeContentStore
{
    internal static StructuredRecipeWriteResult ReadValidatedRetainedResult(StructuredRecipeOperation operation)
    {
        ValidateOriginalOperation(operation);
        return IsV2(operation)
            ? ReadOriginal<StructuredResultV2>(operation.Result).Result
            : ReadOriginal<StructuredRecipeWriteResult>(operation.Result);
    }

    public static FoodVocabularyReference[] VocabularyReferences(StructuredRecipeOperation operation)
    {
        ValidateOriginalOperation(operation);
        if (IsV2(operation))
        {
            var request = ReadOriginal<OriginalRequestV2>(operation.OriginalRequest!);
            return request.FoodAuthority.Captures.Select(x => x.Reference).Distinct().ToArray();
        }
        var historical = ReadOriginal<StructuredRecipeWriteResult>(operation.Result);
        RequireOriginal(historical.Content.IngredientLines.All(x => x.Shopping.FoodId is null && x.Shopping.MappingRevision is null));
        return [];
    }

    private sealed record OriginalRequestV2(int Version, Guid RecipeId, Guid OperationId, string Kind,
        string CallerInputHash, string? Input, bool HasServings, RecipePublicationFields Baseline, string BaselineHash,
        FoodMappingObservation PriorEvidence, string PriorEvidenceHash, FoodVocabularyAuthority FoodAuthority);
    private sealed record StructuredResultV2(int Version, StructuredRecipeWriteResult Result, FoodMappingObservation Evidence,
        RecipeFoodNameDecision[] Decisions);
    private static string? EvidenceValue(Recipe recipe) => recipe.FoodMappingEvidence is null ? null : NormalizeJson(recipe.FoodMappingEvidence);
    private static bool IsV2(StructuredRecipeOperation operation)
    {
        if (operation.OriginalRequest is null) return false;
        using var doc = JsonDocument.Parse(operation.OriginalRequest);
        return doc.RootElement.TryGetProperty("version", out var version) && version.GetInt32() == 2;
    }

    private void RecordV2(Recipe recipe, Guid operationId, string kind, string callerInputHash, RecipePublicationFields baseline,
        string? priorEvidence, FoodVocabularyAuthority authority, UpdateRecipeDto? input, StructuredRecipeWriteResult result, string? evidence, DateTimeOffset? recordedAt = null)
        => db.StructuredRecipeOperations.Add(CreateV2(recipe, operationId, kind, callerInputHash, baseline, priorEvidence,
            authority, input, result, evidence, recordedAt ?? clock.UtcNow));

    private static StructuredRecipeOperation CreateV2(Recipe recipe, Guid operationId, string kind, string callerInputHash,
        RecipePublicationFields baseline, string? priorEvidence, FoodVocabularyAuthority authority, UpdateRecipeDto? input,
        StructuredRecipeWriteResult result, string? evidence, DateTimeOffset recordedAt)
    {
        authority.Validate();
        FoodMappingQualification.Validate(result.Content, evidence, authority, recipe.Id);
        var observation = new FoodMappingObservation(priorEvidence);
        var request = new OriginalRequestV2(2, recipe.Id, operationId, kind, callerInputHash,
            input is null ? null : JsonSerializer.Serialize(input, Json), input?.HasServings ?? false,
            baseline, Hash(baseline), observation, Hash(observation), authority);
        var decisions = evidence is null ? [] : FoodVocabularyDefinitions.ReadStrict<RecipeFoodMappingEvidence>(evidence).NameDecisions;
        return new()
        {
            RecipeId = recipe.Id,
            OperationId = operationId,
            InputHash = Hash(request),
            OriginalRequest = JsonSerializer.Serialize(request, Json),
            Result = JsonSerializer.Serialize(new StructuredResultV2(2, result, new(evidence), decisions), Json),
            CreatedAt = recordedAt
        };
    }

    private static StructuredRecipeWriteResult ReplayV2(StructuredRecipeOperation operation, string callerHash, Recipe recipe)
    {
        ValidateOriginalOperationV2(operation);
        var request = ReadOriginal<OriginalRequestV2>(operation.OriginalRequest!);
        if (request.CallerInputHash != callerHash) throw Conflict(recipe);
        return ReadOriginal<StructuredResultV2>(operation.Result).Result;
    }

    private static bool ValidateOriginalOperationV2(StructuredRecipeOperation operation)
    {
        try
        {
            var request = ReadOriginal<OriginalRequestV2>(operation.OriginalRequest!);
            RequireOriginal(request.Version == 2 && request.RecipeId == operation.RecipeId && request.OperationId == operation.OperationId
                && operation.OperationId != Guid.Empty && operation.RecipeId != Guid.Empty && Hash(request) == operation.InputHash
                && request.Baseline is not null && request.Baseline.Id == operation.RecipeId && Hash(request.Baseline) == request.BaselineHash
                && request.PriorEvidence is not null && Hash(request.PriorEvidence) == request.PriorEvidenceHash && request.FoodAuthority is not null);
            request.FoodAuthority.Validate();
            var recipe = RestoreObservation(request.Baseline);
            recipe.FoodMappingEvidence = request.PriorEvidence.Value;
            var current = Read(recipe);
            if (current is not null)
            {
                ValidateContent(current, retainedHistory: true, rawMetadata: recipe.RawMetadata);
                FoodMappingQualification.Validate(current, recipe.FoodMappingEvidence, request.FoodAuthority, recipe.Id);
            }
            else RequireOriginal(recipe.FoodMappingEvidence is null);
            var saved = ReadOriginal<StructuredResultV2>(operation.Result);
            RequireOriginal(saved.Version == 2 && saved.Result is not null && saved.Evidence is not null && saved.Decisions is not null);
            var result = saved.Result;
            ValidateContent(result.Content, retainedHistory: true);
            StructuredRecipeWriteResult prepared;
            UpdateRecipeDto? input = null;
            string callerHash;
            if (request.Kind == "convert")
            {
                RequireOriginal(request.Input is null && !request.HasServings);
                var expectedContentRevision = InspectContentRevision(recipe);
                var expectedSourceRevision = InspectSourceRevision(recipe);
                callerHash = Hash(new { Kind = "convert", expectedContentRevision, expectedSourceRevision });
                if (current is not null) prepared = new(current, new Dictionary<string, Guid>());
                else
                {
                    var lineIds = new Queue<Guid>(result.Content.IngredientLines.Select(x => x.Id));
                    var sectionIds = new Queue<Guid>(result.Content.InstructionSections.Select(x => x.Id));
                    var steps = result.Content.InstructionSections.SelectMany(x => x.Steps).ToArray();
                    var stepIds = new Queue<Guid>(steps.Select(x => x.Id));
                    var revisions = new Queue<string>(steps.Select(x => x.TextRevision));
                    prepared = new(new(2, result.Content.ContentRevision, expectedSourceRevision, recipe.Servings,
                        ConvertLines(recipe, () => lineIds.Dequeue()), ConvertInstructions(recipe.RawMetadata,
                            () => sectionIds.Dequeue(), () => stepIds.Dequeue(), () => revisions.Dequeue())), new Dictionary<string, Guid>());
                    RequireOriginal(lineIds.Count == 0 && sectionIds.Count == 0 && stepIds.Count == 0 && revisions.Count == 0
                        && result.Content.ContentRevision != expectedContentRevision);
                }
            }
            else if (request.Kind == "edit")
            {
                RequireOriginal(current is not null && request.Input is not null);
                var raw = ReadOriginal<JsonElement>(request.Input!);
                input = raw.Deserialize<UpdateRecipeDto>(OriginalJson) ?? throw new InvalidDataException("Original edit is absent.");
                if (!request.HasServings)
                {
                    RequireOriginal(input.Servings is null);
                    var node = System.Text.Json.Nodes.JsonNode.Parse(request.Input!)!.AsObject();
                    node.Remove("servings");
                    input = node.Deserialize<UpdateRecipeDto>(OriginalJson)!;
                }
                ValidateEditInput(input);
                RequireOriginal(input.ExpectedContentRevision == current!.ContentRevision && result.Content.SourceRevision == current.SourceRevision);
                var expectedSourceRevision = current.SourceRevision;
                callerHash = Hash(new { Kind = "edit", expectedSourceRevision, Input = raw });
                var oldIds = current.IngredientLines.Select(x => x.Id).Concat(current.InstructionSections.Select(x => x.Id))
                    .Concat(current.InstructionSections.SelectMany(x => x.Steps).Select(x => x.Id)).ToHashSet();
                var ids = new Queue<Guid>(result.Content.IngredientLines.Select(x => x.Id)
                    .Concat(result.Content.InstructionSections.SelectMany(x => new[] { x.Id }.Concat(x.Steps.Select(step => step.Id))))
                    .Where(x => !oldIds.Contains(x)));
                var oldSteps = current.InstructionSections.SelectMany(x => x.Steps).ToDictionary(x => x.Id);
                RequireOriginal(result.Content.InstructionSections.SelectMany(x => x.Steps)
                    .All(x => !oldSteps.TryGetValue(x.Id, out var old) || old.Text == x.Text || old.TextRevision != x.TextRevision));
                var revisions = new Queue<string>(result.Content.InstructionSections.SelectMany(x => x.Steps)
                    .Where(x => !oldSteps.TryGetValue(x.Id, out var old) || old.Text != x.Text).Select(x => x.TextRevision)
                    .Append(result.Content.ContentRevision));
                RequireOriginal(current.ContentRevision != result.Content.ContentRevision);
                prepared = PrepareEditV2(current, input, () => ids.Dequeue(), () => revisions.Dequeue(), result.Content);
                RequireOriginal(ids.Count == 0 && revisions.Count == 0);
            }
            else throw new InvalidDataException("Unsupported canonical V2 operation.");
            RequireOriginal(callerHash == request.CallerInputHash);
            FoodMappingPreparation expected;
            if (request.Kind == "convert" && current is not null)
                expected = new(new(recipe.Id, prepared.Content, recipe.RawMetadata), request.PriorEvidence.Value,
                    request.PriorEvidence.Value is null ? [] : FoodVocabularyDefinitions.ReadStrict<RecipeFoodMappingEvidence>(request.PriorEvidence.Value).NameDecisions);
            else expected = FoodMappingQualification.Prepare(new(recipe.Id, prepared.Content, recipe.RawMetadata), request.FoodAuthority,
                operation.OperationId, request.Kind == "edit" ? current : null, request.Kind == "edit" ? request.PriorEvidence.Value : null);
            var expectedResult = new StructuredResultV2(2, prepared with { Content = expected.Export.Content }, new(expected.Evidence), expected.Decisions);
            RequireOriginal(NormalizeJson(JsonSerializer.Serialize(expectedResult, Json)) == NormalizeJson(operation.Result));
            FoodMappingQualification.Validate(result.Content, saved.Evidence.Value, request.FoodAuthority, recipe.Id);
            return true;
        }
        catch (Exception error) when (error is ArgumentException or InvalidOperationException or RecipeContentConflictException)
        {
            throw new InvalidDataException("Original V2 canonical operation is inconsistent.", error);
        }
    }
}
