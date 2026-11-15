using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace RecipeApi.Services;

internal sealed record V1TransitionSchemaDomain(string Name, string Algorithm, string[] Relations, string Sha256);
internal sealed record V1TransitionRequest(int Version, string Kind, string PlanningContractSha256,
    string CandidateCommit, string ApiAssemblySha256, RecoveryFile BuildProvenance,
    string RuntimeImageId, string DatabaseContainerId, string PostgresVersion, string LinuxRuntime,
    string SourceEndpoint, string ExecutionEndpoint, string SourceRole, string ExecutionRole,
    string SourcePristineDatabase, string SourceDatabase, string ExecutionDatabase,
    string SourceDataRoot, string SourcePristineDataRoot, string ExecutionDataRoot,
    string? SourceGeneration, string? ExecutionGeneration, string OriginalV4RequestSha256,
    V1TransitionSchemaDomain[] SchemaDomains, string ModelRevision, string TimeZone,
    DateTimeOffset CapturedAt, DateOnly EvaluationDate, Guid AttemptId,
    CanonicalMigrationRequest Corpus, CanonicalMigrationRequest Selection,
    byte[] HoldBeforeBytes, byte[] HoldAfterBytes);
internal sealed record V1TransitionAttempt(int Version, string CaptureRequestSha256, Guid AttemptId,
    DateTimeOffset CapturedAt, DateOnly EvaluationDate, string TimeZone);
internal sealed record V1TransitionWriteInput(int Version, string Kind, string CaptureRequestSha256,
    string CaptureAttemptSha256, string CaptureCompletionSha256, string CorpusInventorySha256,
    string SelectionInventorySha256, string ProducerCompletionSha256, RecoveryFile[] ProducerFiles,
    Guid PlanOperationId, Guid RecipeId, Guid ConversionOperationId);

// This input policy is not a capability. The coordinator must freshly admit the
// source, actual service graphs and complete execution delta in every transaction.
internal static class V1AuthorityTransitionPolicy
{
    internal const string ContractSha256 = "9a9c1203919baadb9f361750f99221f3905198cc2d998a3613c589e74120b5a5";
    private const string ContractPath = "docs/handoffs/dependable-portions-next-slice/V1-AUTHORITY-TRANSITION-CONTRACT.json";
    internal static readonly string[] ProducerNames = ["conversion-postgres.json", "conversion-producer.json", "plan-postgres.json", "plan-producer.json"];
    private static readonly UTF8Encoding Utf8 = new(false, true);
    private sealed record Hold(int Version, Guid OperationId, string Candidate, DateTimeOffset CreatedAt,
        string ApiImage, string DatabaseContainer);

    internal static string Bundle(string root) => Path.Combine(root, ".task/v1-authority-transition-execution");

    internal static JsonElement ReadContract(byte[] bytes)
    {
        Require(Hash(bytes) == ContractSha256);
        return Read<JsonElement>(bytes);
    }

    internal static JsonElement Load(string root)
    {
        var contract = ReadContract(Exact(root, ContractPath, ContractSha256));
        foreach (var binding in contract.GetProperty("predecessorBindings").EnumerateArray())
            _ = Exact(root, binding.GetProperty("path").GetString()!, binding.GetProperty("sha256").GetString()!);
        foreach (var name in new[] { "sourceFile", "sourceRow" })
        {
            var binding = contract.GetProperty("prospectiveSelection").GetProperty(name);
            _ = Exact(root, binding.GetProperty("path").GetString()!, binding.GetProperty("sha256").GetString()!);
        }
        _ = V1MigrationPrewritePolicy.Load(root);
        return contract;
    }

