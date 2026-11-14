using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Services;

// These are captured facts, not executable recovery instructions. Recovery must
// separately invalidate old continuations and rebuild derived work before release.
public sealed record CurrentRecoveryTask(Guid TaskId, Guid InstanceId, string TaskName, string ProcessorName,
    JsonElement? Payload, TaskStatus Status, string[] DependsOn, int RetryCount, DateTimeOffset? ScheduledAt,
    string? ErrorMessage, string? StackTrace, JsonElement? Result, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record CurrentRecoveryWorkflow(Guid Id, string WorkflowId, WorkflowStatus Status,
    Dictionary<string, string>? Parameters, string LaunchDisposition, string? RecipePublicationCapture, DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt, CurrentRecoveryTask[] Tasks);
public sealed record CurrentRecoveryMutationResult(DateTimeOffset UpdatedAt, DateOnly WeekStartDate,
    string ListVersion, Dictionary<string, bool> Checks, CurrentRecoveryGroceryRow[] Rows,
    string? RowId = null, string? RowVersion = null, bool? Checked = null);
public sealed record CurrentRecoveryGroceryMutation(Guid Id, string InputHash, DateOnly WeekStartDate,
    CurrentRecoveryMutationResult Outcome);
public sealed record CurrentRecoveryCanonicalOperation(Guid RecipeId, Guid OperationId, string InputHash,
    CanonicalRecipeWriteResult Result, DateTimeOffset CreatedAt,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? OriginalRequest = null);
public sealed record CurrentRecoveryFilePublication(Guid RecipeId, Guid OperationId, string InputHash,
    string Payload, string ResultHash, bool Delivered, DateTimeOffset CreatedAt);
public sealed record CurrentRecoveryDerivedState(Guid RecipeId, string DocumentText, JsonElement SearchMetadata,
    string? EmbeddingJson, string EmbeddingModel, string? EmbeddingVersion, string IndexStatus,
    string EmbeddingStatus, string? EmbeddingFingerprint, DateTimeOffset? LastIndexedAt,
    string? SourceFingerprint, int SchemaVersion);
public sealed record CurrentRecoveryObligations(int Version, CurrentRecoveryWorkflow[] Workflows,
    CurrentRecoveryGroceryMutation[] GroceryMutations, CurrentRecoveryCanonicalOperation[] CanonicalOperations,
    CurrentRecoveryFilePublication[] FilePublications, CurrentRecoveryDerivedState[] DerivedState);

public sealed partial class CurrentRecoveryHouseholdState
{
    public CurrentRecoveryObligations ReadObligations() => Read<CurrentRecoveryObligations>("durable-obligations");

    private void ValidateObligations(CurrentRecoveryRecipes recipes, List<CurrentRecoveryDiagnostic> errors, CancellationToken ct)
    {
        static void Check([DoesNotReturnIf(false)] bool value) { if (!value) throw new InvalidDataException(); }
        static bool Text(string? value) => !string.IsNullOrWhiteSpace(value);
        static bool Hash(string? value) => value is { Length: 64 } && value.All(Uri.IsHexDigit);
        static bool Chronology(DateTimeOffset created, DateTimeOffset updated) => created != default && updated >= created;
        static ulong Version(string value) => ulong.Parse(value, CultureInfo.InvariantCulture);
        try
        {
            var value = ReadObligations();
            Check(value.Version == 1 && value.Workflows is not null && value.GroceryMutations is not null
                && value.CanonicalOperations is not null && value.FilePublications is not null && value.DerivedState is not null);
            var recipeIds = recipes.RecipeIds.ToHashSet();
            var workflows = new Dictionary<Guid, CurrentRecoveryWorkflow>();
            var tasks = new Dictionary<Guid, CurrentRecoveryTask>();
            foreach (var workflow in value.Workflows)
            {
                ct.ThrowIfCancellationRequested();
                Check(workflow is not null && workflow.Id != Guid.Empty && workflows.TryAdd(workflow.Id, workflow)
                    && Text(workflow.WorkflowId) && Enum.IsDefined(workflow.Status) && Chronology(workflow.CreatedAt, workflow.UpdatedAt)
                    && workflow.LaunchDisposition is "captured" or "historical-inert" or "invalidated"
                    && workflow.Tasks is not null && (workflow.Parameters is null
                        || workflow.Parameters.All(x => Text(x.Key) && x.Value is not null)));
                // Retention never turns missing historical capture into execution
                // authority. Preserve original status, payloads, results and intent.
                if (workflow.LaunchDisposition == "historical-inert")
                    Check(workflow.Status is WorkflowStatus.Completed or WorkflowStatus.Failed);
                if (workflow.Parameters?.TryGetValue("recipeId", out var recipe) == true)
                    Check(Guid.TryParse(recipe, out var id) && recipeIds.Contains(id));
                var names = new Dictionary<string, CurrentRecoveryTask>(StringComparer.Ordinal);
                foreach (var task in workflow.Tasks)
                {
                    Check(task is not null && task.TaskId != Guid.Empty && tasks.TryAdd(task.TaskId, task)
                        && task.InstanceId == workflow.Id && Text(task.TaskName) && names.TryAdd(task.TaskName, task)
                        && Text(task.ProcessorName) && Enum.IsDefined(task.Status) && task.RetryCount >= 0
                        && Chronology(task.CreatedAt, task.UpdatedAt) && task.CreatedAt >= workflow.CreatedAt
                        && task.DependsOn is not null && task.DependsOn.All(Text)
                        && task.DependsOn.Distinct(StringComparer.Ordinal).Count() == task.DependsOn.Length
                        && task.ScheduledAt != default(DateTimeOffset));
                    // A completed workflow cannot certify outstanding/failed tasks.
                    if (workflow.Status == WorkflowStatus.Completed) Check(task.Status == TaskStatus.Completed);
                }
                // Iterative topological validation keeps large retained workflows
                // from overflowing the call stack. Names are local to this workflow.
                var remaining = names.ToDictionary(x => x.Key, x => x.Value.DependsOn.Length, StringComparer.Ordinal);
                var dependants = names.Keys.ToDictionary(x => x, _ => new List<string>(), StringComparer.Ordinal);
                foreach (var task in workflow.Tasks)
                    foreach (var dependency in task.DependsOn)
                    {
                        Check(dependants.TryGetValue(dependency, out var children));
                        children.Add(task.TaskName);
                    }
                var ready = new Queue<string>(remaining.Where(x => x.Value == 0).Select(x => x.Key));
                var visited = 0;
                while (ready.TryDequeue(out var name))
                {
                    ct.ThrowIfCancellationRequested(); visited++;
                    foreach (var child in dependants[name]) if (--remaining[child] == 0) ready.Enqueue(child);
                }
                Check(visited == names.Count);
                RecipeFilePublicationStore.ValidateRecoveryLaunch(new WorkflowInstance
                {
                    Id = workflow.Id,
                    WorkflowId = workflow.WorkflowId,
                    Parameters = workflow.Parameters is null ? null : JsonSerializer.Serialize(workflow.Parameters),
                    RecipePublicationCapture = workflow.RecipePublicationCapture,
                    Tasks = workflow.Tasks.Select(x => new WorkflowTask
                    {
                        TaskId = x.TaskId,
                        InstanceId = x.InstanceId,
                        TaskName = x.TaskName,
                        ProcessorName = x.ProcessorName,
                        Payload = x.Payload?.GetRawText(),
                        DependsOn = x.DependsOn
                    }).ToArray()
                }, retainUncaptured: workflow.LaunchDisposition != "captured");
            }
            ValidateRecoveryProcessorLinks(workflows, recipeIds, ct);
            // Do not consult live membership to repair a dangling archived report.
            if (!errors.Any(x => x.Path == _paths["recipe-import-reports"]))
                foreach (var report in ReadReports().Where(x => x.LastWorkflowInstanceId is not null))
                {
                    Check(workflows.TryGetValue(report.LastWorkflowInstanceId!.Value, out var workflow)
                        && workflow.Parameters is not null && workflow.Parameters.TryGetValue("recipeId", out var recipe)
                        && Guid.TryParse(recipe, out var id) && id == report.RecipeId);
                    // Report status and workflow completion are independent captured
                    // facts: a crash can occur before the report is reconciled.
                }
            if (!errors.Any(x => x.Path == _paths["weekly-plans"]))
                foreach (var plan in ReadPlans())
                {
                    if (plan.ServingRefreshWorkflowId is { } id)
                    {
                        Check(workflows.TryGetValue(id, out var workflow) && workflow.WorkflowId == "supper-grocery-refresh"
                            && workflow.Parameters is not null && workflow.Parameters.TryGetValue("weekStartDate", out var week)
                            && week == plan.WeekStartDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
                            && workflow.Tasks.Any(x => x.ProcessorName == "RefreshSupperGroceries"
                                && x.Payload is { ValueKind: JsonValueKind.Object } payload
                                && payload.TryGetProperty("weekStartDate", out var target) && target.ValueKind == JsonValueKind.String
                                && target.GetString() == week));
                    }
                    if (plan.ServingRefreshStatus == "current") Check(plan.ServingInputVersion is not null
                        && plan.ServingAppliedVersion == plan.ServingInputVersion);
                    if (plan.ServingRefreshStatus is "updating" or "failed") Check(plan.ServingInputVersion is not null
                        && plan.ServingRefreshWorkflowId is not null);
                    // Completed dispatch/task status cannot fill ServingAppliedVersion.
                    // Retain pending divergence even when its old worker is terminal.
                }
            var plansByWeek = errors.Any(x => x.Path == _paths["weekly-plans"]) ? null
                : ReadPlans().ToDictionary(x => x.WeekStartDate);
            var mutationIds = new HashSet<Guid>();
            foreach (var mutation in value.GroceryMutations)
            {
                ct.ThrowIfCancellationRequested();
                Check(mutation is not null && mutation.Id != Guid.Empty && mutationIds.Add(mutation.Id) && Hash(mutation.InputHash)
                    && mutation.WeekStartDate != default && mutation.WeekStartDate.DayOfWeek == DayOfWeek.Monday);
                var outcome = mutation.Outcome;
                Check(outcome is not null && outcome.UpdatedAt != default && outcome.WeekStartDate == mutation.WeekStartDate
                    && GroceryRowState.IsVersion(outcome.ListVersion) && outcome.Rows is not null && outcome.Checks is not null);
                var rows = new Dictionary<string, CurrentRecoveryGroceryRow>(StringComparer.Ordinal);
                foreach (var row in outcome.Rows)
                {
                    Check(row is not null && Guid.TryParseExact(row.RowId, "D", out var id) && id != Guid.Empty
                        && rows.TryAdd(row.RowId, row) && GroceryRowState.IsVersion(row.RowVersion)
                        && Version(row.RowVersion) <= Version(outcome.ListVersion)
                        && row.WeekStartDate == outcome.WeekStartDate && row.Source == "recipe" && Text(row.DemandIdentity)
                        && Text(row.DisplayName) && Text(row.NormalizedKey) && GrocerySections.IsCanonicalName(row.Section)
                        && (row.Quantity is null || LegacyGroceryQuantity.IsCanonical(row.Quantity))
                        && row.RecipeIds is { Length: > 0 } && row.RecipeIds.Distinct().Count() == row.RecipeIds.Length
                        && row.RecipeIds.All(recipeIds.Contains));
                }
                Check(outcome.Checks.Keys.All(rows.ContainsKey));
                if (outcome.RowId is null) Check(outcome.RowVersion is null && outcome.Checked is null);
                else Check(rows.TryGetValue(outcome.RowId, out var row) && outcome.RowVersion == row.RowVersion
                    && outcome.Checked is not null && outcome.Checked == outcome.Checks.GetValueOrDefault(outcome.RowId));
                // This is the committed replay response, not today's plan. Rows may
                // have disappeared or changed meaning since it was acknowledged.
                if (plansByWeek is not null)
                {
                    var plan = plansByWeek.GetValueOrDefault(mutation.WeekStartDate);
                    Check(plan is not null && Version(outcome.ListVersion) <= Version(plan.GroceryListVersion));
                    if (outcome.ListVersion == plan.GroceryListVersion)
                        Check(plan.LegacyGrocery is null
                            && CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(outcome.Rows, Json))
                                == CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(plan.GroceryItems, Json))
                            && CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(outcome.Checks, Json))
                                == CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(plan.GroceryState, Json)));
                }
            }
            var operations = new HashSet<(Guid, Guid)>();
            foreach (var operation in value.CanonicalOperations)
            {
                ct.ThrowIfCancellationRequested();
                Check(operation is not null && recipeIds.Contains(operation.RecipeId) && operation.OperationId != Guid.Empty
                    && operations.Add((operation.RecipeId, operation.OperationId)) && Hash(operation.InputHash)
                    && operation.CreatedAt != default && operation.Result is { Content: not null, CreatedIds: not null });
                // Validate the saved historical result independently; it may precede
                // the current content revision, and is never a replacement authority.
                RecipeExportContent.WriteCurrent(new(operation.RecipeId, operation.Result.Content, null));
                var resultIds = operation.Result.Content.IngredientLines.Select(x => x.Id)
                    .Concat(operation.Result.Content.InstructionSections.Select(x => x.Id))
                    .Concat(operation.Result.Content.InstructionSections.SelectMany(x => x.Steps).Select(x => x.Id)).ToHashSet();
                Check(operation.Result.CreatedIds.All(x => Text(x.Key) && resultIds.Contains(x.Value))
                    && operation.Result.CreatedIds.Values.Distinct().Count() == operation.Result.CreatedIds.Count);
                // Preserve absent historical authority; present originals must
                // qualify through the same pure owner as committed replay.
                CanonicalRecipeContentStore.ValidateOriginalOperation(new CanonicalRecipeOperation
                {
                    RecipeId = operation.RecipeId,
                    OperationId = operation.OperationId,
                    InputHash = operation.InputHash,
                    Result = JsonSerializer.Serialize(operation.Result, Json),
                    OriginalRequest = operation.OriginalRequest,
                    CreatedAt = operation.CreatedAt
                });
                var current = recipes.ReadContent(operation.RecipeId);
                if (operation.Result.Content.ContentRevision == current.Content.ContentRevision)
                    RecipeExportContent.IsIdenticalCurrent(new(operation.RecipeId, operation.Result.Content, current.RawMetadata), current);
            }
            var bootstrapWorkflows = workflows.ToDictionary(x => x.Key, x => new WorkflowInstance
            {
                Id = x.Value.Id,
                WorkflowId = x.Value.WorkflowId,
                Status = x.Value.Status,
                Parameters = x.Value.Parameters is null ? null : JsonSerializer.Serialize(x.Value.Parameters),
                RecipePublicationCapture = x.Value.RecipePublicationCapture,
                Tasks = x.Value.Tasks.Select(task => new WorkflowTask
                {
                    TaskId = task.TaskId,
                    InstanceId = task.InstanceId,
                    TaskName = task.TaskName,
                    ProcessorName = task.ProcessorName,
                    Payload = task.Payload?.GetRawText(),
                    DependsOn = task.DependsOn,
                    Status = task.Status
                }).ToArray()
            });
            var publications = new HashSet<(Guid, Guid)>();
            var linkedPublications = new Dictionary<Guid, RecipeFilePublication>();
            foreach (var publication in value.FilePublications)
            {
                ct.ThrowIfCancellationRequested();
                Check(publication is not null && recipeIds.Contains(publication.RecipeId) && publication.OperationId != Guid.Empty
                    && publications.Add((publication.RecipeId, publication.OperationId)) && Hash(publication.InputHash)
                    && Hash(publication.ResultHash) && publication.CreatedAt != default && Text(publication.Payload));
                var producer = RecipeFilePublicationStore.ValidateRecoveryJournal(new RecipeFilePublication
                {
                    RecipeId = publication.RecipeId,
                    OperationId = publication.OperationId,
                    InputHash = publication.InputHash,
                    Payload = publication.Payload,
                    ResultHash = publication.ResultHash,
                    CreatedAt = publication.CreatedAt,
                    Delivered = publication.Delivered
                });
                if (tasks.TryGetValue(publication.OperationId, out var task))
                {
                    var workflow = workflows[task.InstanceId];
                    Check(workflow.Parameters is not null && workflow.Parameters.TryGetValue("recipeId", out var recipe)
                        && Guid.TryParse(recipe, out var id) && id == publication.RecipeId
                        && producer == task.ProcessorName + "\n" + CanonicalRecipeContentStore.NormalizeJson(task.Payload?.GetRawText()));
                    linkedPublications.Add(publication.OperationId, new RecipeFilePublication
                    {
                        RecipeId = publication.RecipeId,
                        OperationId = publication.OperationId,
                        InputHash = publication.InputHash,
                        Payload = publication.Payload,
                        ResultHash = publication.ResultHash,
                        Delivered = publication.Delivered,
                        CreatedAt = publication.CreatedAt
                    });
                }
                RecipeFilePublicationStore.ValidateRecoveryBootstrapIntent(new RecipeFilePublication
                {
                    RecipeId = publication.RecipeId,
                    OperationId = publication.OperationId,
                    InputHash = publication.InputHash,
                    Payload = publication.Payload,
                    ResultHash = publication.ResultHash,
                    Delivered = publication.Delivered,
                    CreatedAt = publication.CreatedAt
                }, bootstrapWorkflows);
                RecipeFilePublicationStore.ValidateRecoveryFollowupIntent(new RecipeFilePublication
                {
                    RecipeId = publication.RecipeId,
                    OperationId = publication.OperationId,
                    InputHash = publication.InputHash,
                    Payload = publication.Payload,
                    ResultHash = publication.ResultHash,
                    Delivered = publication.Delivered,
                    CreatedAt = publication.CreatedAt
                }, bootstrapWorkflows);
                // Delivered means selected files arrived, never extraction, indexing,
                // report repair or the workflow as a whole completed.
            }
            foreach (var workflow in value.Workflows)
                RecipeFilePublicationStore.ValidateRecoveryPublicationChain(new WorkflowInstance
                {
                    RecipePublicationCapture = workflow.RecipePublicationCapture,
                    Tasks = workflow.Tasks.Select(x => new WorkflowTask { TaskId = x.TaskId }).ToArray()
                }, linkedPublications);
            var derivedIds = new HashSet<Guid>();
            foreach (var derived in value.DerivedState)
            {
                ct.ThrowIfCancellationRequested();
                Check(derived is not null && recipeIds.Contains(derived.RecipeId) && derivedIds.Add(derived.RecipeId)
                    && derived.DocumentText is not null && derived.SearchMetadata.ValueKind == JsonValueKind.Object
                    && Text(derived.EmbeddingModel) && derived.IndexStatus is "pending" or "indexing" or "ready" or "failed"
                    && derived.EmbeddingStatus is "pending" or "indexing" or "ready" or "failed" && derived.SchemaVersion > 0
                    && derived.LastIndexedAt != default(DateTimeOffset));
                if (derived.EmbeddingJson is not null)
                {
                    var vector = JsonSerializer.Deserialize<float[]>(derived.EmbeddingJson);
                    Check(vector is { Length: 1536 } && vector.All(float.IsFinite));
                }
                if (derived.EmbeddingStatus == "ready") Check(derived.EmbeddingJson is not null && Text(derived.EmbeddingFingerprint));
            }
        }
        catch (Exception ex) when (ex is JsonException or InvalidDataException or ArgumentException or OverflowException
            or InvalidOperationException or KeyNotFoundException or FormatException)
        { errors.Add(new(_paths["durable-obligations"], "invalid-current-durable-obligations")); }
    }
}
