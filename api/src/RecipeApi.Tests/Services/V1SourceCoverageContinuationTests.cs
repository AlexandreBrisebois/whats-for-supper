using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class V1SourceCoverageContinuationTests
{
    private static readonly string Root = V1AttestationTests.Root;
    private const string Relative = "docs/handoffs/dependable-portions-next-slice/V1-SOURCE-COVERAGE-CONTINUATION.json";
    private static byte[] Request => File.ReadAllBytes(Path.Combine(Root, Relative));

    private static JsonElement Read(byte[] bytes)
    {
        var owner = typeof(CanonicalRecipeContentStore).Assembly.GetType("RecipeApi.Services.V1SourceCoveragePolicy");
        // Before the coverage-only owner exists, exercise the delivered finite
        // request owner: its rejection is the intended missing-behavior RED.
        var type = owner ?? typeof(CanonicalRecipeContentStore).Assembly.GetType("RecipeApi.Services.V1ExactSourceAdmission")!;
        var method = type.GetMethod(owner is null ? "FullSnapshotPolicy" : "ReadRequest", BindingFlags.Static | BindingFlags.NonPublic)!;
        try { return (JsonElement)method.Invoke(null, owner is null ? [Root, bytes] : [bytes])!; }
        catch (TargetInvocationException error) { System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(error.InnerException!).Throw(); throw; }
    }

    [Fact]
    public void CoverageRequestHasSeparateIdentityWithoutChangingSchemaOrHistoryAuthority()
    {
        var coverage = Read(Request);
        var source = JsonSerializer.Deserialize<JsonElement>(File.ReadAllBytes(Path.Combine(Root,
            "docs/handoffs/dependable-portions-next-slice/V1-FULL-SNAPSHOT-CONTINUATION.json")));
        Assert.Equal(5, coverage.GetProperty("version").GetInt32());
        Assert.NotEqual(source.GetProperty("recoveryOperationId").GetGuid(), coverage.GetProperty("coverageOperationId").GetGuid());
        Assert.NotEqual(source.GetProperty("targetGeneration").GetString(), coverage.GetProperty("coverageGeneration").GetString());
        Assert.Equal(source.GetProperty("snapshotId").GetGuid(), coverage.GetProperty("sourceSnapshotId").GetGuid());
        Assert.Equal("PROPOSED-NOT-AUTHORIZED-FOR-EXECUTION", coverage.GetProperty("status").GetString());
        Assert.False(coverage.GetProperty("executionAuthorized").GetBoolean());
    }

    [Theory]
    [InlineData("coverageOperationId")]
    [InlineData("coverageGeneration")]
    [InlineData("sourceSnapshotId")]
    [InlineData("sourceFullSnapshotRequestSha256")]
    [InlineData("taskOutputRelativePath")]
    [InlineData("requiredIndependentCopyRelativePath")]
    [InlineData("executionAuthorized")]
    public void ForeignCoverageRequestCannotConferAuthority(string field)
    {
        var changed = JsonNode.Parse(Request)!;
        changed[field] = "foreign";
        Assert.Throws<InvalidDataException>(() => Read(JsonSerializer.SerializeToUtf8Bytes(changed)));
    }

    [Fact]
    public void ReserializingPinnedRequestCannotSubstituteForItsOriginalBytes()
        => Assert.Throws<InvalidDataException>(() => Read(JsonSerializer.SerializeToUtf8Bytes(JsonNode.Parse(Request))));
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void DetachedAttemptCannotChooseAnotherTimeOrRepresentation(bool changeTime)
    {
        var request = Request;
        var original = JsonSerializer.SerializeToUtf8Bytes(new { version = 1,
            requestSha256 = Convert.ToHexStringLower(System.Security.Cryptography.SHA256.HashData(request)),
            capturedAt = DateTimeOffset.Parse("2026-11-15T01:02:03Z") });
        var changed = changeTime
            ? JsonSerializer.SerializeToUtf8Bytes(new { version = 1,
                requestSha256 = Convert.ToHexStringLower(System.Security.Cryptography.SHA256.HashData(request)),
                capturedAt = DateTimeOffset.Parse("2026-11-16T01:02:03Z") })
            : original.Concat(new byte[] { 32 }).ToArray();
        var method = typeof(RecoverySnapshotService).GetMethod("RequireCoverageAttempt", BindingFlags.NonPublic | BindingFlags.Static);
        var fallback = typeof(RecoverySnapshotService).GetMethod("RequireSnapshotAttempt", BindingFlags.NonPublic | BindingFlags.Static)!;
        void Validate()
        {
            try { (method ?? fallback).Invoke(null, method is null ? [changed, request] : [original, changed, request]); }
            catch (TargetInvocationException error) { System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(error.InnerException!).Throw(); }
        }
        Assert.Throws<InvalidDataException>(Validate);
    }

}
