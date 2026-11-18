using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed record FoodVocabularyObservationContext(string ContextId, string Kind, Guid? SnapshotId,
    Guid? RecoveryOperationId, string? Generation);
public sealed record FoodVocabularyRetainedObservation(string OwnerKind, string OwnerKey, string RawSha256,
    string RawJson, FoodVocabularyObservationContext Context);
public sealed record FoodVocabularyHistoryObservationsV1(int Version, FoodVocabularyRetainedObservation[] Observations);
public sealed record FoodVocabularyContextFacts(FoodVocabularyObservationContext Context, FoodVocabularyInventoryFacts Facts);

public static partial class FoodVocabularyInventoryQualification
{
    private static readonly JsonSerializerOptions HistoryJson = new(FoodVocabularyDefinitions.Json)
    {
        NumberHandling = JsonNumberHandling.Strict
    };
    private static readonly string[] HistoryOwners = ["recipe", "canonical-operation", "publication", "workflow", "launch",
        "child", "reset", "processor-attempt", "workflow-retirement", "repair", "physical-retirement", "maintenance-retirement",
        "staged-journal", "household-override", "maintenance-command"];
    private sealed record HistoryHeader(int Version, FoodVocabularyMembershipObservation Membership,
        FoodVocabularyOverrideCoverage OverrideCoverage, Dictionary<string, int?> Counts);
    private sealed record TaskObservation(Guid TaskId, Guid InstanceId, string TaskName, string ProcessorName,
        string? Payload, Models.TaskStatus Status, string[] DependsOn, int RetryCount, DateTimeOffset? ScheduledAt,
        string? ErrorMessage, string? StackTrace, string? Result, Guid? ChildLaunchIntentId, Guid? ResetIntentId,
        DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt)
    {
        public WorkflowTask Restore() => new()
        {
            TaskId = TaskId,
            InstanceId = InstanceId,
            TaskName = TaskName,
            ProcessorName = ProcessorName,
            Payload = Payload,
            Status = Status,
            DependsOn = DependsOn,
            RetryCount = RetryCount,
            ScheduledAt = ScheduledAt,
            ErrorMessage = ErrorMessage,
            StackTrace = StackTrace,
            Result = Result,
            ChildLaunchIntentId = ChildLaunchIntentId,
            ResetIntentId = ResetIntentId,
            CreatedAt = CreatedAt,
            UpdatedAt = UpdatedAt
        };
    }
    private sealed record WorkflowObservation(Guid Id, string WorkflowId, WorkflowStatus Status, string? Parameters,
        string? RecipePublicationCapture, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt, TaskObservation[] Tasks)
    {
        public WorkflowInstance Restore() => new()
        {
            Id = Id,
            WorkflowId = WorkflowId,
            Status = Status,
            Parameters = Parameters,
            RecipePublicationCapture = RecipePublicationCapture,
            CreatedAt = CreatedAt,
            UpdatedAt = UpdatedAt,
            Tasks = RestoreTasks(Tasks)
        };
    }

    private static WorkflowTask[] RestoreTasks(TaskObservation[] tasks)
    {
        FoodVocabularyDefinitions.Require(tasks is not null && tasks.All(x => x is not null));
        return tasks.Select(x => x.Restore()).ToArray();
    }

    private static T ReadObservation<T>(string raw)
    {
        _ = FoodVocabularyDefinitions.ReadStrict<JsonElement>(raw);
        try { return JsonSerializer.Deserialize<T>(raw, HistoryJson) ?? throw new InvalidDataException("Observed facts are absent."); }
        catch (JsonException error) { throw new InvalidDataException("Observed facts are malformed.", error); }
    }

