using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using RecipeApi.Dto;
using RecipeApi.Models;

namespace RecipeApi.Services;

internal static partial class GroceryRowState
{
    internal static object ItemInput(GroceryItemMutationDto request) => request.ExpectedPresentationEpoch is null
        ? new { kind = "item", rowId = request.RowId!.Value.ToString("D"), request.WeekStartDate, request.ExpectedRowVersion, request.Checked }
        : new { kind = "item", rowId = request.RowId!.Value.ToString("D"), request.WeekStartDate, request.ExpectedRowVersion, request.Checked, request.ExpectedPresentationEpoch };

    internal static object BulkInput(GroceryBulkMutationDto request)
    {
        var ordered = request.Checks!.OrderBy(x => x.Key, StringComparer.Ordinal).ToDictionary(x => x.Key, x => x.Value, StringComparer.Ordinal);
        return request.ExpectedPresentationEpoch is null
            ? new { kind = "bulk", request.WeekStartDate, request.ExpectedListVersion, checks = ordered }
            : new { kind = "bulk", request.WeekStartDate, request.ExpectedListVersion, checks = ordered, request.ExpectedPresentationEpoch };
    }

    internal static string InputHash(object input) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(input))));

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
        Require(retained.Version == 2 && !string.IsNullOrEmpty(retained.Input)
            && Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(retained.Input))) == record.InputHash,
            "Captured grocery mutation input does not match its immutable hash.");
        var result = FoodVocabularyDefinitions.ReadStrict<GroceryMutationResult>(retained.Result.GetRawText());
        var input = FoodVocabularyDefinitions.ReadStrict<JsonElement>(retained.Input);
        return (result, input);
    }

    private static void Require(bool valid, string message)
    {
        if (!valid) throw new InvalidDataException(message);
    }
}
