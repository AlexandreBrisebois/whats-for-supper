using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Models;

namespace RecipeApi.Services;

public sealed partial class RecipeFilePublicationStore
{
    private sealed record TaskInput(string Name, string Processor, string Payload, string[] DependsOn);
    private sealed record Launch(RecipePublicationCapture Capture, Dictionary<Guid, TaskInput> Tasks, string InputHash,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? Version = null,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? WorkflowId = null,
        [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] Dictionary<string, string>? Parameters = null);
    private static readonly HashSet<string> Writers = ["FetchUrlContent", "ConvertPdf", "ExtractRecipe", "SynthesizeRecipe", "GenerateDescription", "GenerateHero", "RecipeReady"];

    // Stored once with the workflow, before it can be dispatched. Caller-provided
    // parameters cannot supply this evidence or change a captured task's input.
    public async Task CaptureLaunchAsync(WorkflowInstance instance, CancellationToken ct = default, bool requireSourceMatch = false)
    {
        if (!instance.Tasks.Any(x => Writers.Contains(x.ProcessorName)))
        {
            CaptureDispatchLaunch(instance);
            return;
        }
        var parameters = JsonSerializer.Deserialize<Dictionary<string, string>>(instance.Parameters!)!;
        if (!parameters.TryGetValue("recipeId", out var id) || !Guid.TryParse(id, out var recipeId))
            throw new InvalidWorkflowException("Recipe publication requires recipeId.");
        var capture = await CaptureAsync(recipeId, ct, requireSourceMatch, parameters.GetValueOrDefault("url"));
        var tasks = instance.Tasks.ToDictionary(x => x.TaskId,
            x => new TaskInput(x.TaskName, x.ProcessorName, CanonicalRecipeContentStore.NormalizeJson(x.Payload), x.DependsOn));
        instance.RecipePublicationCapture = JsonSerializer.Serialize(new Launch(capture, tasks,
            Hash(new { version = 2, capture, tasks, workflowId = instance.WorkflowId, parameters }),
            2, instance.WorkflowId, parameters), Json);
    }

    private static bool MatchesLaunchIntent(Launch launch, WorkflowInstance instance, bool retainHistorical = false)
    {
        // Earlier records did not capture all parameters. They remain evidence
        // under an explicit nonexecuting recovery disposition, never authority
        // reconstructed from today's instance or workflow definition.
        if (launch.Version is null && launch.WorkflowId is null && launch.Parameters is null)
            return retainHistorical && launch.InputHash == Hash(new { capture = launch.Capture, tasks = launch.Tasks });
        return launch.Version == 2 && !string.IsNullOrWhiteSpace(launch.WorkflowId)
            && launch.WorkflowId == instance.WorkflowId && launch.Parameters is not null
            && launch.Parameters.All(x => !string.IsNullOrWhiteSpace(x.Key) && x.Value is not null)
            && CanonicalRecipeContentStore.NormalizeJson(JsonSerializer.Serialize(launch.Parameters))
                == CanonicalRecipeContentStore.NormalizeJson(instance.Parameters)
            && launch.InputHash == Hash(new
            {
                version = 2,
                capture = launch.Capture,
                tasks = launch.Tasks,
                workflowId = launch.WorkflowId,
                parameters = launch.Parameters
            });
    }

