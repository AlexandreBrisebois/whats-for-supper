using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Text.Json.Serialization;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed record RecipePublicationFields(Guid Id, string? Name, string? Description, string? Notes,
    RecipeRating Rating, Guid? AddedBy, string? SourceUrl, string? Ingredients, string? RawMetadata,
    string? CanonicalContent, int? Servings, string? Category, string? CuisineType, string[]? MealTypes,
    string? TotalTime, int ImageCount, int FinishedDishIndex, bool IsSynthesized, bool IsReady,
    bool IsDiscoverable, bool RotationHumanOff, string RotationSource, bool CookedSuppressed,
    bool? SupperSuitable, bool? IsVegetarian, DateTimeOffset? DeletedAt, Guid? DeletedBy,
    string? DeleteNote, DateTimeOffset? LastCookedDate);

public sealed partial class StructuredRecipeContentStore
{
    internal static RecipePublicationFields Observe(Recipe recipe)
    {
        static string? JsonValue(string? value) => value is null ? null : NormalizeJson(value);
        return new(recipe.Id, recipe.Name, recipe.Description, recipe.Notes, recipe.Rating, recipe.AddedBy,
            recipe.SourceUrl, JsonValue(recipe.Ingredients), JsonValue(recipe.RawMetadata), JsonValue(recipe.CanonicalContent),
            recipe.Servings, recipe.Category, recipe.CuisineType, recipe.MealTypes?.ToArray(), recipe.TotalTime,
            recipe.ImageCount, recipe.FinishedDishIndex, recipe.IsSynthesized, recipe.IsReady, recipe.IsDiscoverable,
            recipe.RotationHumanOff, recipe.RotationSource, recipe.CookedSuppressed, recipe.SupperSuitable,
            recipe.IsVegetarian, recipe.DeletedAt, recipe.DeletedBy, recipe.DeleteNote, recipe.LastCookedDate);
    }

    internal static Recipe RestoreObservation(RecipePublicationFields value) => new()
    {
        Id = value.Id,
        Name = value.Name,
        Description = value.Description,
        Notes = value.Notes,
        Rating = value.Rating,
        AddedBy = value.AddedBy,
        SourceUrl = value.SourceUrl,
        Ingredients = value.Ingredients,
        RawMetadata = value.RawMetadata,
        CanonicalContent = value.CanonicalContent,
        Servings = value.Servings,
        Category = value.Category,
        CuisineType = value.CuisineType,
        MealTypes = value.MealTypes?.ToArray(),
        TotalTime = value.TotalTime,
        ImageCount = value.ImageCount,
        FinishedDishIndex = value.FinishedDishIndex,
        IsSynthesized = value.IsSynthesized,
        IsReady = value.IsReady,
        IsDiscoverable = value.IsDiscoverable,
        RotationHumanOff = value.RotationHumanOff,
        RotationSource = value.RotationSource,
        CookedSuppressed = value.CookedSuppressed,
        SupperSuitable = value.SupperSuitable,
        IsVegetarian = value.IsVegetarian,
        DeletedAt = value.DeletedAt,
        DeletedBy = value.DeletedBy,
        DeleteNote = value.DeleteNote,
        LastCookedDate = value.LastCookedDate
    };

