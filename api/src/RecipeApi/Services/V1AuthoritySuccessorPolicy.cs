using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace RecipeApi.Services;

internal sealed record V1SuccessorRequest(int Version, string Kind, V1TransitionRequest Runtime,
    RecoveryFile[] PredecessorFiles, RecoveryFile PredecessorAssembly, RecoveryFile[] TracerReadbackFiles,
    string OriginalCorpusInventorySha256);
internal sealed record V1SuccessorWriteInput(int Version, string Kind, string RequestSha256, string AttemptSha256,
    string CaptureCompletionSha256, string SelectionInventorySha256, string OutcomesSha256,
    string ProducerCompletionSha256, RecoveryFile[] ProducerFiles, Guid PlanOperationId);

internal static class V1AuthoritySuccessorPolicy
{
    private static readonly UTF8Encoding Utf8 = new(false, true);
    internal static readonly string[] PredecessorNames = [
        "caller/capture-request.json", "caller/capture-attempt.json", "caller/build.json", "caller/source-manifest.json",
        "caller/hold-before.json", "caller/hold-after.json", "caller/write-input.json",
        "capture/request.json", "capture/attempt.json", "capture/corpus-inventory.json", "capture/selection-inventory.json", "capture/complete.json",
        "producer/plan-producer.json", "producer/plan-postgres.json", "producer/conversion-producer.json", "producer/conversion-postgres.json", "producer/complete.json",
        "write-admission/write-input.json", "write-admission/complete.json"];
    internal static readonly string[] ReadbackNames = ["state.json", "inventory.json", "plan.json", "conversion.json", "plan-row.json", "conversion-row.json", "recipe.json", "search.json", "complete.json"];
    internal static string Bundle(string root) => Path.Combine(root, ".task/v1-authority-successor-execution");
    internal static T Read<T>(byte[] bytes) => FoodVocabularyDefinitions.ReadStrict<T>(Utf8.GetString(bytes));
    internal static string Hash(byte[] bytes) => FoodVocabularyDefinitions.Sha256(bytes);
    private static void Require(bool value) => FoodVocabularyDefinitions.Require(value);
    internal static byte[] Predecessor(string root, string name) => File.ReadAllBytes(Path.Combine(V1AuthorityTransitionPolicy.Bundle(root), name));