    // Validate archived launch intent without reading destination state, resuming
    // delivery, allocating IDs or consulting today's workflow definitions.
    internal static void ValidateRecoveryLaunch(WorkflowInstance instance, bool retainUncaptured = false)
    {
        if (instance.RecipePublicationCapture is null)
        {
            if (!retainUncaptured && instance.Tasks.Any(x => Writers.Contains(x.ProcessorName) || RequiresDispatchIntent(x.ProcessorName)))
                throw new InvalidDataException("Publication workflow requires its captured launch.");
            return;
        }
        if (IsDispatchLaunch(instance.RecipePublicationCapture))
        {
            ValidateDispatchLaunch(instance, retainHistoricalReady: retainUncaptured);
            return;
        }
        var launch = ReadRecoveryJson<Launch>(instance.RecipePublicationCapture);
        var parameters = JsonSerializer.Deserialize<Dictionary<string, string>>(instance.Parameters ?? "null");
        if (launch.Capture is null || launch.Tasks is null || parameters is null
            || !parameters.TryGetValue("recipeId", out var recipe) || !Guid.TryParse(recipe, out var recipeId)
            || launch.Capture.RecipeId != recipeId || !MatchesLaunchIntent(launch, instance, retainUncaptured)
            || launch.Tasks.Count != instance.Tasks.Count || launch.Capture.Files is null
            || !launch.Capture.Files.Keys.All(IsRecoveryPublicationPath)
            || string.IsNullOrWhiteSpace(launch.Capture.ContentRevision) || string.IsNullOrWhiteSpace(launch.Capture.SourceRevision)
            || launch.Capture.FieldHash is not { Length: 64 } || !launch.Capture.FieldHash.All(Uri.IsHexDigit)
            || launch.Capture.FieldHashVersion is not (null or 2 or 3))
            throw new InvalidDataException("Captured publication intent is inconsistent.");
        ValidateOriginalFields(launch.Capture);
        foreach (var task in instance.Tasks)
            if (!launch.Tasks.TryGetValue(task.TaskId, out var input) || input is null
                || input.Name != task.TaskName || input.Processor != task.ProcessorName
                || input.Payload != CanonicalRecipeContentStore.NormalizeJson(task.Payload)
                || input.DependsOn is null || !input.DependsOn.SequenceEqual(task.DependsOn))
                throw new InvalidDataException("Task differs from captured publication intent.");
    }

    // Execution never upgrades retained historical facts into accepted authority.
    // Validate the complete stored aggregate, including nonwriter tasks in a writer launch.
    internal static void ValidateExecutionLaunch(WorkflowInstance instance)
    {
        if (instance.RecipePublicationCapture is null || instance.Tasks.Any(x => x.InstanceId != instance.Id))
            throw new InvalidDataException("Workflow execution requires its original captured launch.");
        ValidateRecoveryLaunch(instance);
    }

    // The Sync invocation retained these exact sibling journals. Resolve their
    // membership and ancestry from its original launch, never today's tasks.
    internal static void ValidateOriginalSyncPublications(WorkflowInstance original, Guid syncTaskId, string? payload,
        Guid recipeId, IReadOnlyList<RecipeFilePublication> publications)
    {
        if (original.RecipePublicationCapture is null || IsDispatchLaunch(original.RecipePublicationCapture))
            throw new InvalidDataException("Sync confirmation requires its original publication launch.");
        var launch = ReadRecoveryJson<Launch>(original.RecipePublicationCapture);
        if (launch.Tasks is null || launch.Tasks.Any(x => x.Value is null))
            throw new InvalidDataException("Sync confirmation launch is incomplete.");
        original.Tasks = launch.Tasks.Select(x => new WorkflowTask
        {
            TaskId = x.Key,
            InstanceId = original.Id,
            TaskName = x.Value.Name,
            ProcessorName = x.Value.Processor,
            Payload = x.Value.Payload,
            DependsOn = x.Value.DependsOn
        }).ToList();
        ValidateRecoveryLaunch(original);
        if (launch.Capture.RecipeId != recipeId || !launch.Tasks.TryGetValue(syncTaskId, out var sync)
            || sync.Processor != "SyncRecipe" || sync.Payload != CanonicalRecipeContentStore.NormalizeJson(payload))
            throw new InvalidDataException("Sync confirmation differs from its captured invocation.");
        var retained = new Dictionary<Guid, RecipeFilePublication>();
        foreach (var publication in publications)
        {
            if (publication.RecipeId != recipeId || publication.OperationId == Guid.Empty
                || publication.OperationId == syncTaskId || publication.CreatedAt == default
                || !retained.TryAdd(publication.OperationId, publication)
                || !launch.Tasks.TryGetValue(publication.OperationId, out var producer)
                || ValidateRecoveryJournal(publication) != producer.Processor + "\n" + producer.Payload)
                throw new InvalidDataException("Sync confirmation differs from its original producer.");
        }
        ValidateRecoveryPublicationChain(original, retained);
    }

