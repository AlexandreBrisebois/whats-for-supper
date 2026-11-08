using System.Text.Json;
using System.Text.Json.Serialization;
using RecipeApi.Dto;

namespace RecipeApi.Services;

/// <summary>
/// Validates the staged canonical wire contract before the activation fence.
/// This boundary does not allocate saved IDs, convert legacy rows or publish content.
/// </summary>
internal static class RecipeContentInput
{
    private static readonly JsonSerializerOptions Strict = new()
    {
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        PropertyNameCaseInsensitive = false,
    };

    public static void Validate(UpdateRecipeDto input)
    {
        if (!input.HasCanonicalContent) return;
        if (input.Ingredients is not null || input.RecipeInstructions is not null)
            throw Invalid();
        var savedIds = new HashSet<Guid>();
        var clientIds = new HashSet<string>(StringComparer.Ordinal);
        if (input.IngredientLines.ValueKind != JsonValueKind.Undefined)
        {
            RequireArray(input.IngredientLines);
            foreach (var raw in input.IngredientLines.EnumerateArray())
            {
                Identity(raw, savedIds, clientIds);
                RecipeIngredientLineInput line;
                try { line = raw.Deserialize<RecipeIngredientLineInput>(Strict) ?? throw Invalid(); }
                catch (JsonException) { throw Invalid(); }
                Facts(line);
            }
        }
        if (input.InstructionSections.ValueKind != JsonValueKind.Undefined)
        {
            RequireArray(input.InstructionSections);
            foreach (var section in input.InstructionSections.EnumerateArray())
            {
                Identity(section, savedIds, clientIds);
                Properties(section, ["id", "clientId", "name", "steps"], ["name", "steps"]);
                if (section.GetProperty("name").ValueKind is not (JsonValueKind.Null or JsonValueKind.String)) throw Invalid();
                var steps = section.GetProperty("steps");
                RequireArray(steps);
                foreach (var step in steps.EnumerateArray())
                {
                    Identity(step, savedIds, clientIds);
                    Properties(step, ["id", "clientId", "text"], ["text"]);
                    if (step.GetProperty("text").ValueKind != JsonValueKind.String) throw Invalid();
                }
            }
        }
    }

    internal static void Facts(RecipeIngredientFactsDto line)
    {
        if (string.IsNullOrWhiteSpace(line.Description) || line.Scaling is not ("proportional" or "fixed")
            || line.Shopping is null || string.IsNullOrWhiteSpace(line.Shopping.Name)
            || line.Shopping.FoodId == Guid.Empty
            || (line.Shopping.FoodId is null) != (line.Shopping.MappingRevision is null)
            || line.Shopping.MappingRevision is not null && string.IsNullOrWhiteSpace(line.Shopping.MappingRevision)) throw Invalid();
        Quantity(line.Amount, line.AmountText);
        Unit(line.Unit);
        if (line.Package is { } package)
        {
            if (package.CountUnit is null || package.Capacity is null || package.Capacity.Unit is null
                || package.Capacity.Amount is null || package.Basis is not ("net" or "drained" or "unspecified")) throw Invalid();
            Unit(package.CountUnit);
            Unit(package.Capacity.Unit);
            Quantity(package.Capacity.Amount, null);
        }
    }

    private static void Quantity(GroceryQuantity? amount, string? notation)
    {
        if (amount is null)
        {
            if (notation is not null) throw Invalid();
        }
        else if (!LegacyGroceryQuantity.IsCanonical(amount)
            || notation is not null && LegacyGroceryQuantity.Parse(notation) != amount) throw Invalid();
    }

    private static void Unit(RecipeUnitDto? unit)
    {
        if (unit is not null && (string.IsNullOrWhiteSpace(unit.Text)
            || unit.DefinitionId is not null && string.IsNullOrWhiteSpace(unit.DefinitionId))) throw Invalid();
    }

    private static void Identity(JsonElement row, HashSet<Guid> savedIds, HashSet<string> clientIds)
    {
        if (row.ValueKind != JsonValueKind.Object) throw Invalid();
        var hasId = row.TryGetProperty("id", out var id);
        var hasClientId = row.TryGetProperty("clientId", out var clientId);
        if (hasId == hasClientId) throw Invalid();
        if (hasId)
        {
            if (id.ValueKind != JsonValueKind.String || !id.TryGetGuid(out var savedId)
                || savedId == Guid.Empty || !savedIds.Add(savedId)) throw Invalid();
        }
        else if (clientId.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(clientId.GetString())
            || clientId.GetString()!.Length > 128 || !clientIds.Add(clientId.GetString()!)) throw Invalid();
    }

    private static void Properties(JsonElement value, string[] allowed, string[] required)
    {
        if (value.ValueKind != JsonValueKind.Object || value.EnumerateObject().Any(x => !allowed.Contains(x.Name))
            || required.Any(x => !value.TryGetProperty(x, out _))) throw Invalid();
    }

    private static void RequireArray(JsonElement value)
    {
        if (value.ValueKind != JsonValueKind.Array) throw Invalid();
    }

    private static ArgumentException Invalid() => new("Invalid canonical recipe content. No fields were saved.");
}