    internal static V1SuccessorRequest Request(string root, byte[] bytes)
    {
        var request = Read<V1SuccessorRequest>(bytes);
        Require(request.Version == 1 && request.Kind == "remaining-recipes-capture" && request.Runtime is not null);
        var runtime = V1AuthorityTransitionPolicy.RequireRuntime(root, request.Runtime!, Bundle(root));
        Require(runtime.Kind == "remaining-recipes-capture");
        var oldBundle = V1AuthorityTransitionPolicy.Bundle(root);
        Require(request.PredecessorFiles is not null && request.PredecessorFiles.Select(x => x.Path).Order(StringComparer.Ordinal)
            .SequenceEqual(PredecessorNames.Order(StringComparer.Ordinal)));
        foreach (var file in request.PredecessorFiles!) _ = V1AuthorityTransitionPolicy.BoundFile(oldBundle, file);
        var old = Read<V1TransitionRequest>(Predecessor(root, "caller/capture-request.json"));
        Require(old.Version == 1 && old.Kind == "single-recipe-transition-capture" && old.PlanningContractSha256 == V1AuthorityTransitionPolicy.ContractSha256
            && old.Selection.Selected.Count == 1 && old.OriginalV4RequestSha256 == runtime.OriginalV4RequestSha256
            && old.SourceDatabase == runtime.SourceDatabase && old.SourcePristineDatabase == runtime.SourcePristineDatabase
            && old.ExecutionDatabase == runtime.ExecutionDatabase && old.SourceDataRoot == runtime.SourceDataRoot
            && old.SourcePristineDataRoot == runtime.SourcePristineDataRoot && old.ExecutionDataRoot == runtime.ExecutionDataRoot
            && old.SourceEndpoint == runtime.SourceEndpoint && old.ExecutionEndpoint == runtime.ExecutionEndpoint
            && old.SourceRole == runtime.SourceRole && old.ExecutionRole == runtime.ExecutionRole
            && old.DatabaseContainerId == runtime.DatabaseContainerId && old.SourceGeneration == runtime.SourceGeneration
            && old.ExecutionGeneration == runtime.ExecutionGeneration && old.HoldAfterBytes.AsSpan().SequenceEqual(runtime.HoldBeforeBytes));
        Require(request.PredecessorAssembly is not null && request.PredecessorAssembly.Path == "qualifier/bin/Debug/net11.0/RecipeApi.dll"
            && request.PredecessorAssembly.Sha256 == old.ApiAssemblySha256);
        _ = V1AuthorityTransitionPolicy.BoundFile(oldBundle, request.PredecessorAssembly!);
        var attempt = Read<V1TransitionAttempt>(Predecessor(root, "caller/capture-attempt.json"));
        var write = Read<V1TransitionWriteInput>(Predecessor(root, "caller/write-input.json"));
        Require(attempt.CaptureRequestSha256 == Hash(Predecessor(root, "caller/capture-request.json"))
            && write.CaptureRequestSha256 == attempt.CaptureRequestSha256 && write.CaptureAttemptSha256 == Hash(Predecessor(root, "caller/capture-attempt.json"))
            && write.Kind == "single-recipe-transition-write-admission" && write.PlanOperationId == old.Selection.OperationId
            && write.RecipeId == old.Selection.Selected[0].RecipeId && write.ConversionOperationId == old.Selection.Selected[0].OperationId);
        foreach (var (path, hash) in new[] { ("capture/complete.json",write.CaptureCompletionSha256), ("capture/corpus-inventory.json",write.CorpusInventorySha256),
            ("capture/selection-inventory.json",write.SelectionInventorySha256), ("producer/complete.json",write.ProducerCompletionSha256) })
            Require(Hash(Predecessor(root, path)) == hash);
        Require(write.ProducerFiles.Length == 4 && write.ProducerFiles.Select(x => x.Path).Order(StringComparer.Ordinal)
            .SequenceEqual(V1AuthorityTransitionPolicy.ProducerNames.Select(x => "producer/" + x)));
        foreach (var file in write.ProducerFiles) _ = V1AuthorityTransitionPolicy.BoundFile(oldBundle, file);
        Require(request.OriginalCorpusInventorySha256 == write.CorpusInventorySha256);
        Require(request.TracerReadbackFiles is { Length: 9 });
        var readbackDirectory = Path.GetDirectoryName(request.TracerReadbackFiles![0].Path)!.Replace('\\', '/');
        Require(Regex.IsMatch(readbackDirectory, "^invocations/[a-f0-9]{32}$")
            && request.TracerReadbackFiles.Select(x => x.Path).Order(StringComparer.Ordinal)
                .SequenceEqual(ReadbackNames.Select(x => readbackDirectory + "/" + x).Order(StringComparer.Ordinal)));
        foreach (var file in request.TracerReadbackFiles) _ = V1AuthorityTransitionPolicy.BoundFile(oldBundle, file);
        var state = Read<JsonElement>(File.ReadAllBytes(Path.Combine(oldBundle, readbackDirectory, "state.json")));
        Require(state.GetProperty("version").GetInt32() == 1 && state.GetProperty("requestSha256").GetString() == write.CaptureRequestSha256
            && state.GetProperty("attemptSha256").GetString() == write.CaptureAttemptSha256
            && state.GetProperty("writeInputSha256").GetString() == Hash(Predecessor(root, "caller/write-input.json"))
            && state.GetProperty("outcome").GetProperty("state").GetString() == "D-reconciled-C");
        var original = Read<CanonicalMigrationInventory>(Predecessor(root, "capture/corpus-inventory.json"));
        RequireRemainingSelection(original, old, runtime);
        var fixedOriginal = V1ExactSourceAdmission.LoadPolicy(root, V1AuthorityTransitionPolicy.Exact(root,
            V1ExactSourceAdmission.PolicyDirectory + "V1-ADMISSION-INTENT.json", V1ExactSourceAdmission.IntentSha256));
        var prewrite = V1MigrationPrewritePolicy.Load(root);
        var historical = fixedOriginal.GetProperty("rows").EnumerateArray().Select(x => x.GetProperty("operationId").GetGuid())
            .Concat(prewrite.GetProperty("selected").EnumerateArray().Select(x => x.GetProperty("operationId").GetGuid()))
            .Append(prewrite.GetProperty("migrationOperationId").GetGuid()).ToHashSet();
        var originalRequest = V1SourceCoveragePolicy.SourceRequest(root, V1SourceCoveragePolicy.Load(root, V1MigrationPrewritePolicy.CoverageRequest(root)));
        historical.Add(Read<JsonElement>(originalRequest).GetProperty("recoveryOperationId").GetGuid());
        Require(!runtime.Corpus.Selected.Concat(runtime.Selection.Selected).Select(x => x.OperationId)
            .Concat([runtime.Corpus.OperationId, runtime.Selection.OperationId, runtime.AttemptId]).Any(historical.Contains));
        return request with { Runtime = runtime };
    }