    // Check ancestry from frozen records only. A valid journal in isolation is
    // insufficient: its baseline must be the launch plus its declared ancestors.
    internal static void ValidateRecoveryPublicationChain(WorkflowInstance instance,
        IReadOnlyDictionary<Guid, RecipeFilePublication> publications)
    {
        if (instance.RecipePublicationCapture is null) return;
        if (IsDispatchLaunch(instance.RecipePublicationCapture))
        {
            if (instance.Tasks.Any(x => publications.ContainsKey(x.TaskId)))
                throw new InvalidDataException("Dispatch intent cannot authorize a file publication.");
            return;
        }
        var launch = ReadRecoveryJson<Launch>(instance.RecipePublicationCapture);
        var names = launch.Tasks.ToDictionary(x => x.Value.Name, x => x.Key, StringComparer.Ordinal);
        foreach (var task in instance.Tasks)
        {
            if (!publications.TryGetValue(task.TaskId, out var current)) continue;
            var ancestors = new List<Guid>();
            var visited = new HashSet<Guid>();
            var stack = new Stack<(Guid Id, bool Exit)>();
            stack.Push((task.TaskId, false));
            while (stack.TryPop(out var item))
            {
                if (item.Exit) { if (item.Id != task.TaskId) ancestors.Add(item.Id); continue; }
                if (!visited.Add(item.Id)) continue;
                stack.Push((item.Id, true));
                foreach (var dependency in launch.Tasks[item.Id].DependsOn.Reverse())
                    stack.Push((names[dependency], false));
            }
            var expected = launch.Capture;
            void Matches(RecipeFilePublication publication)
            {
                var envelope = ReadEnvelope(publication);
                if (publication.RecipeId != expected.RecipeId
                    || envelope.Capture.FieldHash != expected.FieldHash
                    || envelope.Capture.FieldHashVersion != expected.FieldHashVersion
                    || !SameFiles(envelope.Capture.Files, expected.Files)
                    || envelope.Candidate.ProducerInput != launch.Tasks[publication.OperationId].Processor
                        + "\n" + launch.Tasks[publication.OperationId].Payload)
                    throw new InvalidDataException("Archived publication does not match its captured predecessor.");
            }
            foreach (var id in ancestors)
            {
                // Some processors legitimately produce no publication. Absence
                // never supplies a new baseline or certifies task completion.
                if (!publications.TryGetValue(id, out var prior)) continue;
                Matches(prior);
                if (!prior.Delivered)
                    throw new InvalidDataException("A descendant cannot precede its ancestor's delivery.");
                var files = new SortedDictionary<string, byte[]?>(expected.Files.ToDictionary(x => x.Key, x => x.Value), StringComparer.Ordinal);
                foreach (var (path, bytes) in ReadEnvelope(prior).Output) files[path] = bytes;
                expected = expected with { FieldHash = prior.ResultHash, Files = files, Fields = ReadEnvelope(prior).Result };
            }
            Matches(current);
        }
    }