    public static byte[] WriteHistoryObservations(FoodVocabularyInventoryFacts facts, string kind, Guid? snapshotId,
        Guid? recoveryOperationId, string? generation)
    {
        _ = kind == "demo-destination" ? RequiredReferencesForDemoInvalidation(facts) : RequiredReferences(facts);
        var context = new FoodVocabularyObservationContext("", kind, snapshotId, recoveryOperationId, generation);
        var rows = new List<FoodVocabularyRetainedObservation>();
        void Add<T>(string owner, IEnumerable<T> values, Func<T, string> key, Func<T, object>? observe = null)
        {
            foreach (var value in values)
            {
                var raw = JsonSerializer.Serialize(observe is null ? value : observe(value), HistoryJson);
                rows.Add(new(owner, key(value), FoodVocabularyDefinitions.Sha256(Encoding.UTF8.GetBytes(raw)), raw, context));
            }
        }
        Add("recipe", facts.Recipes, x => x.RecipeId.ToString("D"));
        Add("canonical-operation", facts.CanonicalOperations, x => $"{x.RecipeId:D}/{x.OperationId:D}", x => new
        { x.RecipeId, x.OperationId, x.InputHash, x.OriginalRequest, x.Result, x.CreatedAt });
        Add("publication", facts.Publications, x => $"{x.RecipeId:D}/{x.OperationId:D}");
        Add("workflow", facts.History.Instances, x => x.Id.ToString("D"), x => new WorkflowObservation(x.Id, x.WorkflowId,
            x.Status, x.Parameters, x.RecipePublicationCapture, x.CreatedAt, x.UpdatedAt, x.Tasks.OrderBy(t => t.TaskId)
                .Select(t => new TaskObservation(t.TaskId, t.InstanceId, t.TaskName, t.ProcessorName, t.Payload, t.Status,
                    t.DependsOn.ToArray(), t.RetryCount, t.ScheduledAt, t.ErrorMessage, t.StackTrace, t.Result,
                    t.ChildLaunchIntentId, t.ResetIntentId, t.CreatedAt, t.UpdatedAt)).ToArray()));
        Add("launch", facts.History.Launches, x => x.Id.ToString("D"));
        Add("child", facts.History.Children, x => x.Id.ToString("D"));
        Add("reset", facts.History.Resets, x => x.Id.ToString("D"));
        Add("processor-attempt", facts.History.Attempts, x => x.Id.ToString("D"));
        Add("workflow-retirement", facts.History.Retirements, x => x.Id.ToString("D"));
        Add("repair", facts.History.Repairs, x => x.Id.ToString("D"));
        Add("physical-retirement", facts.History.PhysicalRetirements, x => x.RecipeId.ToString("D"));
        Add("maintenance-retirement", facts.History.MaintenanceRetirements, x => $"{x.Id:D}/{x.Disposition}");
        Add("maintenance-command", facts.History.Commands, x => x.Id.ToString("D"));
        Add("staged-journal", facts.History.StagedJournals, x => $"{x.RecipeId:D}/{x.OperationId:D}/{x.InputHash}");
        if (facts.Overrides.Rows is { } overrides) Add("household-override", overrides, x => x.Id.ToString("D"));
        var counts = HistoryOwners.ToDictionary(owner => owner, owner => owner == "household-override" && facts.Overrides.Rows is null
            ? (int?)null : rows.Count(x => x.OwnerKind == owner), StringComparer.Ordinal);
        var header = JsonSerializer.Serialize(new HistoryHeader(1, facts.Membership, facts.Overrides.Coverage, counts), HistoryJson);
        rows.Add(new("inventory", "facts", FoodVocabularyDefinitions.Sha256(Encoding.UTF8.GetBytes(header)), header, context));
        var sorted = SortObservations(rows);
        context = context with { ContextId = ContextHash(context, sorted) };
        ValidateContext(context);
        return JsonSerializer.SerializeToUtf8Bytes(new FoodVocabularyHistoryObservationsV1(1,
            sorted.Select(x => x with { Context = context }).ToArray()), HistoryJson);
    }