    internal static V1TransitionRequest Request(string root, byte[] bytes)
    {
        var contract = Load(root);
        var request = Read<V1TransitionRequest>(bytes);
        Require(request.Kind == "single-recipe-transition-capture");
        request = RequireRuntime(root, request, Bundle(root));
        var original = V1SourceCoveragePolicy.SourceRequest(root,
            V1SourceCoveragePolicy.Load(root, V1MigrationPrewritePolicy.CoverageRequest(root)));
        var source = Read<JsonElement>(original);
        var prior = V1MigrationPrewritePolicy.Load(root);
        Require(Hash(request.HoldBeforeBytes) == prior.GetProperty("originalHoldSha256").GetString());
        var selection = CanonicalRecipeMigrationManifest.FreezeRequest(request.Selection!);
        var corpus = CanonicalRecipeMigrationManifest.FreezeRequest(request.Corpus!);
        var expected = prior.GetProperty("selected").Deserialize<CanonicalMigrationSelection[]>(FoodVocabularyDefinitions.Json)!;
        Require(selection.Selected.Count == 1
            && selection.Selected[0].RecipeId == contract.GetProperty("prospectiveSelection").GetProperty("recipeId").GetGuid()
            && corpus.Selected.Select(x => x.RecipeId).SequenceEqual(expected.Select(x => x.RecipeId).Order())
            && corpus.OperationId != selection.OperationId);
        var operationIds = corpus.Selected.Select(x => x.OperationId).Concat(selection.Selected.Select(x => x.OperationId))
            .Concat([corpus.OperationId, selection.OperationId, request.AttemptId]).ToArray();
        var historical = expected.Select(x => x.OperationId).Append(prior.GetProperty("migrationOperationId").GetGuid())
            .Append(source.GetProperty("recoveryOperationId").GetGuid()).ToHashSet();
        Require(operationIds.Distinct().Count() == operationIds.Length && !operationIds.Any(historical.Contains));
        return request;
    }

    // Shared structural/runtime checks only. Neither this helper nor a parsed
    // request is source authority or permission to execute an effect set.
    internal static V1TransitionRequest RequireRuntime(string root, V1TransitionRequest request, string buildBundle)
    {
        var contract = Load(root);
        Require(request.Version == 1 && request.PlanningContractSha256 == ContractSha256 && Hex(request.CandidateCommit, 40)
            && Hex(request.ApiAssemblySha256, 64) && request.RuntimeImageId is not null
            && Regex.IsMatch(request.RuntimeImageId, "^sha256:[a-f0-9]{64}$")
            && Hex(request.DatabaseContainerId, 64) && request.PostgresVersion?.StartsWith("18.6", StringComparison.Ordinal) == true
            && request.LinuxRuntime == "Linux" && Endpoint(request.SourceEndpoint) && Endpoint(request.ExecutionEndpoint)
            && Identifier(request.SourceRole) && Identifier(request.ExecutionRole) && request.SourceRole != request.ExecutionRole
            && request.SourceGeneration is null && request.ExecutionGeneration is null
            && request.CapturedAt != default && request.EvaluationDate != default && request.AttemptId != Guid.Empty
            && request.TimeZone == "America/Toronto" && request.ModelRevision == CanonicalRecipeContentStore.MigrationModelRevision
            && request.HoldBeforeBytes is { Length: > 0 and <= 65536 } && request.HoldAfterBytes is { Length: > 0 and <= 65536 }
            && request.Corpus is not null && request.Selection is not null);
        var original = V1SourceCoveragePolicy.SourceRequest(root,
            V1SourceCoveragePolicy.Load(root, V1MigrationPrewritePolicy.CoverageRequest(root)));
        var source = Read<JsonElement>(original);
        Require(request.OriginalV4RequestSha256 == Hash(original)
            && request.SourceDatabase == source.GetProperty("databaseName").GetString()
            && request.SourcePristineDatabase == source.GetProperty("pristineDatabaseName").GetString()
            && request.ExecutionDatabase == contract.GetProperty("executionDatabaseProposedName").GetString()
            && request.ExecutionDatabase != request.SourceDatabase
            && SamePath(request.SourceDataRoot, Path.Combine(root, source.GetProperty("copyDataRelativePath").GetString()!))
            && SamePath(request.SourcePristineDataRoot, Path.Combine(root, source.GetProperty("pristineDataRelativePath").GetString()!))
            && SamePath(request.ExecutionDataRoot, Path.Combine(Bundle(root), "execution-data")));
        var selection = CanonicalRecipeMigrationManifest.FreezeRequest(request.Selection!);
        var corpus = CanonicalRecipeMigrationManifest.FreezeRequest(request.Corpus!);
        foreach (var migration in new[] { selection, corpus })
            Require(migration.CandidateSha256 == request.ApiAssemblySha256 && migration.SchemaSha256 == selection.SchemaSha256
                && migration.ModelRevision == request.ModelRevision && migration.SnapshotId == source.GetProperty("snapshotId").GetGuid());
        var hold = Read<Hold>(request.HoldAfterBytes);
        Require(hold.Version == 1 && hold.OperationId == selection.OperationId && hold.Candidate == request.CandidateCommit
            && hold.CreatedAt == request.CapturedAt && hold.ApiImage == request.RuntimeImageId
            && hold.DatabaseContainer == request.DatabaseContainerId);
        RequireSchemaDomains(root, request.SchemaDomains, selection.SchemaSha256);
        Require(request.BuildProvenance is not null && request.BuildProvenance.Path == Path.GetRelativePath(root, Path.Combine(buildBundle, "caller/build.json")).Replace('\\', '/'));
        _ = BoundFile(root, request.BuildProvenance!);
        var assembly = typeof(RecoveryBoundary).Assembly;
        Require(Hash(File.ReadAllBytes(assembly.Location)) == request.ApiAssemblySha256
            && assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion.Split('+').Last()
                .StartsWith(request.CandidateCommit, StringComparison.Ordinal) == true);
        return request with
        {
            Corpus = corpus,
            Selection = selection,
            HoldBeforeBytes = request.HoldBeforeBytes.ToArray(),
            HoldAfterBytes = request.HoldAfterBytes.ToArray()
        };
    }