    public async Task<RecipePublicationCapture> CaptureForTaskAsync(WorkflowTask task, Guid recipeId, CancellationToken ct = default)
    {
        // Direct internal calls have no queued interval. Persisted work must have
        // a launch capture; old/unlinked tasks cannot manufacture one at execution.
        if (task.InstanceId == Guid.Empty) return await CaptureAsync(recipeId, ct);
        var instance = await db.WorkflowInstances.AsNoTracking().SingleOrDefaultAsync(x => x.Id == task.InstanceId, ct)
            ?? throw new InvalidDataException("Publication workflow is missing.");
        if (instance.RecipePublicationCapture is not { } json)
            throw new InvalidDataException("Publication workflow requires a captured launch baseline.");
        Launch launch;
        try { launch = ReadRecoveryJson<Launch>(json); }
        catch (JsonException ex) { throw new InvalidDataException("Invalid workflow publication capture.", ex); }
        ValidateOriginalFields(launch.Capture);
        if (!MatchesLaunchIntent(launch, instance)
            || launch.Capture.RecipeId != recipeId || !launch.Tasks.TryGetValue(task.TaskId, out var input)
            || input.Processor != task.ProcessorName || input.Name != task.TaskName
            || input.Payload != CanonicalRecipeContentStore.NormalizeJson(task.Payload)
            || !input.DependsOn.SequenceEqual(task.DependsOn))
            throw new InvalidDataException("Publication task does not match its captured launch input.");

        var ancestors = new List<Guid>();
        var visiting = new HashSet<Guid>();
        void Visit(Guid id)
        {
            if (ancestors.Contains(id)) return;
            if (!visiting.Add(id)) throw new InvalidDataException("Publication dependency cycle.");
            foreach (var name in launch.Tasks[id].DependsOn)
            {
                var matches = launch.Tasks.Where(x => x.Value.Name == name).ToArray();
                if (matches.Length != 1) throw new InvalidDataException("Publication dependency is ambiguous.");
                Visit(matches[0].Key);
            }
            visiting.Remove(id);
            if (id != task.TaskId) ancestors.Add(id);
        }
        Visit(task.TaskId);
        var publications = await db.RecipeFilePublications.AsNoTracking()
            .Where(x => x.RecipeId == recipeId && ancestors.Contains(x.OperationId)).ToListAsync(ct);
        foreach (var pending in publications.Where(x => !x.Delivered)) await ResumeAsync(recipeId, pending.OperationId, ct);

        await using var transaction = await RecipeRotation.LockAsync(db, recipeId, ct, lockSupperInputs: true);
        var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == recipeId, ct);
        var expected = launch.Capture;
        foreach (var id in ancestors)
        {
            var publication = publications.SingleOrDefault(x => x.OperationId == id);
            if (publication is null) continue;
            var envelope = ReadEnvelope(publication);
            if (envelope.Capture.FieldHash != expected.FieldHash || !SameFiles(envelope.Capture.Files, expected.Files)
                || envelope.Candidate.ProducerInput != launch.Tasks[id].Processor + "\n" + launch.Tasks[id].Payload)
                throw new InvalidDataException("Publication chain does not match its captured predecessor.");
            var files = new SortedDictionary<string, byte[]?>(expected.Files.ToDictionary(x => x.Key, x => x.Value), StringComparer.Ordinal);
            foreach (var (path, value) in envelope.Output) files[path] = value;
            expected = expected with { FieldHash = publication.ResultHash, Files = files, Fields = envelope.Result };
        }
        if ((recipe.CanonicalContent is not null && task.ProcessorName != "RecipeReady") || Fields(recipe, expected.FieldHashVersion) != expected.FieldHash
            || await db.RecipeFilePublications.AnyAsync(x => x.RecipeId == recipeId && !x.Delivered, ct)) throw Conflict(recipe);
        await CheckFiles(expected, null, recipe, ct);
        var capture = expected with
        {
            ContentRevision = CanonicalRecipeContentStore.InspectContentRevision(recipe),
            SourceRevision = CanonicalRecipeContentStore.InspectSourceRevision(recipe)
        };
        if (transaction is not null) await transaction.CommitAsync(ct);
        return capture;
    }

    private static bool SameFiles(IReadOnlyDictionary<string, byte[]?> left, IReadOnlyDictionary<string, byte[]?> right) =>
        left.Count == right.Count && left.All(x => right.TryGetValue(x.Key, out var value) && Equal(x.Value, value));
}
