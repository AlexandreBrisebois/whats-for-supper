using System.Reflection;
using System.Runtime.ExceptionServices;
using System.Text.Json;
using System.Text.Json.Nodes;
using RecipeApi.Services;
using RecipeApi.Tests.Integration;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class V1RecoveryHistoryContinuationTests
{
    private static readonly Type Owner = typeof(CanonicalRecipeContentStore).Assembly.GetType("RecipeApi.Services.V1ExactSourceAdmission")!;
    private const string Policy = "docs/handoffs/dependable-portions-next-slice/";
    private static string Root => DeploymentCalendarPostgresTests.RepositoryRoot();
    private static byte[] Intent => File.ReadAllBytes(Path.Combine(Root, Policy, "V1-RECOVERY-HISTORY-CONTINUATION.json"));
    private static object Load(string root, byte[] bytes)
    {
        try { return Owner.GetMethod("LoadAdmissionPolicy", BindingFlags.NonPublic | BindingFlags.Static)!.Invoke(null, [root, bytes])!; }
        catch (TargetInvocationException e) { ExceptionDispatchInfo.Capture(e.InnerException!).Throw(); throw; }
    }

    [Fact]
    public void ContinuationIsSeparateFromImmutableOriginalIntent()
    {
        Assert.NotNull(Load(Root, Intent));
        Assert.Throws<InvalidDataException>(() => V1AttestationTests.LoadPolicy(Root, Intent));
        var predecessor = File.ReadAllBytes(Path.Combine(Root, Policy, "V1-ADMISSION-INTENT.json"));
        Assert.NotNull(Load(Root, predecessor));
        Assert.NotNull(V1AttestationTests.LoadPolicy(Root, predecessor));
    }

    [Theory]
    [InlineData("recoveryOperationId")]
    [InlineData("targetGeneration")]
    [InlineData("predecessorIntentSha256")]
    [InlineData("sourceDumpSha256")]
    [InlineData("schemaContinuationSha256")]
    [InlineData("snapshotId")]
    [InlineData("historyKind")]
    [InlineData("stagingRelativePath")]
    public void ChangedContinuationCannotConferAuthority(string field)
    {
        var changed = JsonNode.Parse(Intent)!;
        changed[field] = "foreign";
        Assert.Throws<InvalidDataException>(() => Load(Root, JsonSerializer.SerializeToUtf8Bytes(changed)));
    }

    [Theory]
    [InlineData("docs/handoffs/dependable-portions-next-slice/V1-SCHEMA-CONTINUATION.json")]
    [InlineData("docs/handoffs/dependable-portions-next-slice/V1-SOURCE-SCHEMA.json")]
    [InlineData("docs/handoffs/dependable-portions-next-slice/V1-PREPARED-SCHEMA.json")]
    [InlineData("docs/handoffs/dependable-portions-next-slice/V1-ADMISSION-INTENT.json")]
    [InlineData("api/database/schema.sql")]
    [InlineData("api/database/compatibility.sql")]
    [InlineData("api/database/migrate.sh")]
    public void MissingOrCorruptBoundEvidenceFailsClosed(string relative)
    {
        var copy = Path.Combine(Root, ".task", "v1-history-policy-" + Guid.NewGuid().ToString("N"));
        try
        {
            foreach (var source in Directory.GetFiles(Path.Combine(Root, Policy), "V1-*"))
            {
                var target = Path.Combine(copy, Policy, Path.GetFileName(source));
                Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                File.Copy(source, target);
            }
            foreach (var name in new[] { "schema.sql", "compatibility.sql", "migrate.sh" })
            {
                var target = Path.Combine(copy, "api/database", name);
                Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                File.Copy(Path.Combine(Root, "api/database", name), target);
            }
            Assert.NotNull(Load(copy, Intent));
            var path = Path.Combine(copy, relative);
            File.AppendAllText(path, " ");
            Assert.Throws<InvalidDataException>(() => Load(copy, Intent));
            File.Delete(path);
            Assert.ThrowsAny<IOException>(() => Load(copy, Intent));
        }
        finally { if (Directory.Exists(copy)) Directory.Delete(copy, true); }
    }
}