    internal static V1TransitionAttempt Attempt(byte[] requestBytes, byte[] bytes, DeploymentCalendar calendar)
    {
        var request = Read<V1TransitionRequest>(requestBytes);
        var attempt = Read<V1TransitionAttempt>(bytes);
        var date = calendar.Capture(attempt.CapturedAt);
        Require(attempt.Version == 1 && attempt.CaptureRequestSha256 == Hash(requestBytes)
            && attempt.AttemptId != Guid.Empty && attempt.AttemptId == request.AttemptId
            && attempt.CapturedAt != default && attempt.CapturedAt == request.CapturedAt
            && attempt.EvaluationDate == request.EvaluationDate && attempt.EvaluationDate == date.Today
            && attempt.TimeZone == request.TimeZone && attempt.TimeZone == date.TimeZone);
        return attempt;
    }

    internal static V1TransitionWriteInput WriteAdmission(string root, byte[] requestBytes, byte[] attemptBytes, byte[] bytes)
    {
        var request = Request(root, requestBytes);
        var input = Read<V1TransitionWriteInput>(bytes);
        Require(input.Version == 1 && input.Kind == "single-recipe-transition-write-admission"
            && input.CaptureRequestSha256 == Hash(requestBytes) && input.CaptureAttemptSha256 == Hash(attemptBytes)
            && input.PlanOperationId == request.Selection.OperationId && input.RecipeId == request.Selection.Selected[0].RecipeId
            && input.ConversionOperationId == request.Selection.Selected[0].OperationId);
        RequireCallerInputs(root, requestBytes, attemptBytes, bytes);
        foreach (var (path, hash) in new[] {
            ("capture/request.json", input.CaptureRequestSha256), ("capture/attempt.json", input.CaptureAttemptSha256),
            ("capture/complete.json", input.CaptureCompletionSha256), ("capture/corpus-inventory.json", input.CorpusInventorySha256),
            ("capture/selection-inventory.json", input.SelectionInventorySha256), ("producer/complete.json", input.ProducerCompletionSha256) })
            _ = Exact(Bundle(root), path, hash);
        Require(input.ProducerFiles is { Length: 4 }
            && input.ProducerFiles.All(x => x is not null)
            && input.ProducerFiles.Select(x => x.Path).Order(StringComparer.Ordinal).SequenceEqual(ProducerNames.Select(x => "producer/" + x)));
        foreach (var file in input.ProducerFiles!) _ = BoundFile(Bundle(root), file);
        return input;
    }