    public static IReadOnlyList<FoodVocabularyContextFacts> ReadHistoryObservations(byte[] rawBytes)
    {
        string text;
        try { text = new UTF8Encoding(false, true).GetString(rawBytes); }
        catch (DecoderFallbackException error) { throw new InvalidDataException("Observed facts are not valid UTF-8.", error); }
        var package = ReadObservation<FoodVocabularyHistoryObservationsV1>(text);
        FoodVocabularyDefinitions.Require(package.Version == 1 && package.Observations is not null && package.Observations.Length > 0
            && package.Observations.All(x => x is not null && x.Context is not null));
        var result = new List<FoodVocabularyContextFacts>();
        foreach (var group in package.Observations.GroupBy(x => x.Context.ContextId).OrderBy(x => x.Key, StringComparer.Ordinal))
        {
            var rows = SortObservations(group);
            var context = rows[0].Context;
            ValidateContext(context);
            FoodVocabularyDefinitions.Require(rows.All(x => x.Context == context) && ContextHash(context, rows) == context.ContextId
                && rows.Select(x => (x.OwnerKind, x.OwnerKey)).Distinct().Count() == rows.Length);
            foreach (var row in rows)
                FoodVocabularyDefinitions.Require(row.RawJson is not null && row.RawSha256 == FoodVocabularyDefinitions.Sha256(Encoding.UTF8.GetBytes(row.RawJson))
                    && (row.OwnerKind == "inventory" || HistoryOwners.Contains(row.OwnerKind, StringComparer.Ordinal)));
            var headers = rows.Where(x => x.OwnerKind == "inventory").ToArray();
            FoodVocabularyDefinitions.Require(headers.Length == 1 && headers[0].OwnerKey == "facts");
            var header = ReadObservation<HistoryHeader>(headers[0].RawJson);
            FoodVocabularyDefinitions.Require(header.Version == 1 && header.Membership is not null && header.Counts is not null
                && header.Counts.Keys.ToHashSet(StringComparer.Ordinal).SetEquals(HistoryOwners));
            foreach (var owner in HistoryOwners)
            {
                var expected = header.Counts[owner];
                FoodVocabularyDefinitions.Require(expected is >= 0 || owner == "household-override"
                    && header.OverrideCoverage == FoodVocabularyOverrideCoverage.LiveOwnerNotImplemented && expected is null);
                FoodVocabularyDefinitions.Require(rows.Count(x => x.OwnerKind == owner) == (expected ?? 0));
            }
            T[] Read<T>(string owner, string[] fields, Func<T, string> key)
            {
                return rows.Where(x => x.OwnerKind == owner).Select(row =>
                {
                    using var document = JsonDocument.Parse(row.RawJson);
                    FoodVocabularyDefinitions.Require(document.RootElement.ValueKind == JsonValueKind.Object
                        && fields.All(name => document.RootElement.TryGetProperty(name, out _)));
                    var value = ReadObservation<T>(row.RawJson);
                    FoodVocabularyDefinitions.Require(row.OwnerKey == key(value));
                    return value;
                }).ToArray();
            }
            var recipes = Read<FoodVocabularyRecipeObservation>("recipe", ["recipeId", "canonicalContent", "foodMappingEvidence"], x => x.RecipeId.ToString("D"));
            var operations = Read<CanonicalRecipeOperation>("canonical-operation", ["recipeId", "operationId", "inputHash", "originalRequest", "result", "createdAt"], x => $"{x.RecipeId:D}/{x.OperationId:D}");
            var publications = Read<RecipeFilePublication>("publication", ["recipeId", "operationId", "inputHash", "payload", "resultHash", "delivered", "createdAt"], x => $"{x.RecipeId:D}/{x.OperationId:D}");
            var workflows = Read<WorkflowObservation>("workflow", ["id", "workflowId", "status", "parameters", "recipePublicationCapture", "createdAt", "updatedAt", "tasks"], x => x.Id.ToString("D")).Select(x => x.Restore()).ToArray();
            var launches = Read<WorkflowLaunchIntent>("launch", ["id", "request", "requestHash", "prepared", "preparedHash", "acceptedAt", "createdAt"], x => x.Id.ToString("D"));
            var children = Read<WorkflowChildIntent>("child", ["id", "parentTaskId", "request", "requestHash", "prepared", "preparedHash", "acceptedAt", "createdAt"], x => x.Id.ToString("D"));
            var resets = Read<WorkflowResetIntent>("reset", ["id", "taskId", "instanceId", "request", "requestHash", "appliedAt", "createdAt"], x => x.Id.ToString("D"));
            var attempts = Read<WorkflowProcessorAttempt>("processor-attempt", ["id", "taskId", "instanceId", "request", "requestHash", "outcome", "outcomeHash", "observedAt", "createdAt"], x => x.Id.ToString("D"));
            var retirements = Read<WorkflowLifecycleRecord>("workflow-retirement", ["id", "operationId", "disposition", "payload", "payloadHash", "createdAt"], x => x.Id.ToString("D"));
            var repairs = Read<RecipeRepairIntent>("repair", ["id", "recipeId", "payload", "inputHash", "createdAt"], x => x.Id.ToString("D"));
            var physical = Read<RecipePhysicalDeletion>("physical-retirement", ["recipeId", "operationId", "kind", "payload", "payloadHash", "recipeHash", "filesRemoved", "createdAt", "filesDeliveredAt", "completedAt"], x => x.RecipeId.ToString("D"));
            var maintenance = Read<MaintenanceCommandLifecycleRecord>("maintenance-retirement", ["id", "operationId", "disposition", "payload", "payloadHash", "createdAt"], x => $"{x.Id:D}/{x.Disposition}");
            var stages = Read<FoodVocabularyStagedJournalObservation>("staged-journal", ["recipeId", "operationId", "inputHash", "rawBytes"], x => $"{x.RecipeId:D}/{x.OperationId:D}/{x.InputHash}");
            var commands = Read<MaintenanceCommandObservation>("maintenance-command",
                ["id", "commandType", "status", "payload", "result", "attempts", "requestedBy", "createdAt", "scheduledFor", "startedAt", "completedAt", "lastError"], x => x.Id.ToString("D"));
            var overrides = Read<FoodVocabularyScopedOverrideObservation>("household-override", ["id", "revision", "foodId", "dictionaryRevision", "document", "fallbackKey", "shoppingName", "grocerySection", "protectedFields", "presentationSequence", "createdAt", "updatedAt"], x => x.Id.ToString("D"));
            var facts = new FoodVocabularyInventoryFacts(header.Membership, recipes, operations, publications,
                new(workflows, launches, children, resets, attempts, retirements, repairs, physical, maintenance, stages, commands),
                new(header.OverrideCoverage, header.Counts["household-override"] is null ? null : overrides));
            var observed = new FoodVocabularyContextFacts(context, facts);
            _ = ContextReferences(observed);
            result.Add(observed);
        }
        return result;
    }