    private static readonly JsonSerializerOptions OriginalJson = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = false,
        RespectRequiredConstructorParameters = true,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
    };
    private sealed record OriginalRequest(int Version, Guid RecipeId, Guid OperationId, string Kind,
        string ExpectedContentRevision, string ExpectedSourceRevision, string? Input, bool HasServings,
        RecipePublicationFields Baseline, string BaselineHash);

    private static string CaptureOriginal(Recipe recipe, Guid operationId, string kind, string content, string source, UpdateRecipeDto? input)
    {
        var baseline = Observe(recipe);
        return JsonSerializer.Serialize(new OriginalRequest(1, recipe.Id, operationId, kind, content, source,
            input is null ? null : JsonSerializer.Serialize(input, Json), input?.HasServings ?? false, baseline, Hash(baseline)), Json);
    }

    // Pure qualification of original request/baseline and the saved result. This
    // never consults today's recipe, dictionaries, providers or files. Missing
    // old authority remains absent and retains its original wire representation.
    internal static bool ValidateOriginalOperation(StructuredRecipeOperation operation)
    {
        if (operation.OriginalRequest is null) return false;
        if (IsV2(operation)) return ValidateOriginalOperationV2(operation);
        try
        {
            var request = ReadOriginal<OriginalRequest>(operation.OriginalRequest);
            RequireOriginal(request.Version == 1 && request.RecipeId == operation.RecipeId
                && request.OperationId == operation.OperationId && request.RecipeId != Guid.Empty
                && request.OperationId != Guid.Empty && request.Baseline is not null
                && request.Baseline.Id == request.RecipeId && request.BaselineHash == Hash(request.Baseline));
            var recipe = RestoreObservation(request.Baseline);
            // Check embedded original JSON before any permissive legacy parser.
            foreach (var raw in new[] { recipe.Ingredients, recipe.RawMetadata, recipe.CanonicalContent })
                if (raw is not null) ReadOriginal<JsonElement>(raw);
            RequireOriginal(InspectContentRevision(recipe) == request.ExpectedContentRevision
                && InspectSourceRevision(recipe) == request.ExpectedSourceRevision);
            var result = ReadOriginal<StructuredRecipeWriteResult>(operation.Result);
            RequireOriginal(result.Content is not null && result.CreatedIds is not null);
            ValidateContent(result.Content);
            var current = recipe.CanonicalContent is null ? null : ReadOriginal<StructuredRecipeContent>(recipe.CanonicalContent);
            if (current is not null) ValidateContent(current);
            StructuredRecipeWriteResult expected;
            string inputHash;
            if (request.Kind == "convert")
            {
                RequireOriginal(request.Input is null && !request.HasServings);
                var expectedContentRevision = request.ExpectedContentRevision;
                var expectedSourceRevision = request.ExpectedSourceRevision;
                inputHash = Hash(new { Kind = "convert", expectedContentRevision, expectedSourceRevision });
                if (current is not null) expected = new(current, new Dictionary<string, Guid>());
                else
                {
                    var lineIds = new Queue<Guid>(result.Content.IngredientLines.Select(x => x.Id));
                    var sectionIds = new Queue<Guid>(result.Content.InstructionSections.Select(x => x.Id));
                    var steps = result.Content.InstructionSections.SelectMany(x => x.Steps).ToArray();
                    var stepIds = new Queue<Guid>(steps.Select(x => x.Id));
                    var revisions = new Queue<string>(steps.Select(x => x.TextRevision));
                    expected = new(new(2, result.Content.ContentRevision, expectedSourceRevision, recipe.Servings,
                        ConvertLines(recipe, () => lineIds.Dequeue()),
                        ConvertInstructions(recipe.RawMetadata, () => sectionIds.Dequeue(), () => stepIds.Dequeue(), () => revisions.Dequeue())),
                        new Dictionary<string, Guid>());
                    RequireOriginal(lineIds.Count == 0 && sectionIds.Count == 0 && stepIds.Count == 0 && revisions.Count == 0);
                    RequireOriginal(result.Content.ContentRevision != request.ExpectedContentRevision);
                }
            }
            else if (request.Kind == "edit")
            {
                RequireOriginal(request.Input is not null && current is not null);
                var raw = ReadOriginal<JsonElement>(request.Input!);
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
                ValidateEditInput(input);
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
                expected = PrepareEdit(current, input, () => newIds.Dequeue(), () => revisions.Dequeue());
                RequireOriginal(newIds.Count == 0 && revisions.Count == 0);
            }
            else throw new InvalidDataException("Unsupported original canonical operation.");
            RequireOriginal(inputHash == operation.InputHash
                && NormalizeJson(JsonSerializer.Serialize(expected, Json)) == NormalizeJson(operation.Result));
            return true;
        }
        catch (Exception error) when (error is ArgumentException or InvalidOperationException or RecipeContentConflictException)
        {
            throw new InvalidDataException("Original canonical operation is inconsistent.", error);
        }
    }

    private static void RequireOriginal([DoesNotReturnIf(false)] bool condition)
    {
        if (!condition) throw new InvalidDataException("Original canonical operation is inconsistent.");
    }

    private static T ReadOriginal<T>(string raw)
    {
        using var document = JsonDocument.Parse(raw);
        void Unique(JsonElement element)
        {
            if (element.ValueKind == JsonValueKind.Object)
            {
                var names = new HashSet<string>(StringComparer.Ordinal);
                foreach (var property in element.EnumerateObject())
                {
                    RequireOriginal(names.Add(property.Name));
                    Unique(property.Value);
                }
            }
            else if (element.ValueKind == JsonValueKind.Array)
                foreach (var value in element.EnumerateArray()) Unique(value);
        }
        Unique(document.RootElement);
        return document.RootElement.Deserialize<T>(OriginalJson) ?? throw new InvalidDataException("Original canonical observation is absent.");
    }
}
