using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Infrastructure;

namespace RecipeApi.Services;

// Canonical facts own reads and guarded edits after explicit forward conversion.
// Legacy reads and ordinary edits never trigger conversion implicitly.
public sealed record StructuredRecipeContent(
    int ContentSchemaVersion, string ContentRevision, string SourceRevision, int? Servings,
    IReadOnlyList<RecipeIngredientLineDto> IngredientLines,
    IReadOnlyList<RecipeInstructionSectionDto> InstructionSections);

public sealed record StructuredRecipeExport(Guid RecipeId, StructuredRecipeContent Content, string? RawMetadata);

public sealed record StructuredRecipeWriteResult(StructuredRecipeContent Content, IReadOnlyDictionary<string, Guid> CreatedIds);

public sealed partial class StructuredRecipeContentStore(RecipeDbContext db, IClock clock, SupperProjectionInvalidation invalidation, FoodVocabularyStore vocabulary, IValidationService? validation = null)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly string[] ProtectedFacts = ["description", "amount", "amountText", "unit", "scaling", "package", "shopping"];

    public static string InspectContentRevision(Recipe recipe) => Read(recipe)?.ContentRevision ?? RecipeContentRevision.Legacy(recipe);
    public static string InspectSourceRevision(Recipe recipe) => Read(recipe)?.SourceRevision ?? "source." + Hash(new { recipe.SourceUrl, Source = NormalizeJson(recipe.RawMetadata) });
    public static StructuredRecipeContent? Read(Recipe recipe) => recipe.CanonicalContent is null ? null
        : JsonSerializer.Deserialize<StructuredRecipeContent>(recipe.CanonicalContent, Json)
            ?? throw new InvalidDataException("Invalid saved canonical recipe content.");

    // This is preparation for a witnessed new source, not conversion of a saved
    // legacy or human-owned recipe. The publication owner still guards membership.
    internal static StructuredRecipeExport PrepareFreshSource(Guid id, string normalizedJson, string? sourceUrl)
    {
        var parsed = RecipeExtractionParser.ParseAndNormalize(normalizedJson);
        if (!parsed.IsSemanticallyComplete || parsed.Recipe?.RecipeIngredient is null)
            throw new InvalidDataException("Fresh source needs complete ingredient and step text.");
        var (content, _) = FromSchemaOrg(id, normalizedJson, sourceUrl, authority: null, origin: "source");
        return new StructuredRecipeExport(id, content, normalizedJson);
    }

    // A reported correction selects saved human wording from the guarded launch,
    // never a second provider response or today's mutable recipe row.
    internal static StructuredRecipeExport PrepareReviewedSource(RecipePublicationFields saved)
    {
        if (saved.Ingredients is null || saved.RawMetadata is null || saved.CanonicalContent is not null || saved.IsReady)
            throw new InvalidDataException("Reviewed source needs captured editable content.");
        var raw = JsonNode.Parse(saved.RawMetadata) as JsonObject
            ?? throw new InvalidDataException("Reviewed source metadata is invalid.");
        raw["recipeIngredient"] = JsonSerializer.SerializeToNode(RecipeService.DeserializeIngredients(saved.Ingredients));
        if (!string.IsNullOrWhiteSpace(saved.Name)) raw["name"] = saved.Name;
        var prepared = PrepareFreshSource(saved.Id, raw.ToJsonString(), saved.SourceUrl);
        var lines = prepared.Content.IngredientLines.Select(line => line with
        {
            Provenance = new("human", prepared.Content.SourceRevision, ProtectedFacts)
        }).ToArray();
        var result = prepared with { Content = prepared.Content with { IngredientLines = lines } };
        ValidateContent(result.Content, rawMetadata: result.RawMetadata);
        return result;
    }

    public Task<StructuredRecipeWriteResult> ConvertAsync(Guid id, string expectedContentRevision,
        string expectedSourceRevision, Guid operationId, CancellationToken ct = default)
        => ConvertCoreAsync(id, expectedContentRevision, expectedSourceRevision, operationId, ct);

    // The migration caller rebuilds every week synchronously. The same converter
    // and V2 replay owner run without scheduling redundant refresh workflows.
    private async Task<StructuredRecipeWriteResult> ConvertCoreAsync(Guid id, string expectedContentRevision,
        string expectedSourceRevision, Guid operationId, CancellationToken ct,
        Func<CancellationToken, Task>? migrationAdmission = null, StructuredRecipeOperation? prepared = null)
    {
        if (migrationAdmission is not null) await migrationAdmission(ct);
        RequireOperation(operationId);
        var hash = Hash(new { Kind = "convert", expectedContentRevision, expectedSourceRevision });
        var before = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (await Replay(id, operationId, hash, before, ct) is { } historical) return historical;
        var authority = await vocabulary.CaptureAuthorityAsync(before.FoodMappingEvidence, ct);
        await using var transaction = await RecipeRotation.LockAsync(db, id, ct, lockSupperInputs: true);
        var recipe = await db.Recipes.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (migrationAdmission is not null) await migrationAdmission(ct);
        if (await Replay(id, operationId, hash, recipe, ct) is { } replay) return replay;
        Guard(recipe, expectedContentRevision, expectedSourceRevision);
        if (EvidenceValue(recipe) != EvidenceValue(before)) throw Conflict(recipe);
        await vocabulary.ValidateLiveAuthorityAsync(authority, ct);
        var result = await ApplyPreparedConversionAsync(recipe, authority, operationId, hash, prepared,
            deferGroceryRefresh: migrationAdmission is not null, ct);
        if (migrationAdmission is not null) await migrationAdmission(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return result;
    }

    public async Task<StructuredRecipeWriteResult> EditAsync(Guid id, string expectedSourceRevision, Guid operationId,
        UpdateRecipeDto input, CancellationToken ct = default)
    {
        RequireOperation(operationId);
        ValidateEditInput(input);
        var hash = Hash(new { Kind = "edit", expectedSourceRevision, Input = input });
        var before = await db.Recipes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (await Replay(id, operationId, hash, before, ct) is { } historical) return historical;
        var authority = await vocabulary.CaptureAuthorityAsync(before.FoodMappingEvidence, ct);
        await using var transaction = await RecipeRotation.LockAsync(db, id, ct, lockSupperInputs: true);
        var recipe = await db.Recipes.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (await Replay(id, operationId, hash, recipe, ct) is { } replay) return replay;
        Guard(recipe, input.ExpectedContentRevision, expectedSourceRevision);
        if (EvidenceValue(recipe) != EvidenceValue(before)) throw Conflict(recipe);
        await vocabulary.ValidateLiveAuthorityAsync(authority, ct);
        var baseline = Observe(recipe);
        var priorEvidence = EvidenceValue(recipe);
        var current = Read(recipe) ?? throw Conflict(recipe);
        var prepared = PrepareEditV2(current, input, Guid.NewGuid, NewRevision);
        var mapped = FoodMappingQualification.Prepare(new(id, prepared.Content, recipe.RawMetadata), authority, operationId, current, priorEvidence);
        var result = prepared with { Content = mapped.Export.Content };
        var content = result.Content;
        // No tracked mutation occurs above this point; invalid membership/guards cannot partially save.
        RecipeService.ApplyEditableDetailFields(recipe, input, validation ?? new ValidationService());
        recipe.FoodMappingEvidence = mapped.Evidence;
        recipe.CanonicalContent = JsonSerializer.Serialize(content, Json);
        recipe.Ingredients = JsonSerializer.Serialize(content.IngredientLines.Select(Render));
        recipe.Servings = content.Servings;
        recipe.UpdatedAt = clock.UtcNow;
        RecordV2(recipe, operationId, "edit", hash, baseline, priorEvidence, authority, input, result, recipe.FoodMappingEvidence);
        await Invalidate(recipe, ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return result;
    }

    private static void ValidateEditInput(UpdateRecipeDto input)
    {
        RecipeContentInput.Validate(input);
        if (input.Ingredients is not null || input.RecipeInstructions is not null ||
            input.HasServings && input.Servings is not > 0)
            throw new ArgumentException("Unsupported internal canonical edit fields.");
    }

    private static StructuredRecipeWriteResult PrepareEdit(StructuredRecipeContent current, UpdateRecipeDto input,
        Func<Guid> newId, Func<string> newRevision)
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
        return new StructuredRecipeWriteResult(CookingStepRelationshipProducer.Discover(revalidated, current), created);
    }

    private static StructuredRecipeWriteResult PrepareEditV2(StructuredRecipeContent current, UpdateRecipeDto input,
        Func<Guid> newId, Func<string> newRevision, StructuredRecipeContent? recordedResult = null)
    {
        var created = new Dictionary<string, Guid>(StringComparer.Ordinal);
        var lines = input.IngredientLines.ValueKind == JsonValueKind.Undefined ? current.IngredientLines
            : input.IngredientLines.EnumerateArray().Select(raw =>
            {
                var row = raw.Deserialize<RecipeIngredientLineInput>(Json)!;
                var old = row.Id is { } saved ? current.IngredientLines.SingleOrDefault(x => x.Id == saved)
                    ?? throw new ArgumentException("Ingredient does not belong to this recipe.") : null;
                if (old is not null && row.Shopping.FoodId is not null && (row.Shopping.FoodId != old.Shopping.FoodId || row.Shopping.MappingRevision != old.Shopping.MappingRevision))
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
        return new StructuredRecipeWriteResult(recordedResult is null
            ? CookingStepRelationshipProducer.Discover(revalidated, current)
            : CookingStepRelationshipProducer.DiscoverRecorded(revalidated, current, recordedResult), created);
    }

    private static bool SameFacts(RecipeIngredientLineDto saved, RecipeIngredientLineInput input) =>
        saved.Description == input.Description && saved.Amount == input.Amount && saved.AmountText == input.AmountText &&
        saved.Unit == input.Unit && saved.Scaling == input.Scaling && saved.Package == input.Package && saved.Shopping == input.Shopping;

    private static IReadOnlyList<RecipeInstructionSectionDto> EditSections(StructuredRecipeContent current, JsonElement input,
        Dictionary<string, Guid> created, Func<Guid> newId, Func<string> newRevision) => input.EnumerateArray().Select(section =>
    {
        var old = section.TryGetProperty("id", out var saved) ? current.InstructionSections.SingleOrDefault(x => x.Id == saved.GetGuid())
            ?? throw new ArgumentException("Section does not belong to this recipe.") : null;
        var id = old?.Id ?? newId();
        if (old is null) created.Add(section.GetProperty("clientId").GetString()!, id);
        var steps = section.GetProperty("steps").EnumerateArray().Select(step =>
        {
            var prior = step.TryGetProperty("id", out var stepId) ? current.InstructionSections.SelectMany(x => x.Steps)
                .SingleOrDefault(x => x.Id == stepId.GetGuid()) ?? throw new ArgumentException("Step does not belong to this recipe.") : null;
            var nextId = prior?.Id ?? newId();
            if (prior is null) created.Add(step.GetProperty("clientId").GetString()!, nextId);
            var text = step.GetProperty("text").GetString()!;
            return new RecipeInstructionStepDto(nextId, text, prior?.Text == text ? prior.TextRevision : newRevision(), prior?.Bindings ?? []);
        }).ToArray();
        return new RecipeInstructionSectionDto(id, section.GetProperty("name").GetString(), steps);
    }).ToArray();

    private sealed record SourceSupplyObservation(string Name, string? UnitText, GroceryQuantity? Quantity);

    private static IReadOnlyList<RecipeIngredientLineDto> ConvertLines(Recipe recipe, Func<Guid> newId)
    {
        var texts = RecipeService.DeserializeIngredients(recipe.Ingredients);
        // An explicit current empty array is authoritative over retained supply.
        if (texts.Count == 0 && recipe.Ingredients is not null) return [];
        var observations = ReadSourceSupplyObservations(recipe);
        if (observations.Count != texts.Count) throw new InvalidDataException("Legacy conversion requires explicit reconciliation.");
        return texts.Select((text, index) =>
        {
            if (string.IsNullOrWhiteSpace(text)) throw new InvalidDataException("Legacy conversion requires explicit reconciliation.");
            var observation = observations[index]; // Same captured collection, not identity matching across revisions.
            var amount = observation.Quantity;
            string? notation = null;
            var description = text;
            RecipeUnitDto? unit = null;
            if (amount is not null)
            {
                // A proved unique source association is necessary but not sufficient.
                // Split only a losslessly representable exact prefix; never scan arbitrary prose.
                var suffix = string.IsNullOrWhiteSpace(observation.UnitText) ? observation.Name : $"{observation.UnitText} {observation.Name}";
                if (!text.EndsWith(" " + suffix, StringComparison.Ordinal) ||
                    QuantityMath.Parse(text[..^(suffix.Length + 1)]) != amount)
                    throw new InvalidDataException("Trusted legacy facts cannot be represented losslessly; conversion deferred.");
                notation = text[..^(suffix.Length + 1)];
                description = observation.Name;
                unit = string.IsNullOrWhiteSpace(observation.UnitText) ? null : new(observation.UnitText, null);
            }
            else if (!string.IsNullOrWhiteSpace(observation.UnitText))
            {
                if (text != $"{observation.UnitText} {observation.Name}")
                    throw new InvalidDataException("Trusted unit cannot be represented losslessly; conversion deferred.");
                description = observation.Name;
                unit = new(observation.UnitText, null);
            }
            var row = new RecipeIngredientLineDto
            {
                Id = newId(),
                Description = description,
                Amount = amount,
                AmountText = notation,
                Unit = unit,
                Scaling = "proportional",
                Package = null,
                Shopping = new(observation.Name, null, null),
                Provenance = new("unknown", null, ProtectedFacts)
            };
            if (Render(row) != text) throw new InvalidDataException("Legacy wording needs explicit reconciliation.");
            return row;
        }).ToArray();
    }

    private static List<SourceSupplyObservation> ReadSourceSupplyObservations(Recipe recipe)
    {
        var ingredients = RecipeService.DeserializeIngredients(recipe.Ingredients ?? "[]");
        using var metadata = Metadata(recipe.RawMetadata);
        var root = metadata?.RootElement;
        var source = root is { ValueKind: JsonValueKind.Object } value &&
            (value.TryGetProperty("recipeIngredient", out var retained) || value.TryGetProperty("ingredients", out retained))
            && retained.ValueKind == JsonValueKind.Array ? retained : default;
        var supply = root is { ValueKind: JsonValueKind.Object } data && data.TryGetProperty("supply", out var supplies)
            && supplies.ValueKind == JsonValueKind.Array ? supplies : default;
        if (recipe.Ingredients is null && source.ValueKind == JsonValueKind.Array && source.EnumerateArray().All(x => x.ValueKind == JsonValueKind.String))
            ingredients = source.EnumerateArray().Select(x => x.GetString()!).ToList();
        var coherent = source.ValueKind == JsonValueKind.Array && source.GetArrayLength() == ingredients.Count
            && source.EnumerateArray().Select(x => x.ValueKind == JsonValueKind.String ? x.GetString()?.Trim() : null)
                .SequenceEqual(ingredients.Select(x => x.Trim()), StringComparer.Ordinal);
        if (ingredients.Count == 0 && supply.ValueKind == JsonValueKind.Array)
            ingredients = supply.EnumerateArray().Select(x => Text(x, "name")).Where(x => x is not null).Select(x => x!).ToList();
        var bindings = coherent ? BindSupplies(ingredients, supply) : new Dictionary<int, JsonElement>();
        var result = new List<SourceSupplyObservation>(ingredients.Count);
        for (var index = 0; index < ingredients.Count; index++)
        {
            var text = ingredients[index];
            var item = bindings.GetValueOrDefault(index);
            var name = Text(item, "name") ?? text;
            var required = item.ValueKind == JsonValueKind.Object && item.TryGetProperty("requiredQuantity", out var nested) ? nested : default;
            var unit = Text(item, "unitText") ?? Text(required, "unitText");
            var retainedToken = NumericToken(item, "quantity") ?? NumericToken(required, "value");
            var quantity = bindings.ContainsKey(index) ? ObserveBoundSourceQuantity(text, name, unit, retainedToken) : null;
            result.Add(new SourceSupplyObservation(name, unit, quantity));
        }
        return result;
    }

    private static Dictionary<int, JsonElement> BindSupplies(List<string> ingredients, JsonElement supply)
    {
        if (supply.ValueKind != JsonValueKind.Array) return [];
        var entries = supply.EnumerateArray().ToArray();
        var normalized = ingredients.Select(NormalizeName).ToArray();
        var candidates = entries.Select(entry =>
        {
            var name = Text(entry, "name");
            if (string.IsNullOrWhiteSpace(name)) return Array.Empty<int>();
            var pattern = @"(?<![\p{L}\p{M}\p{N}])" + Regex.Escape(NormalizeName(name)) + @"(?![\p{L}\p{M}\p{N}])";
            return Enumerable.Range(0, normalized.Length).Where(i => Regex.IsMatch(normalized[i], pattern, RegexOptions.CultureInvariant)).ToArray();
        }).ToArray();
        var result = new Dictionary<int, JsonElement>();
        for (var i = 0; i < entries.Length; i++)
        {
            if (candidates[i].Length != 1) continue;
            var line = candidates[i][0];
            if (candidates.Count(matches => matches.Contains(line)) == 1) result[line] = entries[i];
        }
        return result;
    }

    private static GroceryQuantity? ObserveBoundSourceQuantity(string currentIngredient, string name, string? unit, string? retainedNumberToken)
    {
        var text = NormalizeWhitespace(currentIngredient);
        var suffix = NormalizeWhitespace(string.IsNullOrWhiteSpace(unit) ? name : $"{unit} {name}");
        var source = text.EndsWith(" " + suffix, StringComparison.OrdinalIgnoreCase)
            ? QuantityMath.Parse(text[..^(suffix.Length + 1)]) : null;
        source ??= ReadQualifiedSource(text, name, unit);
        if (source is null && retainedNumberToken is not null)
        {
            var token = double.TryParse(retainedNumberToken, System.Globalization.CultureInfo.InvariantCulture, out var parsedNumber) && parsedNumber == 0
                ? "0" : retainedNumberToken;
            source = QuantityMath.Parse(token);
        }
        return source;
    }

    private static GroceryQuantity? ReadQualifiedSource(string text, string name, string? unit)
    {
        if (text.Length > 256 || string.IsNullOrWhiteSpace(unit) || string.IsNullOrWhiteSpace(name)) return null;
        const string preparation = @"(?:(?:finely |roughly )?(?:chopped|diced|sliced|minced)|haché[es]?|émincé[es]?)";
        var description = @"^(?:" + preparation + @" )?" + Regex.Escape(NormalizeWhitespace(name))
            + @"(?:, " + preparation + @")?$";
        for (var amountEnd = text.IndexOf(' '); amountEnd > 0; amountEnd = text.IndexOf(' ', amountEnd + 1))
        {
            var amount = QuantityMath.Parse(text[..amountEnd]);
            if (amount is null) continue;
            var remainder = text[(amountEnd + 1)..];
            for (var unitEnd = remainder.IndexOf(' '); unitEnd > 0; unitEnd = remainder.IndexOf(' ', unitEnd + 1))
            {
                if (GroceryUnit.Read(remainder[..unitEnd]) == GroceryUnit.Read(unit)
                    && Regex.IsMatch(remainder[(unitEnd + 1)..], description, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
                    return amount;
            }
        }
        return null;
    }

    private static string NormalizeWhitespace(string text) => Regex.Replace(text.Normalize(NormalizationForm.FormC), @"\s+", " ").Trim();

    private static string NormalizeName(string text) => Regex.Replace(text.Normalize(NormalizationForm.FormC).ToUpperInvariant(), @"\s+", " ").Trim();

    private static JsonDocument? Metadata(string? raw)
    {
        try { return string.IsNullOrWhiteSpace(raw) ? null : JsonDocument.Parse(raw); }
        catch (JsonException) { return null; }
    }

    private static string? Text(JsonElement item, string key)
        => item.ValueKind == JsonValueKind.Object && item.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String
            ? string.IsNullOrWhiteSpace(value.GetString()) ? null : value.GetString() : null;

    private static string? NumericToken(JsonElement item, string key) =>
        item.ValueKind == JsonValueKind.Object && item.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.Number
            ? value.GetRawText() : null;

    private static IReadOnlyList<RecipeInstructionSectionDto> ConvertInstructions(string? raw, Func<Guid> sectionId, Func<Guid> stepId, Func<string> textRevision)
    {
        if (string.IsNullOrWhiteSpace(raw)) return [];
        using var document = JsonDocument.Parse(raw);
        if (!document.RootElement.TryGetProperty("recipeInstructions", out var instructions) || instructions.ValueKind == JsonValueKind.Null) return [];
        var sections = new List<RecipeInstructionSectionDto>();
        var loose = new List<RecipeInstructionStepDto>();
        RecipeInstructionStepDto Step(JsonElement value) => new(stepId(), value.ValueKind == JsonValueKind.String ? value.GetString()!
            : value.TryGetProperty("text", out var text) && text.ValueKind == JsonValueKind.String ? text.GetString()!
            : throw new InvalidDataException("Unsupported legacy instruction; conversion deferred."), textRevision(), []);
        foreach (var value in instructions.ValueKind == JsonValueKind.Array ? instructions.EnumerateArray().ToArray() : new[] { instructions })
        {
            if (value.ValueKind == JsonValueKind.Object && value.TryGetProperty("itemListElement", out var children))
            {
                if (loose.Count > 0) { sections.Add(new(sectionId(), null, loose.ToArray())); loose.Clear(); }
                if (children.ValueKind != JsonValueKind.Array) throw new InvalidDataException("Unsupported legacy section.");
                sections.Add(new(sectionId(), value.TryGetProperty("name", out var name) ? name.GetString() : null,
                    children.EnumerateArray().Select(Step).ToArray()));
            }
            else loose.Add(Step(value));
        }
        if (loose.Count > 0) sections.Add(new(sectionId(), null, loose.ToArray()));
        return sections;
    }

    public static string Render(RecipeIngredientLineDto row)
    {
        var text = string.Join(" ", new[] { row.AmountText ?? Format(row.Amount), row.Unit?.Text, row.Description }.Where(x => x is not null));
        // Step projection requests only a measured quantity with an empty
        // description. Its numeric source span must never acquire a capacity.
        return string.IsNullOrEmpty(row.Description) ? text : DeclaredPackagePresentation.Append(text, row.Package);
    }
    internal static string? Format(GroceryQuantity? value) => value is null ? null : value.Kind == "scalar" ? Scalar(value.Value!) : $"{Scalar(value.Min!)}–{Scalar(value.Max!)}";
    private static string Scalar(GroceryRational value) => value.D == "1" ? value.N : $"{value.N}/{value.D}";
    private static string NewRevision() => Guid.NewGuid().ToString("N");
    private static void RequireOperation(Guid id) { if (id == Guid.Empty) throw new ArgumentException("Operation ID is required."); }
    private static RecipeContentConflictException Conflict(Recipe recipe) => new(InspectContentRevision(recipe), false);
    private static void Guard(Recipe recipe, string? content, string source)
    {
        if (content != InspectContentRevision(recipe) || source != InspectSourceRevision(recipe)) throw Conflict(recipe);
    }
    private async Task<StructuredRecipeWriteResult?> Replay(Guid id, Guid operation, string hash, Recipe recipe, CancellationToken ct)
    {
        var previous = await db.CanonicalRecipeOperations.AsNoTracking().SingleOrDefaultAsync(x => x.RecipeId == id && x.OperationId == operation, ct);
        if (previous is null) return null;
        if (IsV2(previous)) return ReplayV2(previous, hash, recipe);
        if (previous.InputHash != hash) throw Conflict(recipe);
        ValidateOriginalOperation(previous);
        return JsonSerializer.Deserialize<StructuredRecipeWriteResult>(previous.Result, Json) ?? throw new InvalidDataException("Invalid canonical replay.");
    }
    private void Record(Guid id, Guid operation, string hash, StructuredRecipeWriteResult result, string originalRequest) => db.CanonicalRecipeOperations.Add(new()
    {
        RecipeId = id,
        OperationId = operation,
        InputHash = hash,
        OriginalRequest = originalRequest,
        Result = JsonSerializer.Serialize(result, Json),
        CreatedAt = clock.UtcNow
    });
    private async Task Invalidate(Recipe recipe, CancellationToken ct, bool deferGroceryRefresh = false)
    {
        var sidecar = await db.RecipeSearchDocuments.FindAsync([recipe.Id], ct);
        if (sidecar is null) db.RecipeSearchDocuments.Add(new RecipeSearchDocument
        {
            RecipeId = recipe.Id,
            DocumentText = "",
            SearchMetadata = "{}",
            IndexStatus = "pending",
            EmbeddingStatus = "pending",
            EmbeddingModel = Environment.GetEnvironmentVariable("EMBEDDING_MODEL_ID") ?? "gemini-embedding-2",
            SchemaVersion = RecipeSearchDocumentBuilder.CurrentSchemaVersion
        });
        else { sidecar.IndexStatus = "pending"; sidecar.EmbeddingStatus = "pending"; sidecar.EmbeddingFingerprint = null; }
        await db.SaveChangesAsync(ct);
        if (!deferGroceryRefresh) await invalidation.EnlistRecipeAsync(recipe.Id, ct);
    }
    internal static string NormalizeJson(string? value)
    {
        if (value is null) return "null";
        using var document = JsonDocument.Parse(value);
        object? Sort(JsonElement element) => element.ValueKind switch
        {
            JsonValueKind.Object => element.EnumerateObject().OrderBy(x => x.Name, StringComparer.Ordinal).ToDictionary(x => x.Name, x => Sort(x.Value)),
            JsonValueKind.Array => element.EnumerateArray().Select(Sort).ToArray(),
            _ => element.Clone()
        };
        return JsonSerializer.Serialize(Sort(document.RootElement));
    }
    private static string Hash<T>(T value) => Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(value, Json)));
}
