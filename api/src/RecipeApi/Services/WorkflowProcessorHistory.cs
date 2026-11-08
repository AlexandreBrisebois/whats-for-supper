using System.Security.Cryptography;
using System.Diagnostics.CodeAnalysis;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;

namespace RecipeApi.Services;

// Observations of an invocation, never an instruction to replay it. Original
// launch/publication owners remain the authority for content, source and delivery.
internal static class WorkflowProcessorHistory
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = false,
        RespectRequiredConstructorParameters = true,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
    };
    private sealed record TaskFacts(Guid TaskId, Guid InstanceId, string TaskName, string ProcessorName,
        string? Payload, Models.TaskStatus Status, string[] DependsOn, int RetryCount,
        DateTimeOffset? ScheduledAt, string? ErrorMessage, string? StackTrace, string? Result,
        Guid? ChildLaunchIntentId, Guid? ResetIntentId, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
    private sealed record Request(int Version, Guid Id, string WorkflowId, string? Parameters,
        string? Capture, WorkflowStatus ParentStatus, TaskFacts Task);
    // Nullable observations are required constructor fields: omission does not
    // prove that preparation/acceptance had not happened.
    private sealed record ChildFacts(Guid Id, Guid ParentTaskId, string Request, string RequestHash,
        string? Prepared, string? PreparedHash, DateTimeOffset? AcceptedAt, DateTimeOffset CreatedAt)
    {
        public WorkflowChildIntent Restore() => new()
        {
            Id = Id,
            ParentTaskId = ParentTaskId,
            Request = Request,
            RequestHash = RequestHash,
            Prepared = Prepared,
            PreparedHash = PreparedHash,
            AcceptedAt = AcceptedAt,
            CreatedAt = CreatedAt
        };
    }
    private sealed record Outcome(int Version, Guid Id, string RequestHash, string Disposition,
        bool ProcessorReturned, string? ReturnedResult, TaskFacts Task, Guid? SelectedChildLaunchIntentId,
        RecipeFilePublication[] Publications, CanonicalRecipeOperation[] CanonicalOperations,
        ChildFacts? ChildCommand = null);

    private static TaskFacts Observe(WorkflowTask task) => new(task.TaskId, task.InstanceId, task.TaskName,
        task.ProcessorName, task.Payload, task.Status, task.DependsOn, task.RetryCount, task.ScheduledAt,
        task.ErrorMessage, task.StackTrace, task.Result, task.ChildLaunchIntentId, task.ResetIntentId, task.CreatedAt, task.UpdatedAt);
    private static ChildFacts Observe(WorkflowChildIntent child) => new(child.Id, child.ParentTaskId,
        child.Request, child.RequestHash, child.Prepared, child.PreparedHash, child.AcceptedAt, child.CreatedAt);
    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(
        Encoding.UTF8.GetBytes(CanonicalRecipeContentStore.NormalizeJson(value))));

    // Enlists with the Pending -> Processing save. No processor runs until that
    // save is acknowledged. Unacknowledged admission remains an unresolved fact.
    public static WorkflowProcessorAttempt Begin(RecipeDbContext db, WorkflowTask task, WorkflowInstance parent, DateTimeOffset now)
    {
        var id = Guid.NewGuid();
        var request = JsonSerializer.Serialize(new Request(1, id, parent.WorkflowId, parent.Parameters,
            parent.RecipePublicationCapture, parent.Status, Observe(task)), Json);
        var attempt = new WorkflowProcessorAttempt
        {
            Id = id,
            TaskId = task.TaskId,
            InstanceId = task.InstanceId,
            Request = request,
            RequestHash = Hash(request),
            CreatedAt = now
        };
        db.WorkflowProcessorAttempts.Add(attempt);
        return attempt;
    }

    // Enlists with this task's completion/retry/failure save. The separately
    // returned value is explicit even when null; retained task.Result is not it.
    // These journal snapshots preserve original associations/receipts as observed,
    // without filling missing source/evidence/dictionary facts from today's recipe.
    public static async Task ObserveAsync(RecipeDbContext db, WorkflowProcessorAttempt attempt, WorkflowTask task,
        string disposition, bool processorReturned, string? returnedResult, DateTimeOffset now, CancellationToken ct)
    {
        if (attempt.Outcome is not null) throw new InvalidDataException("An observed processor outcome is immutable.");
        var child = await db.WorkflowTasks.AsNoTracking().Where(x => x.TaskId == task.TaskId)
            .Select(x => x.ChildLaunchIntentId).SingleAsync(ct);
        var childCommand = child is null ? null : await db.WorkflowChildIntents.AsNoTracking()
            .SingleAsync(x => x.Id == child, ct);
        var publications = await db.RecipeFilePublications.AsNoTracking().Where(x => x.OperationId == task.TaskId)
            .OrderBy(x => x.RecipeId).ToArrayAsync(ct);
        var operations = await db.CanonicalRecipeOperations.AsNoTracking().Where(x => x.OperationId == task.TaskId)
            .OrderBy(x => x.RecipeId).ToArrayAsync(ct);
        attempt.Outcome = JsonSerializer.Serialize(new Outcome(task.ProcessorName == "SyncRecipe" ? 3 : 2, attempt.Id, attempt.RequestHash, disposition,
            processorReturned, returnedResult, Observe(task), child, publications, operations,
            childCommand is null ? null : Observe(childCommand)), Json);
        attempt.OutcomeHash = Hash(attempt.Outcome);
        attempt.ObservedAt = now;
    }

    // Pure readback of the retained original. No destination/recipe/default or
    // provider lookup can turn absent historical observations into authority.
    public static void Validate(WorkflowProcessorAttempt attempt)
    {
        static void Require([DoesNotReturnIf(false)] bool condition)
        {
            if (!condition) throw new InvalidDataException("Processor history is inconsistent.");
        }
        var request = ReadObservation<Request>(attempt.Request);
        Require(request.Version == 1 && request.Id != Guid.Empty && request.Id == attempt.Id
            && request.Task is not null && request.Task.TaskId == attempt.TaskId && request.Task.InstanceId == attempt.InstanceId
            && attempt.TaskId != Guid.Empty && attempt.InstanceId != Guid.Empty && attempt.CreatedAt != default
            && !string.IsNullOrWhiteSpace(request.WorkflowId) && request.Task.DependsOn is not null
            && request.Task.Status == Models.TaskStatus.Pending && request.Task.RetryCount >= 0
            && !string.IsNullOrWhiteSpace(request.Task.ProcessorName) && attempt.RequestHash == Hash(attempt.Request));
        if (attempt.Outcome is null)
        {
            Require(attempt.OutcomeHash is null && attempt.ObservedAt is null);
            return;
        }
        var outcome = ReadObservation<Outcome>(attempt.Outcome);
        Require(outcome.Version is 1 or 2 or 3 && (outcome.Version != 3 || request.Task.ProcessorName == "SyncRecipe")
            && outcome.Id == attempt.Id && outcome.RequestHash == attempt.RequestHash
            && outcome.Task is not null && outcome.Task.TaskId == request.Task.TaskId
            && outcome.Task.InstanceId == request.Task.InstanceId && outcome.Task.TaskName == request.Task.TaskName
            && outcome.Task.ProcessorName == request.Task.ProcessorName && outcome.Task.Payload == request.Task.Payload
            && outcome.Task.ResetIntentId == request.Task.ResetIntentId && outcome.Task.CreatedAt == request.Task.CreatedAt
            && outcome.Task.DependsOn is not null && outcome.Task.DependsOn.SequenceEqual(request.Task.DependsOn)
            && outcome.Publications is not null && outcome.CanonicalOperations is not null
            && attempt.OutcomeHash == Hash(attempt.Outcome) && attempt.ObservedAt is not null);
        Require(outcome.Disposition switch
        {
            "succeeded" => outcome.ProcessorReturned && outcome.Task.Status == Models.TaskStatus.Completed
                && outcome.Task.RetryCount == request.Task.RetryCount,
            "retry" => !outcome.ProcessorReturned && outcome.Task.Status == Models.TaskStatus.Pending
                && outcome.Task.RetryCount == request.Task.RetryCount + 1,
            "failed" => !outcome.ProcessorReturned && outcome.Task.Status == Models.TaskStatus.Failed
                && outcome.Task.RetryCount == request.Task.RetryCount,
            _ => false
        });
        Require((outcome.ProcessorReturned || outcome.ReturnedResult is null)
            && outcome.Task.Result == (outcome.ReturnedResult ?? request.Task.Result));
        // Version 1 never captured the command. Its selected ID stays an
        // unqualified observation, rather than borrowing today's child graph.
        if (outcome.Version == 1) Require(outcome.ChildCommand is null);
        else
        {
            using var raw = JsonDocument.Parse(attempt.Outcome);
            Require(raw.RootElement.TryGetProperty("childCommand", out _)
                && (outcome.SelectedChildLaunchIntentId is null) == (outcome.ChildCommand is null)
                && (request.Task.ChildLaunchIntentId is null
                    || request.Task.ChildLaunchIntentId == outcome.SelectedChildLaunchIntentId));
            WorkflowInstance? originalChild = null;
            if (outcome.ChildCommand is { } command)
            {
                Require(command.Id == outcome.SelectedChildLaunchIntentId);
                originalChild = WorkflowOrchestrator.ValidateOriginalChildCommand(command.Restore(), new WorkflowTask
                {
                    TaskId = request.Task.TaskId,
                    InstanceId = request.Task.InstanceId,
                    ProcessorName = request.Task.ProcessorName,
                    Payload = request.Task.Payload,
                    ResetIntentId = request.Task.ResetIntentId
                });
            }
            if (outcome.ProcessorReturned && request.Task.ProcessorName is "StartWorkflow" or "QueueRecipeSearchIndex")
            {
                Require(outcome.ChildCommand is null || outcome.ChildCommand.AcceptedAt is not null);
                if (request.Task.ProcessorName == "StartWorkflow")
                    Processors.WorkflowProcessor.ValidateOriginalHistory(request.Task.Payload, outcome.ReturnedResult, originalChild);
                else
                    Processors.QueueRecipeSearchIndexProcessor.ValidateOriginalHistory(request.Task.Payload, outcome.ReturnedResult, originalChild);
            }
        }
        var publications = new HashSet<Guid>();
        foreach (var publication in outcome.Publications)
        {
            Require(publication is not null && publication.OperationId == attempt.TaskId
                && publication.RecipeId != Guid.Empty && publications.Add(publication.RecipeId)
                && publication.CreatedAt != default);
            ValidateRecipeAssociation(request, publication.RecipeId);
            var producer = RecipeFilePublicationStore.ValidateRecoveryJournal(publication);
            // Older journals without this observation stay unqualified; a present
            // original producer must agree with the invocation, not today's task.
            Require(producer is null || producer == request.Task.ProcessorName + "\n"
                + CanonicalRecipeContentStore.NormalizeJson(request.Task.Payload));
        }
        if (outcome.ProcessorReturned && request.Task.ProcessorName == "ConvertPdf")
            ValidateRecipeAssociation(request, Processors.PdfConversionProcessor.ValidateOriginalHistory(
                request.Task.Payload, outcome.ReturnedResult, outcome.Publications));
        if (outcome.ProcessorReturned && request.Task.ProcessorName == "RecipeReady")
            ValidateRecipeAssociation(request, Processors.RecipeReadyProcessor.ValidateOriginalHistory(
                request.Task.Payload, outcome.ReturnedResult, outcome.Publications));
        if (outcome.ProcessorReturned && request.Task.ProcessorName == "FetchUrlContent")
            ValidateRecipeAssociation(request, Agents.WebAcquisitionAgent.ValidateOriginalHistory(
                request.Task.Payload, outcome.ReturnedResult, outcome.Publications));
        if (outcome.ProcessorReturned && request.Task.ProcessorName is "ExtractRecipe" or "GenerateDescription" or "SynthesizeRecipe")
            ValidateRecipeAssociation(request, Agents.RecipeAgent.ValidateOriginalHistory(
                request.Task.ProcessorName, request.Task.Payload, outcome.ReturnedResult, outcome.Publications));
        if (outcome.ProcessorReturned && request.Task.ProcessorName == "GenerateHero")
            ValidateRecipeAssociation(request, Agents.RecipeHeroAgent.ValidateOriginalHistory(
                request.Task.Payload, outcome.ReturnedResult, outcome.Publications));
        if (outcome.ProcessorReturned && request.Task.ProcessorName == "CompleteRecipeImportReport")
            ValidateRecipeAssociation(request, Processors.CompleteRecipeImportReportProcessor.ValidateOriginalHistory(
                request.Task.Payload, outcome.ReturnedResult, request.Task.InstanceId));
        if (outcome.ProcessorReturned && request.Task.ProcessorName == "CategorizeIngredients")
            ValidateRecipeAssociation(request, Processors.CategorizeIngredientsProcessor.ValidateOriginalHistory(
                request.Task.Payload, outcome.ReturnedResult));
        if (outcome.ProcessorReturned && request.Task.ProcessorName == "CategorizeRecipe")
            ValidateRecipeAssociation(request, Processors.CategorizeRecipeProcessor.ValidateOriginalHistory(
                request.Task.Payload, outcome.ReturnedResult));
        if (outcome.ProcessorReturned && request.Task.ProcessorName == "ClassifyRecipeVegetarian")
            ValidateRecipeAssociation(request, Processors.ClassifyRecipeVegetarianProcessor.ValidateOriginalHistory(
                request.Task.Payload, outcome.ReturnedResult));
        if (outcome.ProcessorReturned && request.Task.ProcessorName == "SyncRecipe")
            ValidateRecipeAssociation(request, Processors.SyncRecipeProcessor.ValidateOriginalHistory(
                request.Task.Payload, outcome.ReturnedResult, new WorkflowInstance
                {
                    Id = attempt.InstanceId,
                    WorkflowId = request.WorkflowId,
                    Parameters = request.Parameters,
                    RecipePublicationCapture = request.Capture
                },
                attempt.TaskId, outcome.Version == 3));
        if (outcome.ProcessorReturned && request.Task.ProcessorName == "IndexRecipeSearch")
            ValidateRecipeAssociation(request, SearchIndexWorkflow.ValidateOriginalHistory(
                request.Task.Payload, outcome.ReturnedResult, request.Parameters));
        var operations = new HashSet<Guid>();
        foreach (var operation in outcome.CanonicalOperations)
        {
            Require(operation is not null && operation.OperationId == attempt.TaskId
                && operation.RecipeId != Guid.Empty && operations.Add(operation.RecipeId)
                && operation.CreatedAt != default && operation.InputHash is { Length: 64 }
                && operation.InputHash.All(Uri.IsHexDigit));
            ValidateRecipeAssociation(request, operation.RecipeId);
            CanonicalRecipeContentStore.ValidateOriginalOperation(operation);
            var result = ReadObservation<CanonicalRecipeWriteResult>(operation.Result);
            Require(result.Content is not null && result.CreatedIds is not null);
            // Validate retained content without comparing it to a current recipe.
            // This does not supply missing original request/evidence/dictionary
            // authority or certify that the processor computed the right result.
            RecipeExportContent.WriteCurrent(new(operation.RecipeId, result.Content, null));
            var ids = result.Content.IngredientLines.Select(x => x.Id)
                .Concat(result.Content.InstructionSections.Select(x => x.Id))
                .Concat(result.Content.InstructionSections.SelectMany(x => x.Steps).Select(x => x.Id)).ToHashSet();
            Require(result.CreatedIds.All(x => !string.IsNullOrWhiteSpace(x.Key) && ids.Contains(x.Value))
                && result.CreatedIds.Values.Distinct().Count() == result.CreatedIds.Count);
        }
    }

    private static void ValidateRecipeAssociation(Request request, Guid recipeId)
    {
        var parameters = ReadObservation<Dictionary<string, string>>(request.Parameters ?? "null");
        if (!parameters.TryGetValue("recipeId", out var recipe)
            || !Guid.TryParse(recipe, out var declared) || declared != recipeId)
            throw new InvalidDataException("Original processor recipe association differs from its journal.");
    }

    internal static T ReadObservation<T>(string raw, JsonSerializerOptions? options = null)
    {
        using var document = JsonDocument.Parse(raw);
        void Unique(JsonElement value)
        {
            if (value.ValueKind == JsonValueKind.Object)
            {
                var names = new HashSet<string>(StringComparer.Ordinal);
                foreach (var property in value.EnumerateObject())
                {
                    if (!names.Add(property.Name)) throw new InvalidDataException("Duplicate processor observation.");
                    Unique(property.Value);
                }
            }
            else if (value.ValueKind == JsonValueKind.Array)
                foreach (var item in value.EnumerateArray()) Unique(item);
        }
        Unique(document.RootElement);
        return document.RootElement.Deserialize<T>(options ?? Json)
            ?? throw new InvalidDataException("Original processor observation is absent.");
    }
}
