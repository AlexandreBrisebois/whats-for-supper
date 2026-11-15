using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class CanonicalRecipeContentStore
{
    // Version 1 of the finite approved exception. Ordinary V1 dispatch stays strict.
    // This pure derivation is necessary but never grants source admission itself.
    internal static CanonicalRecipeWriteResult ValidateAttestedV1(CanonicalRecipeOperation operation, JsonElement member)
    {
        try
        {
            VerifyAttestedBytes(operation, member);
            var request = ReadOriginal<OriginalRequest>(operation.OriginalRequest!);
            RequireOriginal(request.Version == 1 && request.RecipeId == operation.RecipeId
                && request.OperationId == operation.OperationId && request.RecipeId != Guid.Empty
                && request.OperationId != Guid.Empty && request.Baseline is not null
                && request.Baseline.Id == request.RecipeId && request.BaselineHash == Hash(request.Baseline));
            var recipe = RecipeFilePublicationStore.RestoreObservation(request.Baseline);
            // Check embedded original JSON before any permissive legacy parser.
            foreach (var raw in new[] { recipe.Ingredients, recipe.RawMetadata, recipe.CanonicalContent })
                if (raw is not null) ReadOriginal<JsonElement>(raw);
            RequireOriginal(InspectContentRevision(recipe) == request.ExpectedContentRevision
                && InspectSourceRevision(recipe) == request.ExpectedSourceRevision);
            var result = ReadOriginal<CanonicalRecipeWriteResult>(operation.Result);
            RequireOriginal(result.Content is not null && result.CreatedIds is not null);
            RecipeExportContent.WriteCurrent(new(operation.RecipeId, result.Content, null));
            var current = recipe.CanonicalContent is null ? null : ReadOriginal<CanonicalRecipeContent>(recipe.CanonicalContent);
            if (current is not null) RecipeExportContent.WriteCurrent(new(operation.RecipeId, current, null));
            CanonicalRecipeWriteResult expected;
            string inputHash;
            RequireOriginal(request.Kind == "edit");
            if (request.Kind == "edit")
            {
                RequireOriginal(request.Input is not null && current is not null);
                var raw = ReadAttestedInput(request.Input!, member.GetProperty("duplicateSites"));
                var input = raw.Deserialize<UpdateRecipeDto>(OriginalJson) ?? throw new InvalidDataException("Original edit is absent.");
                // The original DTO serializer writes null even when servings was
                // omitted. Preserve that presence bit separately, without treating
                // the null as a request to clear a known basis.
                if (!request.HasServings)
                {
                    RequireOriginal(input.Servings is null);
                    var node = System.Text.Json.Nodes.JsonNode.Parse(request.Input!)!.AsObject();
                    node.Remove("servings");
                    input = node.Deserialize<UpdateRecipeDto>(OriginalJson)!;
                }
                RecipeContentInput.ValidateFacts(input);
                RequireOriginal(input.Ingredients is null && input.RecipeInstructions is null
                    && (!input.HasServings || input.Servings is > 0));
                RequireOriginal(input.ExpectedContentRevision == request.ExpectedContentRevision);
                var expectedSourceRevision = request.ExpectedSourceRevision;
                inputHash = Hash(new { Kind = "edit", expectedSourceRevision, Input = input });
                var oldIds = current!.IngredientLines.Select(x => x.Id).Concat(current.InstructionSections.Select(x => x.Id))
                    .Concat(current.InstructionSections.SelectMany(x => x.Steps).Select(x => x.Id)).ToHashSet();
                var newIds = new Queue<Guid>(result.Content.IngredientLines.Select(x => x.Id)
                    .Concat(result.Content.InstructionSections.SelectMany(x => new[] { x.Id }.Concat(x.Steps.Select(step => step.Id))))
                    .Where(x => !oldIds.Contains(x)));
                var oldSteps = current.InstructionSections.SelectMany(x => x.Steps).ToDictionary(x => x.Id);
                RequireOriginal(result.Content.InstructionSections.SelectMany(x => x.Steps)
                    .All(x => !oldSteps.TryGetValue(x.Id, out var old) || old.Text == x.Text || old.TextRevision != x.TextRevision));
                var revisions = new Queue<string>(result.Content.InstructionSections.SelectMany(x => x.Steps)
                    .Where(x => !oldSteps.TryGetValue(x.Id, out var old) || old.Text != x.Text).Select(x => x.TextRevision)
                    .Append(result.Content.ContentRevision));
                RequireOriginal(result.Content.ContentRevision != current.ContentRevision);
                expected = PrepareAttestedEditV1(current, input, () => newIds.Dequeue(), () => revisions.Dequeue(), result.Content);
                RequireOriginal(newIds.Count == 0 && revisions.Count == 0);
            }
            else throw new InvalidDataException("Unsupported attested operation.");
            RequireOriginal(inputHash == operation.InputHash
                && NormalizeJson(JsonSerializer.Serialize(expected, Json)) == NormalizeJson(operation.Result));
            return result;
        }
        catch (Exception error) when (error is ArgumentException or InvalidOperationException or RecipeContentConflictException or JsonException)
        {
            throw new InvalidDataException("Attested V1 operation is inconsistent.", error);
        }
    }

    private static void VerifyAttestedBytes(CanonicalRecipeOperation operation, JsonElement member)
    {
        RequireOriginal(operation.RecipeId == member.GetProperty("recipeId").GetGuid()
            && operation.OperationId == member.GetProperty("operationId").GetGuid()
            && operation.CreatedAt == member.GetProperty("createdAt").GetDateTimeOffset()
            && operation.InputHash == member.GetProperty("operationInputHash").GetString()
            && member.GetProperty("version").GetInt32() == 1 && member.GetProperty("kind").GetString() == "edit"
            && operation.OriginalRequest is not null);
        static void Exact(string raw, JsonElement expected)
        {
            var bytes = new UTF8Encoding(false, true).GetBytes(raw);
            RequireOriginal(bytes.Length == expected.GetProperty("byteCount").GetInt32()
                && Convert.ToHexStringLower(SHA256.HashData(bytes)) == expected.GetProperty("sha256").GetString());
        }
        var artifacts = member.GetProperty("rawArtifacts");
        Exact(operation.OriginalRequest!, artifacts[0]);
        var request = ReadOriginal<OriginalRequest>(operation.OriginalRequest!);
        RequireOriginal(request.Input is not null);
        Exact(request.Input!, artifacts[1]);
        Exact(operation.Result, artifacts[2]); // PostgreSQL result::text, never reserialized
        var baseline = member.GetProperty("baseline");
        RequireOriginal(request.BaselineHash == baseline.GetProperty("storedHash").GetString()
            && request.ExpectedContentRevision == baseline.GetProperty("contentRevision").GetString()
            && request.ExpectedSourceRevision == baseline.GetProperty("sourceRevision").GetString()
            && Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(request.Baseline.CanonicalContent!)))
                == baseline.GetProperty("canonicalContentUtf8Sha256").GetString());
    }

    private static JsonElement ReadAttestedInput(string raw, JsonElement allowed)
    {
        using var document = JsonDocument.Parse(raw);
        var actual = new List<string>();
        void Inspect(JsonElement value, string path)
        {
            if (value.ValueKind == JsonValueKind.Object)
            {
                var names = new Dictionary<string, JsonElement>(StringComparer.Ordinal);
                foreach (var property in value.EnumerateObject())
                {
                    if (!names.TryAdd(property.Name, property.Value))
                    {
                        RequireOriginal(property.Name == "kind" && names[property.Name].GetRawText() == property.Value.GetRawText());
                        actual.Add(path);
                    }
                    Inspect(property.Value, path + "/" + property.Name);
                }
            }
            else if (value.ValueKind == JsonValueKind.Array)
            {
                var index = 0;
                foreach (var child in value.EnumerateArray()) Inspect(child, path + "/" + index++);
            }
        }
        Inspect(document.RootElement, "input");
        var expected = allowed.EnumerateArray().Select(x =>
        {
            RequireOriginal(x.GetProperty("duplicateKey").GetString() == "kind" && x.GetProperty("sameValue").GetBoolean());
            return x.GetProperty("path").GetString()!;
        }).ToArray();
        RequireOriginal(actual.Order(StringComparer.Ordinal).SequenceEqual(expected.Order(StringComparer.Ordinal)));
        return document.RootElement.Clone();
    }

    private static CanonicalRecipeWriteResult PrepareAttestedEditV1(CanonicalRecipeContent current, UpdateRecipeDto input,
        Func<Guid> newId, Func<string> newRevision, CanonicalRecipeContent recorded)
    {
        var created = new Dictionary<string, Guid>(StringComparer.Ordinal);
        var lines = input.IngredientLines.ValueKind == JsonValueKind.Undefined ? current.IngredientLines
            : input.IngredientLines.EnumerateArray().Select(raw =>
            {
                var row = raw.Deserialize<RecipeIngredientLineInput>(Json)!;
                var old = row.Id is { } saved ? current.IngredientLines.SingleOrDefault(x => x.Id == saved)
                    ?? throw new ArgumentException("Ingredient does not belong to this recipe.") : null;
                if (old is not null && (row.Shopping.FoodId != old.Shopping.FoodId || row.Shopping.MappingRevision != old.Shopping.MappingRevision))
                    throw new ArgumentException("Shopping association changes require qualified mapping validation.");
                if (old is null && row.Shopping.FoodId is not null)
                    throw new ArgumentException("New food mappings require qualified mapping validation.");
                // Literal package facts need no registry. A declared definition
                // may only retain its exact previously saved unit at that path.
                if (row.Unit?.DefinitionId is not null && row.Unit != old?.Unit ||
                    row.Package?.CountUnit.DefinitionId is not null && row.Package.CountUnit != old?.Package?.CountUnit ||
                    row.Package?.Capacity.Unit.DefinitionId is not null && row.Package.Capacity.Unit != old?.Package?.Capacity.Unit)
                    throw new ArgumentException("New unit/package definitions require qualified definition validation.");
                var savedId = old?.Id ?? newId();
                if (row.ClientId is { } clientId) created.Add(clientId, savedId);
                return new RecipeIngredientLineDto
                {
                    Id = savedId,
                    Description = row.Description,
                    Amount = row.Amount,
                    AmountText = row.AmountText,
                    Unit = row.Unit,
                    Scaling = row.Scaling,
                    Package = row.Package,
                    Shopping = row.Shopping,
                    Provenance = old is not null && SameFacts(old, row) ? old.Provenance
                        : new("human", old?.Provenance.SourceRef, ProtectedFacts)
                };
            }).ToArray();
        var sections = input.InstructionSections.ValueKind == JsonValueKind.Undefined
            ? current.InstructionSections
            : EditSections(current, input.InstructionSections, created, newId, newRevision);
        var content = current with
        {
            ContentRevision = newRevision(),
            Servings = input.HasServings ? input.Servings : current.Servings,
            IngredientLines = lines,
            InstructionSections = sections
        };
        var revalidated = CookingStepProjection.Revalidate(current, content);
        return new CanonicalRecipeWriteResult(CookingStepRelationshipProducer.DiscoverRecorded(revalidated, current, recorded), created);
    }

}
