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
            if (envelope.Capture.FieldHash != expected.FieldHash)
                throw new InvalidDataException("Publication chain field baseline differs from its captured predecessor.");
            if (!SameFiles(envelope.Capture.Files, expected.Files))
                throw new InvalidDataException("Publication chain file baseline differs from its captured predecessor.");
            if (envelope.Candidate.ProducerInput != launch.Tasks[id].Processor + "\n" + launch.Tasks[id].Payload)
                throw new InvalidDataException("Publication chain producer input differs from its captured predecessor.");
            var files = new SortedDictionary<string, byte[]?>(expected.Files.ToDictionary(x => x.Key, x => x.Value), StringComparer.Ordinal);
            foreach (var (path, value) in envelope.Output) files[path] = value;
            expected = expected with { FieldHash = publication.ResultHash, Files = files, Fields = envelope.Result };
        }
        var freshHero = task.ProcessorName == "GenerateHero" && instance.WorkflowId is ("url-import" or "recipe-import")
            && publications.Any(x => ReadEnvelope(x).Candidate.SourceKind is "fresh-canonical" or "review-canonical");
        var freshCategorization = task.ProcessorName == "CategorizeRecipe" && instance.WorkflowId is ("url-import" or "recipe-import")
            && publications.Any(x => ReadEnvelope(x).Candidate.SourceKind is "fresh-canonical" or "review-canonical");
        if ((recipe.CanonicalContent is not null && task.ProcessorName != "RecipeReady" && !freshHero && !freshCategorization) || Fields(recipe, expected.FieldHashVersion) != expected.FieldHash
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

    private async Task ValidateFreshReviewMaterialAsync(RecipePublicationCapture capture, RecipePublicationCandidate candidate,
        Guid operationId, Recipe recipe, CancellationToken ct)
    {
        if (recipe.IsReady || recipe.CanonicalContent is not null || recipe.Ingredients is not null || recipe.RawMetadata is not null
            || capture.Fields is not { Ingredients: null, RawMetadata: null, CanonicalContent: null, IsReady: false }
            || candidate.ProducerInput is null)
            throw Conflict(recipe);
        var task = await db.WorkflowTasks.AsNoTracking().SingleOrDefaultAsync(x => x.TaskId == operationId, ct);
        if (task is null || task.ProcessorName != "ExtractRecipe" || task.InstanceId == Guid.Empty
            || candidate.ProducerInput != "ExtractRecipe\n" + CanonicalRecipeContentStore.NormalizeJson(task.Payload))
            throw new InvalidDataException("Retained review material requires its original extraction task.");
        var workflow = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks)
            .SingleOrDefaultAsync(x => x.Id == task.InstanceId, ct);
        if (workflow is null || workflow.WorkflowId is not ("url-import" or "recipe-import") || workflow.RecipePublicationCapture is null)
            throw new InvalidDataException("Retained review material requires a witnessed fresh import.");
        ValidateExecutionLaunch(workflow);
        var launch = ReadRecoveryJson<Launch>(workflow.RecipePublicationCapture);
        if (!launch.Tasks.TryGetValue(operationId, out var input) || input.Processor != "ExtractRecipe"
            || launch.Capture.Fields is not { Ingredients: null, RawMetadata: null, CanonicalContent: null, IsReady: false }
            || !await HasFreshSourceAncestryAsync(workflow, launch, operationId, ct))
            throw new InvalidDataException("Retained review material requires fresh bootstrap ancestry.");
    }

    private async Task<bool> HasFreshSourceAncestryAsync(WorkflowInstance workflow,
        Launch launch, Guid extractionTaskId, CancellationToken ct)
    {
        var launchCapture = launch.Capture;
        if (workflow.WorkflowId is not ("url-import" or "recipe-import")
            || launchCapture.Fields is not { Ingredients: null, RawMetadata: null, CanonicalContent: null, IsReady: false })
            return false;
        var bootstrap = await db.RecipeFilePublications.AsNoTracking().SingleOrDefaultAsync(x =>
            x.RecipeId == launchCapture.RecipeId && x.OperationId == workflow.Id, ct);
        if (bootstrap is null || !bootstrap.Delivered) return false;
        var envelope = ReadEnvelope(bootstrap);
        if (envelope.Candidate.SourceKind != "bootstrap" || envelope.Candidate.RecipeJson is not null
            || bootstrap.ResultHash != launchCapture.FieldHash) return false;
        if (workflow.WorkflowId == "url-import") return true;

        if (envelope.Candidate.SourceFiles?.ContainsKey("original/source.pdf") == true)
            return await HasFreshPdfSourceAncestryAsync(workflow, launch, extractionTaskId, bootstrap, envelope, ct);

        // Original photos require their own accepted image membership. Derived
        // PDF pages and later imports cannot borrow this photo authority.
        var source = envelope.Candidate.SourceFiles;
        var info = envelope.Candidate.Info;
        if (source is null || info.ImageCount is < 1 or > 20 || envelope.Candidate.FollowupIntent is null
            || source.ContainsKey("original/source.pdf") || launchCapture.Files.GetValueOrDefault("original/source.pdf") is not null
            || launchCapture.Files.GetValueOrDefault("original/content.html") is not null
            || source.Count != info.ImageCount) return false;
        for (var index = 0; index < info.ImageCount; index++)
        {
            var files = source.Where(x => x.Key.StartsWith($"original/{index}.", StringComparison.Ordinal)).ToArray();
            if (files.Length != 1 || files[0].Value is not { Length: > 0 }
                || !launchCapture.Files.TryGetValue(files[0].Key, out var captured)
                || !Equal(files[0].Value, captured)) return false;
        }
        ValidateFollowupWorkflow(envelope.Candidate, bootstrap.OperationId, workflow, requirePending: false);
        return true;
    }

    private async Task<bool> HasFreshPdfSourceAncestryAsync(WorkflowInstance workflow, Launch launch,
        Guid extractionTaskId, RecipeFilePublication bootstrap, Envelope bootstrapEnvelope, CancellationToken ct)
    {
        var source = bootstrapEnvelope.Candidate.SourceFiles;
        var info = bootstrapEnvelope.Candidate.Info;
        if (source is not { Count: 1 } || source.GetValueOrDefault("original/source.pdf") is not { Length: > 0 } pdf
            || info.ImageCount != 0 || info.FinishedDishImageIndex != -1 || info.IsReady != false
            || bootstrapEnvelope.Candidate.FollowupIntent is null
            || !launch.Tasks.TryGetValue(extractionTaskId, out var extraction) || extraction.Processor != "ExtractRecipe")
            return false;

        // This validates absent membership and the complete accepted result-to-
        // launch file/field baseline, not just the PDF's current presence.
        ValidateRecoveryFollowupIntent(bootstrap, new Dictionary<Guid, WorkflowInstance> { [workflow.Id] = workflow });
        var ancestors = new HashSet<Guid>();
        var visiting = new HashSet<Guid>();
        void Visit(Guid id)
        {
            if (ancestors.Contains(id)) return;
            if (!visiting.Add(id)) throw new InvalidDataException("PDF extraction dependency cycle.");
            foreach (var name in launch.Tasks[id].DependsOn)
            {
                var matches = launch.Tasks.Where(x => x.Value.Name == name).ToArray();
                if (matches.Length != 1) throw new InvalidDataException("PDF extraction dependency is ambiguous.");
                Visit(matches[0].Key);
            }
            visiting.Remove(id);
            if (id != extractionTaskId) ancestors.Add(id);
        }
        Visit(extractionTaskId);
        var converters = ancestors.Where(id => launch.Tasks[id].Processor == "ConvertPdf").ToArray();
        if (converters.Length == 0) return false;
        if (converters.Length != 1) throw new InvalidDataException("PDF extraction has ambiguous conversion ancestry.");
        var converterId = converters[0];
        var publications = await db.RecipeFilePublications.AsNoTracking()
            .Where(x => x.RecipeId == launch.Capture.RecipeId && ancestors.Contains(x.OperationId)).ToDictionaryAsync(x => x.OperationId, ct);
        // Present contradictory journals must throw, even when a returned
        // receipt is missing. Never turn invalid ancestry into legacy fallback.
        ValidateRecoveryPublicationChain(workflow, publications);
        publications.TryGetValue(converterId, out var conversion);
        if (conversion is not null)
        {
            var (convertedCapture, _) = ReadOriginalPublication(conversion);
            if (!Equal(convertedCapture.Files.GetValueOrDefault("original/source.pdf"), pdf))
                throw new InvalidDataException("PDF conversion source differs from accepted original bytes.");
        }
        var converter = workflow.Tasks.Single(x => x.TaskId == converterId);
        if (converter.Result is null) return false;
        var recipeId = Processors.PdfConversionProcessor.ValidateOriginalHistory(launch.Tasks[converterId].Payload,
            converter.Result, conversion is null ? [] : [conversion]);
        if (recipeId != launch.Capture.RecipeId)
            throw new InvalidDataException("PDF conversion result differs from accepted recipe membership.");
        if (conversion is null || !conversion.Delivered) return false;
        return true;
    }

    private async Task ValidateFreshCanonicalHeroAsync(Guid recipeId, Guid operationId, CancellationToken ct)
    {
        var task = await db.WorkflowTasks.AsNoTracking().SingleOrDefaultAsync(x => x.TaskId == operationId, ct);
        if (task is null || task.ProcessorName != "GenerateHero" || task.InstanceId == Guid.Empty)
            throw new InvalidDataException("Canonical hero needs its original workflow task.");
        var workflow = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks)
            .SingleOrDefaultAsync(x => x.Id == task.InstanceId, ct);
        if (workflow is null || workflow.WorkflowId is not ("url-import" or "recipe-import") || workflow.RecipePublicationCapture is null)
            throw new InvalidDataException("Canonical hero needs its witnessed source workflow.");
        ValidateExecutionLaunch(workflow);
        var launch = ReadRecoveryJson<Launch>(workflow.RecipePublicationCapture);
        var extraction = workflow.Tasks.SingleOrDefault(x => x.ProcessorName == "ExtractRecipe");
        if (extraction is null || !launch.Tasks.TryGetValue(operationId, out var hero)
            || hero.Processor != "GenerateHero" || !hero.DependsOn.Contains(extraction.TaskName)
            || !launch.Tasks.ContainsKey(extraction.TaskId))
            throw new InvalidDataException("Canonical hero has no captured extraction ancestor.");
        var publication = await db.RecipeFilePublications.AsNoTracking().SingleOrDefaultAsync(
            x => x.RecipeId == recipeId && x.OperationId == extraction.TaskId, ct);
        if (publication is null || !publication.Delivered || ReadEnvelope(publication).Candidate.SourceKind is not ("fresh-canonical" or "review-canonical")
            || workflow.WorkflowId == "recipe-import" && ReadEnvelope(publication).Candidate.SourceKind == "fresh-canonical"
                && !await HasFreshSourceAncestryAsync(workflow, launch, extraction.TaskId, ct))
            throw new InvalidDataException("Canonical hero needs delivered fresh canonical ancestry.");
    }

    private async Task ValidateReviewedCanonicalAsync(RecipePublicationCapture capture, RecipePublicationCandidate candidate,
        Guid operationId, Recipe recipe, CancellationToken ct)
    {
        if (recipe.IsReady || recipe.CanonicalContent is not null || capture.Fields is not { Ingredients: not null, RawMetadata: not null, CanonicalContent: null, IsReady: false }
            || candidate.ProducerInput is null || candidate.RecipeJson is null)
            throw Conflict(recipe);
        var task = await db.WorkflowTasks.AsNoTracking().SingleOrDefaultAsync(x => x.TaskId == operationId, ct);
        if (task is null || task.ProcessorName != "ExtractRecipe" || task.InstanceId == Guid.Empty
            || candidate.ProducerInput != "ExtractRecipe\n" + CanonicalRecipeContentStore.NormalizeJson(task.Payload))
            throw new InvalidDataException("Reviewed recovery needs its original extraction task.");
        var workflow = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks)
            .SingleOrDefaultAsync(x => x.Id == task.InstanceId, ct);
        if (workflow is null || workflow.WorkflowId is not ("url-import" or "recipe-import") || workflow.RecipePublicationCapture is null)
            throw new InvalidDataException("Reviewed recovery needs its captured source repair workflow.");
        ValidateExecutionLaunch(workflow);
        var report = await db.RecipeImportReports.AsNoTracking().SingleOrDefaultAsync(x => x.RecipeId == recipe.Id, ct);
        var intent = report?.RepairIntentId is Guid intentId
            ? await db.RecipeRepairIntents.AsNoTracking().SingleOrDefaultAsync(x => x.Id == intentId, ct) : null;
        if (report is null || report.LastWorkflowInstanceId != workflow.Id || report.Status != RecipeImportReportStatus.Reimporting
            || string.IsNullOrWhiteSpace(report.Note) || report.Reasons.Contains("duplicate")
            || !report.Reasons.Any(x => x is "ingredients" or "steps") || intent is null)
            throw new InvalidDataException("Reviewed recovery needs its accepted changed-comment repair intent.");
        RecipeReportRepairIntent.ValidateAccepted(intent, workflow);
        var earlier = await db.RecipeFilePublications.AsNoTracking().Where(x => x.RecipeId == recipe.Id).ToArrayAsync(ct);
        if (!await HasReviewedSourceAncestryAsync(workflow, earlier, ct))
            throw new InvalidDataException("Reviewed recovery needs original retained review material.");
        var launch = ReadRecoveryJson<Launch>(workflow.RecipePublicationCapture);
        if (!launch.Tasks.TryGetValue(operationId, out var input) || input.Processor != "ExtractRecipe"
            || launch.Capture.Fields is null || Fields(RestoreObservation(launch.Capture.Fields), launch.Capture.FieldHashVersion) != launch.Capture.FieldHash
            || launch.Capture.Fields.Ingredients != capture.Fields.Ingredients || launch.Capture.Fields.RawMetadata != capture.Fields.RawMetadata)
            throw new InvalidDataException("Reviewed recovery differs from its saved human correction.");
    }

    private async Task<bool> HasReviewedSourceAncestryAsync(WorkflowInstance repair,
        RecipeFilePublication[] earlier, CancellationToken ct)
    {
        foreach (var retained in earlier.Where(x => x.Delivered && ReadEnvelope(x).Candidate.SourceKind == "review-material"))
        {
            var originalTask = await db.WorkflowTasks.AsNoTracking().SingleOrDefaultAsync(x => x.TaskId == retained.OperationId, ct);
            if (originalTask is null) continue;
            var original = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks)
                .SingleOrDefaultAsync(x => x.Id == originalTask.InstanceId, ct);
            if (original is null || original.WorkflowId != repair.WorkflowId || original.RecipePublicationCapture is null) continue;
            ValidateExecutionLaunch(original);
            if (await HasFreshSourceAncestryAsync(original, ReadRecoveryJson<Launch>(original.RecipePublicationCapture), originalTask.TaskId, ct))
                return true;
        }
        return false;
    }

    internal async Task<bool> CanRecoverReviewedSourceAsync(RecipePublicationCapture capture, Guid operationId, CancellationToken ct = default)
    {
        if (capture.Fields is not { Ingredients: not null, RawMetadata: not null, CanonicalContent: null, IsReady: false }) return false;
        var task = await db.WorkflowTasks.AsNoTracking().SingleOrDefaultAsync(x => x.TaskId == operationId, ct);
        if (task is null || task.ProcessorName != "ExtractRecipe" || task.InstanceId == Guid.Empty) return false;
        var report = await db.RecipeImportReports.AsNoTracking().SingleOrDefaultAsync(x => x.RecipeId == capture.RecipeId, ct);
        if (report?.LastWorkflowInstanceId != task.InstanceId || report.Status != RecipeImportReportStatus.Reimporting
            || report.RepairIntentId is null || report.Reasons.Contains("duplicate")
            || !report.Reasons.Any(x => x is "ingredients" or "steps")) return false;
        var workflow = await db.WorkflowInstances.AsNoTracking().SingleOrDefaultAsync(x => x.Id == task.InstanceId, ct);
        if (workflow is null || workflow.WorkflowId is not ("url-import" or "recipe-import")) return false;
        var earlier = await db.RecipeFilePublications.AsNoTracking().Where(x => x.RecipeId == capture.RecipeId).ToArrayAsync(ct);
        return await HasReviewedSourceAncestryAsync(workflow, earlier, ct);
    }

    internal async Task<bool> CanRetainFreshReviewMaterialAsync(RecipePublicationCapture capture, Guid operationId,
        CancellationToken ct = default)
    {
        if (capture.Fields is not { Ingredients: null, RawMetadata: null, CanonicalContent: null, IsReady: false })
            return false;
        var task = await db.WorkflowTasks.AsNoTracking().SingleOrDefaultAsync(x => x.TaskId == operationId, ct);
        if (task is null || task.ProcessorName != "ExtractRecipe" || task.InstanceId == Guid.Empty) return false;
        var workflow = await db.WorkflowInstances.AsNoTracking().Include(x => x.Tasks)
            .SingleOrDefaultAsync(x => x.Id == task.InstanceId, ct);
        if (workflow?.RecipePublicationCapture is null || workflow.WorkflowId is not ("url-import" or "recipe-import")) return false;
        ValidateExecutionLaunch(workflow);
        return await HasFreshSourceAncestryAsync(workflow,
            ReadRecoveryJson<Launch>(workflow.RecipePublicationCapture), operationId, ct);
    }

    private static bool SameFiles(IReadOnlyDictionary<string, byte[]?> left, IReadOnlyDictionary<string, byte[]?> right) =>
        left.Count == right.Count && left.All(x => right.TryGetValue(x.Key, out var value) && Equal(x.Value, value));
}