    private static FoodVocabularyRetainedObservation[] SortObservations(IEnumerable<FoodVocabularyRetainedObservation> rows) =>
        rows.OrderBy(x => x.OwnerKind, StringComparer.Ordinal).ThenBy(x => x.OwnerKey, StringComparer.Ordinal).ThenBy(x => x.RawSha256, StringComparer.Ordinal).ToArray();
    private static string ContextHash(FoodVocabularyObservationContext context, IReadOnlyList<FoodVocabularyRetainedObservation> rows) =>
        FoodVocabularyDefinitions.Sha256(JsonSerializer.SerializeToUtf8Bytes(new
        {
            context.Kind,
            context.SnapshotId,
            context.RecoveryOperationId,
            context.Generation,
            rows = rows.Select(x => new { x.OwnerKind, x.OwnerKey, x.RawSha256 })
        }, HistoryJson));
    private static void ValidateContext(FoodVocabularyObservationContext context)
    {
        FoodVocabularyDefinitions.Require(context.Kind is "snapshot" or "demo" or "destination" or "demo-destination"
            && (context.Kind is "destination" or "demo-destination" ? context.SnapshotId is null : context.SnapshotId is { } id && id != Guid.Empty)
            && context.RecoveryOperationId != Guid.Empty && (context.Generation is null || Guid.TryParseExact(context.Generation, "N", out var generation) && generation != Guid.Empty)
            && context.ContextId is { Length: 64 } && context.ContextId.All(c => c is >= '0' and <= '9' or >= 'a' and <= 'f'));
    }
}