    internal static void RequireCallerInputs(string root, byte[] request, byte[] attempt, byte[]? write = null)
    {
        foreach (var (name, bytes) in new[] { ("capture-request.json", request), ("capture-attempt.json", attempt), ("write-input.json", write) })
            if (bytes is not null) Require(Exact(Bundle(root), "caller/" + name, Hash(bytes)).AsSpan().SequenceEqual(bytes));
    }

    private static void RequireSchemaDomains(string root, V1TransitionSchemaDomain[]? domains, string migrationSha)
    {
        Require(domains is { Length: 4 } && domains.All(x => x is not null)
            && domains.Select(x => x.Name).Order(StringComparer.Ordinal).SequenceEqual(new[] { "coverage", "migration", "snapshot", "sourceAdmission" }));
        var previous = Read<JsonElement>(Exact(root, ".task/v1-migration-prewrite-20261115/schema-domains.json",
            "09a088bcc04cd13a9609d594ebfafaa2c633ec7e714f7d52c5d9962630889ed0"));
        foreach (var domain in domains!)
        {
            var prior = previous.GetProperty(domain.Name);
            Require(domain.Sha256 == prior.GetProperty("sha256").GetString()!.ToLowerInvariant() && domain.Relations is not null);
            if (domain.Name == "sourceAdmission")
            {
                Require(domain.Algorithm == "unchanged-v4-complete-prepared-catalog-json");
                var catalog = Read<JsonElement>(Exact(root, prior.GetProperty("descriptor").GetString()!, domain.Sha256));
                Require(domain.Relations!.SequenceEqual(catalog.GetProperty("tables").EnumerateArray().Select(x => x[0].GetString()!)));
            }
            else Require(domain.Algorithm == prior.GetProperty("algorithm").GetString()
                && domain.Relations!.SequenceEqual(prior.GetProperty("relations").EnumerateArray().Select(x => x.GetString()!)));
        }
        Require(domains!.Single(x => x.Name == "migration").Sha256 == migrationSha);
    }

    internal static byte[] BoundFile(string root, RecoveryFile file)
    {
        Require(file is not null && file.Length > 0);
        var bytes = Exact(root, file!.Path, file.Sha256);
        Require(bytes.LongLength == file.Length);
        return bytes;
    }

    internal static byte[] Exact(string root, string relative, string sha)
    {
        Require(Hex(sha, 64) && !string.IsNullOrWhiteSpace(relative) && !Path.IsPathRooted(relative)
            && !relative.Split('/', '\\').Any(x => x is ".." or "." or ""));
        var path = Path.Combine(root, relative);
        RecoverySnapshotService.RejectLinks(path);
        var bytes = File.ReadAllBytes(path);
        Require(Hash(bytes) == sha);
        return bytes;
    }

    private static T Read<T>(byte[] bytes) => FoodVocabularyDefinitions.ReadStrict<T>(Utf8.GetString(bytes));
    private static string Hash(byte[] bytes) => FoodVocabularyDefinitions.Sha256(bytes);
    private static bool Hex(string? text, int length) => Regex.IsMatch(text ?? "", "^[a-f0-9]{" + length + "}$");
    private static bool Identifier(string? text) => Regex.IsMatch(text ?? "", "^[a-z][a-z0-9_]*$");
    private static bool Endpoint(string? text) => Regex.IsMatch(text ?? "", "^[a-zA-Z0-9.-]+:[0-9]{1,5}$");
    private static bool SamePath(string? actual, string expected) => actual is not null && Path.IsPathFullyQualified(actual)
        && actual == Path.GetFullPath(actual) && actual == Path.GetFullPath(expected);
    private static void Require(bool valid) => FoodVocabularyDefinitions.Require(valid);
}
