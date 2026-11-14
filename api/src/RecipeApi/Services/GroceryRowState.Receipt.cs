using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

internal static partial class GroceryRowState
{
    private sealed record CapturedMutation(int Version, string Input, JsonElement Result);

    internal static string SerializeCapturedOutcome(GroceryMutationResult outcome, object input)
    {
        using var result = JsonDocument.Parse(SerializeOutcome(outcome));
        return JsonSerializer.Serialize(new CapturedMutation(2, JsonSerializer.Serialize(input), result.RootElement.Clone()),
            new JsonSerializerOptions(JsonSerializerDefaults.Web));
    }

    internal static (GroceryMutationResult Result, JsonElement? Input) ReadCapturedOutcome(GroceryMutationOutcome record)
    {
        using var document = JsonDocument.Parse(record.Outcome);
        if (!document.RootElement.TryGetProperty("version", out _))
            return (JsonSerializer.Deserialize<GroceryMutationResult>(record.Outcome) ?? throw new InvalidDataException("Missing grocery mutation result."), null);
        var retained = FoodVocabularyDefinitions.ReadStrict<CapturedMutation>(record.Outcome);
        CanonicalRecipeMigrationManifest.Require(retained.Version == 2 && !string.IsNullOrEmpty(retained.Input)
            && Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(retained.Input))) == record.InputHash,
            "Captured grocery mutation input does not match its immutable hash.");
        var result = FoodVocabularyDefinitions.ReadStrict<GroceryMutationResult>(retained.Result.GetRawText());
        var input = FoodVocabularyDefinitions.ReadStrict<JsonElement>(retained.Input);
        return (result, input);
    }
}
