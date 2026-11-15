using System.Reflection;
using System.Runtime.ExceptionServices;
using System.Text.Json;
using System.Text.Json.Nodes;
using RecipeApi.Services;
using RecipeApi.Tests.Integration;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class V1FullSnapshotContinuationTests
{
    private static readonly Type Owner = typeof(CanonicalRecipeContentStore).Assembly.GetType("RecipeApi.Services.V1ExactSourceAdmission")!;
    private const string Policy = "docs/handoffs/dependable-portions-next-slice/";
    private static string Root => DeploymentCalendarPostgresTests.RepositoryRoot();
    private static byte[] Request => File.ReadAllBytes(Path.Combine(Root, Policy, "V1-FULL-SNAPSHOT-CONTINUATION.json"));

    private static object Load(string root, byte[] request)
    {
        try { return Owner.GetMethod("LoadAdmissionPolicy", BindingFlags.NonPublic | BindingFlags.Static)!.Invoke(null, [root, request])!; }
        catch (TargetInvocationException error) { ExceptionDispatchInfo.Capture(error.InnerException!).Throw(); throw; }
    }

    // The finite source is local operational input. Copy its exact predecessor
    // delivery bytes into an isolated policy fixture so CI needs no retained .task tree.
    private static void WithPolicy(Action<string> action)
    {
        var root = Path.Combine(Root, ".task", "full-snapshot-policy-" + Guid.NewGuid().ToString("N"));
        try
        {
            foreach (var path in Directory.GetFiles(Path.Combine(Root, Policy), "V1-*"))
                Copy(path, Path.Combine(root, Policy, Path.GetFileName(path)));
            foreach (var name in new[] { "schema.sql", "compatibility.sql", "migrate.sh" })
                Copy(Path.Combine(Root, "api/database", name), Path.Combine(root, "api/database", name));
            Copy(Path.Combine(Root, "api/src/RecipeApi.Tests/Fixtures/V1FullSnapshot/history-delivery.json"),
                Path.Combine(root, ".task/v1-recovery-history-20261114/delivery.json"));
            Copy(Path.Combine(Root, "api/src/RecipeApi.Tests/Fixtures/V1FullSnapshot/chromium-disposition.json"),
                Path.Combine(root, ".task/chromium-provisioning-20261114/delivery.json"));
            action(root);
        }
        finally { if (Directory.Exists(root)) Directory.Delete(root, true); }
    }

    private static void Copy(string source, string target)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        File.Copy(source, target);
    }

    [Fact]
    public void SeparatelySelectedRequestBindsOriginalAuthorityAndPredecessorDelivery() => WithPolicy(root =>
    {
        Assert.NotNull(Load(root, Request));
        Assert.Throws<InvalidDataException>(() => V1AttestationTests.LoadPolicy(root, Request));
        Assert.NotNull(Load(root, File.ReadAllBytes(Path.Combine(root, Policy, "V1-RECOVERY-HISTORY-CONTINUATION.json"))));
    });

    [Theory]
    [InlineData("recoveryOperationId")]
    [InlineData("targetGeneration")]
    [InlineData("snapshotId")]
    [InlineData("stagingRelativePath")]
    [InlineData("authorityRelativePath")]
    [InlineData("independentCopyRelativePath")]
    [InlineData("packageSha256")]
    [InlineData("schemaContinuationSha256")]
    public void ForeignRequestCannotConferAuthority(string field) => WithPolicy(root =>
    {
        var changed = JsonNode.Parse(Request)!;
        changed[field] = "foreign";
        Assert.Throws<InvalidDataException>(() => Load(root, JsonSerializer.SerializeToUtf8Bytes(changed)));
    });

    [Theory]
    [InlineData(".task/v1-recovery-history-20261114/delivery.json")]
    [InlineData(".task/chromium-provisioning-20261114/delivery.json")]
    [InlineData("docs/handoffs/dependable-portions-next-slice/V1-RECOVERY-HISTORY-CONTINUATION.json")]
    [InlineData("docs/handoffs/dependable-portions-next-slice/V1-SOURCE-SCHEMA.json")]
    [InlineData("docs/handoffs/dependable-portions-next-slice/V1-PREPARED-SCHEMA.json")]
    [InlineData("api/database/compatibility.sql")]
    public void MissingOrCorruptPredecessorCannotAuthorizeSuccessor(string relative) => WithPolicy(root =>
    {
        Assert.NotNull(Load(root, Request));
        var path = Path.Combine(root, relative);
        File.AppendAllText(path, " ");
        Assert.Throws<InvalidDataException>(() => Load(root, Request));
        File.Delete(path);
        Assert.ThrowsAny<IOException>(() => Load(root, Request));
    });

    [Fact]
    public void PredecessorPreparationCannotAuthorizeNewOperation() => WithPolicy(root =>
    {
        var request = JsonSerializer.Deserialize<JsonElement>(Request);
        var path = Path.Combine(root, request.GetProperty("preparationReceiptRelativePath").GetString()!);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var verify = Owner.GetMethod("VerifyPreparationReceipt", BindingFlags.NonPublic | BindingFlags.Static)!;
        foreach (var predecessor in new[] { "0bc8fc02687eeb74f93f099e3b08c58559bdc335f97508fc795c60f56652270b",
            "a8aabc6e9f5b5e78a057328769119cb6bc3f8fcc3ca55f71d6b85f1b0bff202f" })
        {
            File.WriteAllText(path, predecessor + "\n");
            var error = Assert.Throws<TargetInvocationException>(() => verify.Invoke(null, [root, request]));
            Assert.IsType<InvalidDataException>(error.InnerException);
        }
        File.WriteAllText(path, "8e4692096d14c4554622e6c6b3c9b659c985dbc2506651e6d3273124abbee299\n");
        verify.Invoke(null, [root, request]);
    });

    [Theory]
    [InlineData("new_protected_table", true)]
    [InlineData("recipes/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/unreviewed.json", false)]
    public void UnexplainedSourceOmissionsFailClosed(string name, bool table)
    {
        var method = Owner.GetMethod(table ? "ClassifySnapshotTable" : "ClassifySnapshotFile", BindingFlags.NonPublic | BindingFlags.Static)!;
        var error = Assert.Throws<TargetInvocationException>(() => method.Invoke(null, [name, false]));
        Assert.IsType<InvalidDataException>(error.InnerException);
    }

    [Theory]
    [InlineData("workflow_tasks", "typed-history-and-original-backup")]
    [InlineData("recipe_search_documents", "derived-excluded")]
    [InlineData("recipe_votes", "transient-voting-excluded")]
    [InlineData("recovery_publication", "coordinator-state-excluded")]
    public void TableDispositionNamesItsActualRecoveryBoundary(string table, string expected)
    {
        var disposition = Owner.GetMethod("ClassifySnapshotTable", BindingFlags.NonPublic | BindingFlags.Static)!.Invoke(null, [table, false])!;
        Assert.Equal(expected, disposition.GetType().GetProperty("Disposition")!.GetValue(disposition));
        Assert.False(string.IsNullOrWhiteSpace((string)disposition.GetType().GetProperty("Owner")!.GetValue(disposition)!));
        Assert.False(string.IsNullOrWhiteSpace((string)disposition.GetType().GetProperty("Reason")!.GetValue(disposition)!));
    }

    [Fact]
    public void TriggerOrderingPreservesEveryCatalogFieldAndDuplicateMultiplicity()
    {
        var original = JsonNode.Parse(File.ReadAllBytes(Path.Combine(Root, Policy, "V1-PREPARED-SCHEMA.json")))!;
        var changed = original.DeepClone();
        var triggers = changed["triggers"]!.AsArray();
        var positions = triggers.Select((row, index) => (row, index)).Where(x =>
            x.row![0]!.GetValue<string>() == "grocery_extra_occurrences"
            && x.row[1]!.GetValue<string>().EndsWith(":17", StringComparison.Ordinal)).Select(x => x.index).ToArray();
        Assert.Equal(2, positions.Length);
        var first = triggers[positions[0]]!.DeepClone();
        triggers[positions[0]] = triggers[positions[1]]!.DeepClone();
        triggers[positions[1]] = first;
        var compare = Owner.GetMethod("SameFullSnapshotCatalog", BindingFlags.NonPublic | BindingFlags.Static)!;
        bool Same(JsonNode value) => (bool)compare.Invoke(null, [JsonSerializer.Deserialize<JsonElement>(value.ToJsonString()),
            JsonSerializer.Deserialize<JsonElement>(original.ToJsonString())])!;
        Assert.False(JsonElement.DeepEquals(JsonSerializer.Deserialize<JsonElement>(changed.ToJsonString()),
            JsonSerializer.Deserialize<JsonElement>(original.ToJsonString())));
        Assert.True(Same(changed));
        triggers[positions[0]]![2] = "D";
        Assert.False(Same(changed));
        changed = original.DeepClone();
        changed["triggers"]!.AsArray().Add(first.DeepClone());
        Assert.False(Same(changed));
        changed = original.DeepClone();
        changed["triggers"]!.AsArray().RemoveAt(positions[0]);
        Assert.False(Same(changed));
        changed = original.DeepClone();
        changed["columns"]![0]![1] = "unreviewed_column";
        Assert.False(Same(changed));
    }
}
