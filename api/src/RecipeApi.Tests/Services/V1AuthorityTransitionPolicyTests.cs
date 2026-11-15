using System.Reflection;
using System.Runtime.ExceptionServices;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class V1AuthorityTransitionPolicyTests
{
    private static byte[] Contract => File.ReadAllBytes(Path.Combine(V1AttestationTests.Root,
        "docs/handoffs/dependable-portions-next-slice/V1-AUTHORITY-TRANSITION-CONTRACT.json"));

    private static JsonElement Read(byte[] bytes)
    {
        var assembly = typeof(CanonicalRecipeContentStore).Assembly;
        var owner = assembly.GetType("RecipeApi.Services.V1AuthorityTransitionPolicy")
            ?? assembly.GetType("RecipeApi.Services.V1MigrationPrewritePolicy")!;
        try { return (JsonElement)owner.GetMethod("ReadContract", BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null, [bytes])!; }
        catch (TargetInvocationException error) { ExceptionDispatchInfo.Capture(error.InnerException!).Throw(); throw; }
    }

    [Fact]
    public void FiniteSuccessorContractKeepsOriginalMembershipAndDistinctSingleSelection()
    {
        var contract = Read(Contract);
        Assert.Equal("first-single-recipe-authority-transition-planning", contract.GetProperty("kind").GetString());
        Assert.Equal(46, contract.GetProperty("originalReceiptMembership").GetInt32());
        Assert.Equal(221, contract.GetProperty("corpusAccounting").GetProperty("recipes").GetInt32());
        Assert.Equal(1, contract.GetProperty("maximumNewCanonicalV2Receipts").GetInt32());
        Assert.Equal(0, contract.GetProperty("maximumNewWeekReceipts").GetInt32());
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("{\"version\":1,\"version\":1}")]
    public void ForeignContractCannotGrantSuccessorAuthority(string json) =>
        Assert.Throws<InvalidDataException>(() => Read(System.Text.Encoding.UTF8.GetBytes(json)));

    private static object Invoke(string name, params object?[] args)
    {
        var type = typeof(CanonicalRecipeContentStore).Assembly.GetType("RecipeApi.Services.V1AuthorityTransitionPolicy")!;
        try { return type.GetMethod(name, BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null, args)!; }
        catch (TargetInvocationException error) { ExceptionDispatchInfo.Capture(error.InnerException!).Throw(); throw; }
    }

    [Theory]
    [InlineData("valid")]
    [InlineData("date")]
    [InlineData("time-zone")]
    [InlineData("attempt")]
    [InlineData("request-hash")]
    [InlineData("captured-at")]
    [InlineData("unknown-property")]
    [InlineData("missing-property")]
    [InlineData("duplicate-property")]
    public void CaptureAttemptCannotChangeIndependentlyRetainedIdentity(string mutation)
    {
        var at = DateTimeOffset.Parse("2026-11-16T02:00:00Z");
        var attemptId = Guid.NewGuid();
        var request = JsonSerializer.SerializeToUtf8Bytes(new
        {
            version = 1, kind = "single-recipe-transition-capture", planningContractSha256 = new string('a', 64),
            candidateCommit = new string('a', 40), apiAssemblySha256 = new string('a', 64),
            buildProvenance = new RecoveryFile("caller/build.json", 1, new string('a', 64)),
            runtimeImageId = "sha256:" + new string('a', 64), databaseContainerId = new string('a', 64),
            postgresVersion = "18.6", linuxRuntime = "Linux", sourceEndpoint = "127.0.0.1:5432", executionEndpoint = "127.0.0.1:5432",
            sourceRole = "source", executionRole = "execution", sourcePristineDatabase = "pristine", sourceDatabase = "source",
            executionDatabase = "execution", sourceDataRoot = "/source", sourcePristineDataRoot = "/pristine", executionDataRoot = "/execution",
            sourceGeneration = (string?)null, executionGeneration = (string?)null, originalV4RequestSha256 = new string('a', 64),
            schemaDomains = Array.Empty<object>(), modelRevision = "test", timeZone = "America/Toronto", capturedAt = at,
            evaluationDate = "2026-11-15", attemptId, corpus = (object?)null, selection = (object?)null,
            holdBeforeBytes = new byte[] { 1 }, holdAfterBytes = new byte[] { 2 }
        }, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var value = JsonSerializer.SerializeToNode(new
        {
            version = 1, captureRequestSha256 = Convert.ToHexStringLower(SHA256.HashData(request)), attemptId,
            capturedAt = at, evaluationDate = "2026-11-15", timeZone = "America/Toronto"
        })!.AsObject();
        switch (mutation)
        {
            case "date": value["evaluationDate"] = "2026-11-16"; break;
            case "time-zone": value["timeZone"] = "UTC"; break;
            case "attempt": value["attemptId"] = Guid.NewGuid(); break;
            case "request-hash": value["captureRequestSha256"] = new string('b', 64); break;
            case "captured-at": value["capturedAt"] = at.AddMinutes(1); break;
            case "unknown-property": value["approved"] = true; break;
            case "missing-property": value.Remove("attemptId"); break;
        }
        var text = value.ToJsonString();
        if (mutation == "duplicate-property") text = text.Replace("\"version\":1", "\"version\":1,\"version\":1");
        var calendar = new DeploymentCalendar(new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Calendar:TimeZone"] = "America/Toronto" }).Build());
        void Validate() => Invoke("Attempt", request, System.Text.Encoding.UTF8.GetBytes(text), calendar);
        if (mutation == "valid") Validate(); else Assert.Throws<InvalidDataException>(Validate);
    }

    [Fact]
    public void RehashedDerivedWitnessCannotReplaceCallerBytes()
    {
        var root = Path.Combine(V1AttestationTests.Root, ".task", "wfs-transition-policy-" + Guid.NewGuid().ToString("N"));
        var caller = Path.Combine(root, ".task/v1-authority-transition-execution/caller");
        Directory.CreateDirectory(caller);
        var request = "request"u8.ToArray(); var attempt = "attempt"u8.ToArray(); var write = "independent write input"u8.ToArray();
        try
        {
            File.WriteAllBytes(Path.Combine(caller, "capture-request.json"), request);
            File.WriteAllBytes(Path.Combine(caller, "capture-attempt.json"), attempt);
            File.WriteAllBytes(Path.Combine(caller, "write-input.json"), write);
            Invoke("RequireCallerInputs", root, request, attempt, write);
            Assert.Throws<InvalidDataException>(() => Invoke("RequireCallerInputs", root, request, attempt, "replacement witness"u8.ToArray()));
            File.WriteAllBytes(Path.Combine(caller, "write-input.json"), "replacement witness"u8.ToArray());
            Assert.Throws<InvalidDataException>(() => Invoke("RequireCallerInputs", root, request, attempt, write));
        }
        finally { Directory.Delete(root, true); }
    }
}
