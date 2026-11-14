using System.Text.Json;
using RecipeApi.Models;

namespace RecipeApi.Services;

public static partial class FoodVocabularyInventoryQualification
{
    public static byte[] MergeHistoryObservations(params byte[][] packages)
    {
        FoodVocabularyDefinitions.Require(packages is not null && packages.Length > 0 && packages.All(x => x is not null));
        var contexts = packages.SelectMany(ReadHistoryObservations).ToArray();
        ValidateObservationCompatibility(contexts);
        var observations = packages.SelectMany(bytes => ReadObservation<FoodVocabularyHistoryObservationsV1>(System.Text.Encoding.UTF8.GetString(bytes)).Observations)
            .DistinctBy(x => (x.Context.ContextId, x.OwnerKind, x.OwnerKey, x.RawSha256))
            .OrderBy(x => x.Context.ContextId, StringComparer.Ordinal).ThenBy(x => x.OwnerKind, StringComparer.Ordinal)
            .ThenBy(x => x.OwnerKey, StringComparer.Ordinal).ThenBy(x => x.RawSha256, StringComparer.Ordinal).ToArray();
        var result = JsonSerializer.SerializeToUtf8Bytes(new FoodVocabularyHistoryObservationsV1(1, observations), HistoryJson);
        _ = ReadHistoryObservations(result);
        return result;
    }

    private static void ValidateObservationCompatibility(IReadOnlyList<FoodVocabularyContextFacts> contexts)
    {
        static string? JsonValue(string? raw) => raw is null ? null : CanonicalRecipeContentStore.NormalizeJson(raw);
        static string Shape(object value) => JsonSerializer.Serialize(value, HistoryJson);
        static void Consistent<T, TKey>(IEnumerable<T> rows, Func<T, TKey> identity, Func<T, object> immutable,
            params Func<T, string?>[] progression)
        {
            foreach (var group in rows.GroupBy(identity))
            {
                FoodVocabularyDefinitions.Require(group.Select(x => Shape(immutable(x))).Distinct(StringComparer.Ordinal).Count() == 1);
                foreach (var observe in progression)
                    FoodVocabularyDefinitions.Require(group.Select(observe).Where(x => x is not null).Distinct(StringComparer.Ordinal).Count() <= 1);
            }
        }
        var facts = contexts.Select(x => x.Facts).ToArray();
        Consistent(facts.SelectMany(x => x.CanonicalOperations), x => (x.RecipeId, x.OperationId), x => new
        { x.InputHash, OriginalRequest = JsonValue(x.OriginalRequest), Result = JsonValue(x.Result), x.CreatedAt });
        Consistent(facts.SelectMany(x => x.Publications), x => (x.RecipeId, x.OperationId), x => new
        { x.InputHash, Payload = JsonValue(x.Payload), x.ResultHash, x.CreatedAt });
        Consistent(facts.SelectMany(x => x.History.Launches), x => x.Id, x => new
        { Request = JsonValue(x.Request), x.RequestHash, x.CreatedAt }, x => x.PreparedHash, x => JsonValue(x.Prepared));
        Consistent(facts.SelectMany(x => x.History.Children), x => x.Id, x => new
        { x.ParentTaskId, Request = JsonValue(x.Request), x.RequestHash, x.CreatedAt }, x => x.PreparedHash, x => JsonValue(x.Prepared));
        Consistent(facts.SelectMany(x => x.History.Resets), x => x.Id, x => new
        { x.TaskId, x.InstanceId, Request = JsonValue(x.Request), x.RequestHash, x.CreatedAt });
        Consistent(facts.SelectMany(x => x.History.Attempts), x => x.Id, x => new
        { x.TaskId, x.InstanceId, Request = JsonValue(x.Request), x.RequestHash, x.CreatedAt }, x => x.OutcomeHash, x => JsonValue(x.Outcome));
        Consistent(facts.SelectMany(x => x.History.Retirements), x => x.Id, x => new
        { x.OperationId, x.Disposition, Payload = JsonValue(x.Payload), x.PayloadHash, x.CreatedAt });
        Consistent(facts.SelectMany(x => x.History.Repairs), x => x.Id, x => new
        { x.RecipeId, Payload = JsonValue(x.Payload), x.InputHash, x.CreatedAt });
        Consistent(facts.SelectMany(x => x.History.PhysicalRetirements), x => x.RecipeId, x => new
        { x.OperationId, x.Kind, Payload = JsonValue(x.Payload), x.PayloadHash, x.RecipeHash, x.CreatedAt });
        Consistent(facts.SelectMany(x => x.History.MaintenanceRetirements), x => (x.Id, x.Disposition), x => new
        { x.OperationId, Payload = JsonValue(x.Payload), x.PayloadHash, x.CreatedAt });
        Consistent(facts.SelectMany(x => x.History.StagedJournals), x => (x.RecipeId, x.OperationId, x.InputHash),
            x => new { Bytes = Convert.ToBase64String(x.RawBytes) });
        Consistent(facts.SelectMany(x => x.History.Commands), x => x.Id, x => new
        { x.CommandType, Payload = JsonValue(x.Payload), x.RequestedBy, x.CreatedAt });
        Consistent(facts.SelectMany(x => x.History.Instances), x => x.Id, x => new
        { x.WorkflowId, Parameters = JsonValue(x.Parameters), Capture = JsonValue(x.RecipePublicationCapture), x.CreatedAt });
        Consistent(facts.SelectMany(x => x.History.Instances).SelectMany(x => x.Tasks), x => x.TaskId, x => new
        { x.InstanceId, x.TaskName, x.ProcessorName, Payload = JsonValue(x.Payload), x.DependsOn, x.CreatedAt });
        var overrides = facts.SelectMany(x => x.Overrides.Rows ?? []).ToArray();
        Consistent(overrides, x => x.Id, x => new { x.FoodId, x.FallbackKey, x.CreatedAt });
        Consistent(overrides, x => (x.Id, x.Revision), x => x);
    }
}