    internal static void RequireRemainingSelection(CanonicalMigrationInventory original, V1TransitionRequest old, V1TransitionRequest runtime)
    {
        var tracer = old.Selection.Selected.Single().RecipeId;
        var expected = original.Recipes.Where(x => x.Status == "requires-forward-assessment" && x.RecipeId != tracer).Select(x => x.RecipeId).Order().ToArray();
        Require(original.Recipes.Count == 221 && expected.Length == 197 && original.Recipes.Count(x => x.Status != "requires-forward-assessment") == 23
            && runtime.Selection.Selected.Select(x => x.RecipeId).Order().SequenceEqual(expected)
            && runtime.Corpus.Selected.Select(x => x.RecipeId).Order().SequenceEqual(original.Recipes.Select(x => x.RecipeId).Order()));
        var prior = old.Corpus.Selected.Concat(old.Selection.Selected).Select(x => x.OperationId)
            .Concat([old.Corpus.OperationId, old.Selection.OperationId, old.AttemptId]).ToHashSet();
        var current = runtime.Corpus.Selected.Concat(runtime.Selection.Selected).Select(x => x.OperationId)
            .Concat([runtime.Corpus.OperationId, runtime.Selection.OperationId, runtime.AttemptId]).ToArray();
        Require(current.All(x => x != Guid.Empty && !prior.Contains(x)) && current.Distinct().Count() == current.Length);
    }

    internal static void Attempt(byte[] requestBytes, byte[] attemptBytes, DeploymentCalendar calendar)
    {
        var request = Read<V1SuccessorRequest>(requestBytes).Runtime;
        var attempt = Read<V1TransitionAttempt>(attemptBytes);
        var date = calendar.Capture(attempt.CapturedAt);
        Require(attempt.Version == 1 && attempt.CaptureRequestSha256 == Hash(requestBytes) && attempt.AttemptId == request.AttemptId
            && attempt.CapturedAt == request.CapturedAt && attempt.EvaluationDate == request.EvaluationDate
            && attempt.EvaluationDate == date.Today && attempt.TimeZone == request.TimeZone && attempt.TimeZone == date.TimeZone);
    }

    internal static V1SuccessorWriteInput WriteAdmission(string root, byte[] requestBytes, byte[] attemptBytes, byte[] bytes)
    {
        var request = Request(root, requestBytes);
        var input = Read<V1SuccessorWriteInput>(bytes);
        Caller(root, requestBytes, attemptBytes, bytes);
        Require(input.Version == 1 && input.Kind == "remaining-recipes-write-admission" && input.RequestSha256 == Hash(requestBytes)
            && input.AttemptSha256 == Hash(attemptBytes) && input.PlanOperationId == request.Runtime.Selection.OperationId);
        foreach (var (path, sha) in new[] { ("capture/complete.json", input.CaptureCompletionSha256),
            ("capture/selection-inventory.json", input.SelectionInventorySha256), ("capture/outcomes.json", input.OutcomesSha256),
            ("producer/complete.json", input.ProducerCompletionSha256) }) _ = V1AuthorityTransitionPolicy.Exact(Bundle(root), path, sha);
        var outcomes = Read<V1SuccessorPreparation[]>(File.ReadAllBytes(Path.Combine(Bundle(root), "capture/outcomes.json")));
        var names = outcomes.Where(x => x.Outcome == "eligible").Select(x => "producer/" + x.RecipeId.ToString("N") + ".json").Append("producer/plan.json");
        Require(input.ProducerFiles is { Length: > 1 } && input.ProducerFiles.Select(x => x.Path).Order(StringComparer.Ordinal).SequenceEqual(names.Order(StringComparer.Ordinal)));
        foreach (var file in input.ProducerFiles!) _ = V1AuthorityTransitionPolicy.BoundFile(Bundle(root), file);
        return input;
    }

    internal static void Caller(string root, byte[] request, byte[] attempt, byte[]? write = null)
    {
        foreach (var (name, bytes) in new[] { ("capture-request.json", request), ("capture-attempt.json", attempt), ("write-input.json", write) })
            if (bytes is not null) _ = V1AuthorityTransitionPolicy.Exact(Bundle(root), "caller/" + name, Hash(bytes));
    }
}
