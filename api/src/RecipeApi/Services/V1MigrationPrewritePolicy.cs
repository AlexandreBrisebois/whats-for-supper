using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Security.Cryptography;
using System.Reflection;

namespace RecipeApi.Services;

internal sealed record V1MigrationRequest(int Version, string ContractSha256, CanonicalMigrationRequest Migration,
    string CandidateCommit, string DatabaseName, string SourceDataRoot, string ExecutionDataRoot,
    string RuntimeImage, string DatabaseContainer, byte[] HoldBytes);
internal sealed record V1MigrationAttempt(int Version, string RequestSha256, DateTimeOffset CapturedAt,
    DateOnly EvaluationDate, string TimeZone);

// Finite task continuation. v4 and v5 dispatch and ordinary readers stay unchanged.
internal static class V1MigrationPrewritePolicy
{
    internal const string ContractSha256 = "17e9493bd45d532a555ed642e064770d10774a44e45461ac2040ab42dc8a83a6";
    private const string ContractPath = "docs/handoffs/dependable-portions-next-slice/V1-MIGRATION-PREWRITE-CONTRACT.json";

    internal static JsonElement ReadContract(byte[] bytes)
    {
        FoodVocabularyDefinitions.Require(FoodVocabularyDefinitions.Sha256(bytes) == ContractSha256);
        return FoodVocabularyDefinitions.ReadStrict<JsonElement>(new UTF8Encoding(false, true).GetString(bytes));
    }

    internal static JsonElement Load(string root)
    {
        var contract = ReadContract(Exact(root, ContractPath, ContractSha256));
        foreach (var binding in contract.GetProperty("bindings").EnumerateArray())
            _ = Exact(root, binding.GetProperty("path").GetString()!, binding.GetProperty("sha256").GetString()!);
        _ = V1SourceCoveragePolicy.Load(root, CoverageRequest(root));
        return contract;
    }

    internal static byte[] CoverageRequest(string root) => Exact(root,
        "docs/handoffs/dependable-portions-next-slice/V1-SOURCE-COVERAGE-CONTINUATION.json", V1SourceCoveragePolicy.RequestSha256);

    internal static V1MigrationRequest Request(string root, byte[] bytes, string database, string sourceRoot, string executionRoot)
    {
        var contract = Load(root);
        var request = FoodVocabularyDefinitions.ReadStrict<V1MigrationRequest>(new UTF8Encoding(false, true).GetString(bytes));
        var migration = CanonicalRecipeMigrationManifest.FreezeRequest(request.Migration);
        var selections = contract.GetProperty("selected").Deserialize<CanonicalMigrationSelection[]>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        FoodVocabularyDefinitions.Require(request.Version == 1 && request.ContractSha256 == ContractSha256
            && migration.OperationId == contract.GetProperty("migrationOperationId").GetGuid()
            && migration.SnapshotId == contract.GetProperty("sourceSnapshotId").GetGuid()
            && migration.ModelRevision == CanonicalRecipeContentStore.MigrationModelRevision
            && migration.Selected.SequenceEqual(selections.OrderBy(x => x.RecipeId))
            && request.DatabaseName == database && database.StartsWith("wfs_", StringComparison.Ordinal)
            && Path.GetFullPath(request.SourceDataRoot) == Path.GetFullPath(sourceRoot)
            && Path.GetFullPath(request.ExecutionDataRoot) == Path.GetFullPath(executionRoot)
            && Path.GetFullPath(executionRoot) == Path.GetFullPath(Path.Combine(root, contract.GetProperty("executionDataRelativePath").GetString()!))
            && Regex.IsMatch(request.CandidateCommit, "^[a-f0-9]{40}$")
            && Regex.IsMatch(request.RuntimeImage, "^sha256:[a-f0-9]{64}$")
            && Regex.IsMatch(request.DatabaseContainer, "^[a-f0-9]{64}$")
            && request.HoldBytes.Length is > 0 and <= 65536);
        var assembly = typeof(RecoveryBoundary).Assembly;
        FoodVocabularyDefinitions.Require(Convert.ToHexStringLower(SHA256.HashData(File.ReadAllBytes(assembly.Location))) == migration.CandidateSha256
            && assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion.Split('+').Last().StartsWith(request.CandidateCommit, StringComparison.Ordinal) == true);
        return request with { Migration = migration, HoldBytes = request.HoldBytes.ToArray() };
    }

    internal static V1MigrationAttempt Attempt(byte[] request, byte[] bytes, DeploymentCalendar calendar)
    {
        var attempt = FoodVocabularyDefinitions.ReadStrict<V1MigrationAttempt>(new UTF8Encoding(false, true).GetString(bytes));
        var date = calendar.Capture(attempt.CapturedAt);
        FoodVocabularyDefinitions.Require(attempt.Version == 1 && attempt.RequestSha256 == FoodVocabularyDefinitions.Sha256(request)
            && attempt.CapturedAt != default && attempt.EvaluationDate == date.Today && attempt.TimeZone == date.TimeZone);
        return attempt;
    }

    internal static string Bundle(string root, V1MigrationRequest request) => Path.Combine(root,
        ".task/v1-migration-prewrite-20261115/observations", request.CandidateCommit, request.Migration.CandidateSha256);

    private static byte[] Exact(string root, string relative, string sha)
    {
        FoodVocabularyDefinitions.Require(!Path.IsPathRooted(relative) && !relative.Split('/', '\\').Contains(".."));
        var path = Path.Combine(root, relative);
        RecoverySnapshotService.RejectLinks(path);
        var bytes = File.ReadAllBytes(path);
        FoodVocabularyDefinitions.Require(FoodVocabularyDefinitions.Sha256(bytes) == sha);
        return bytes;
    }
}
