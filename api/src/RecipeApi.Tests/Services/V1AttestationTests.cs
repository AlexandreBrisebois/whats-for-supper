using System.Reflection;
using System.Runtime.ExceptionServices;
using System.Text.Json;
using System.Text.Json.Nodes;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Integration;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class V1AttestationTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    internal static string Root => DeploymentCalendarPostgresTests.RepositoryRoot();
    internal static JsonElement Member(Guid id)
    {
        foreach (var name in new[] { "attested-v1-original.json", "attested-v1-duplicate-original.json" })
        {
            using var document = JsonDocument.Parse(File.ReadAllBytes(Path.Combine(Root, "api/src/RecipeApi.Tests/Fixtures", name)));
            if (document.RootElement.GetProperty("operationId").GetGuid() == id)
                return document.RootElement.GetProperty("attestationMember").Clone();
        }
        throw new InvalidDataException("Unlisted attestation test fixture.");
    }
    internal static CanonicalRecipeOperation Original() => JsonSerializer.Deserialize<CanonicalRecipeOperation>(
        File.ReadAllText(Path.Combine(Root, "api/src/RecipeApi.Tests/Fixtures/attested-v1-original.json")), Json)!;

    internal static CanonicalRecipeWriteResult Validate(CanonicalRecipeOperation operation, JsonElement member)
    {
        try { return (CanonicalRecipeWriteResult)typeof(CanonicalRecipeContentStore).GetMethod("ValidateAttestedV1", BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null, [operation, member])!; }
        catch (TargetInvocationException error) { ExceptionDispatchInfo.Capture(error.InnerException!).Throw(); throw; }
    }

    internal static object LoadPolicy(string root, byte[] intent)
    {
        try { return typeof(CanonicalRecipeContentStore).Assembly.GetType("RecipeApi.Services.V1ExactSourceAdmission")!
            .GetMethod("LoadPolicy", BindingFlags.Static | BindingFlags.NonPublic)!.Invoke(null, [root, intent])!; }
        catch (TargetInvocationException error) { ExceptionDispatchInfo.Capture(error.InnerException!).Throw(); throw; }
    }

    [Fact]
    public void OnlyPinnedApprovalPackageMembershipAndReviewedIntentLoad()
    {
        var intent = File.ReadAllBytes(Path.Combine(Root, "docs/handoffs/dependable-portions-next-slice/V1-ADMISSION-INTENT.json"));
        Assert.NotNull(LoadPolicy(Root, intent));
        Assert.Throws<InvalidDataException>(() => LoadPolicy(Root, intent.Concat(new byte[] { 32 }).ToArray()));
    }

    [Theory]
    [InlineData("V1-AUTHORITY-APPROVAL.json")]
    [InlineData("V1-AUTHORITY-PACKAGE.json")]
    [InlineData("V1-ATTESTATION-SET.json")]
    [InlineData("V1-AUTHORITY-DECISION.md")]
    [InlineData("V1-HISTORICAL-AUTHORITY.json")]
    public void MissingOrChangedPolicyEvidenceFailsClosed(string name)
    {
        var directory = Path.Combine(Root, ".task", "wfs-v1-policy-" + Guid.NewGuid().ToString("N"));
        var relative = "docs/handoffs/dependable-portions-next-slice";
        Directory.CreateDirectory(Path.Combine(directory, relative));
        try
        {
            foreach (var file in Directory.GetFiles(Path.Combine(Root, relative), "V1-*"))
                File.Copy(file, Path.Combine(directory, relative, Path.GetFileName(file)));
            var intent = File.ReadAllBytes(Path.Combine(directory, relative, "V1-ADMISSION-INTENT.json"));
            var path = Path.Combine(directory, relative, name);
            File.AppendAllText(path, " ");
            Assert.Throws<InvalidDataException>(() => LoadPolicy(directory, intent));
            File.Delete(path);
            Assert.ThrowsAny<IOException>(() => LoadPolicy(directory, intent));
        }
        finally { Directory.Delete(directory, true); }
    }

    [Fact]
    public void ExactOriginalDerivesRecordedFreshBindingsWhileOrdinaryV1StillRejects()
    {
        var operation = Original();
        Assert.Throws<InvalidDataException>(() => CanonicalRecipeContentStore.VocabularyReferences(operation));
        var result = Validate(operation, Member(operation.OperationId));
        Assert.Equal("fcf82c8745a644909b224497b972a5da", result.Content.ContentRevision);
        Assert.NotEmpty(result.Content.InstructionSections.SelectMany(x => x.Steps).SelectMany(x => x.Bindings));
        Assert.Throws<InvalidDataException>(() => CanonicalRecipeContentStore.VocabularyReferences(operation));
    }

    [Fact]
    public void ExactEnumeratedHistoricalDuplicatesValidateButPublicReadersReject()
    {
        var operation = JsonSerializer.Deserialize<CanonicalRecipeOperation>(File.ReadAllText(Path.Combine(Root,
            "api/src/RecipeApi.Tests/Fixtures/attested-v1-duplicate-original.json")), Json)!;
        Assert.Throws<InvalidDataException>(() => CanonicalRecipeContentStore.VocabularyReferences(operation));
        Assert.Equal("b0c129114a854327bea874d917fe8ea4", Validate(operation, Member(operation.OperationId)).Content.ContentRevision);
    }

    [Theory]
    [InlineData("conflicting")]
    [InlineData("additional")]
    public void DetachedDuplicateMutationsCannotInheritAttestation(string mutation)
    {
        var operation = JsonSerializer.Deserialize<CanonicalRecipeOperation>(File.ReadAllText(Path.Combine(Root,
            "api/src/RecipeApi.Tests/Fixtures/attested-v1-duplicate-original.json")), Json)!;
        var member = Member(operation.OperationId);
        var request = JsonNode.Parse(operation.OriginalRequest!)!;
        var input = request["input"]!.GetValue<string>();
        Assert.Contains("\"kind\":\"scalar\",\"kind\":\"scalar\"", input);
        request["input"] = mutation == "conflicting" ? input.Replace("\"kind\":\"scalar\",\"kind\":\"scalar\"", "\"kind\":\"range\",\"kind\":\"scalar\"")
            : input.Replace("\"kind\":\"scalar\",\"kind\":\"scalar\"", "\"kind\":\"scalar\",\"kind\":\"scalar\",\"kind\":\"scalar\"");
        operation.OriginalRequest = request.ToJsonString();
        Assert.Throws<InvalidDataException>(() => Validate(operation, member));
    }

    [Theory]
    [InlineData("request")]
    [InlineData("baseline")]
    [InlineData("input-hash")]
    [InlineData("result")]
    [InlineData("coherent-binding-id")]
    [InlineData("version")]
    [InlineData("identity")]
    [InlineData("timestamp")]
    public void ChangedReceiptCannotInheritExactAttestation(string mutation)
    {
        var operation = Original(); var member = Member(operation.OperationId);
        switch (mutation)
        {
            case "request": operation.OriginalRequest += " "; break;
            case "baseline":
                var request = JsonNode.Parse(operation.OriginalRequest!)!;
                request["baseline"]!["notes"] = "Detached changed baseline fact";
                operation.OriginalRequest = request.ToJsonString();
                Assert.NotEqual(Original().OriginalRequest, operation.OriginalRequest); break;
            case "input-hash": operation.InputHash = new('0', 64); break;
            case "result": operation.Result += " "; break;
            case "version": operation.OriginalRequest = operation.OriginalRequest!.Replace("\"version\":1", "\"version\":99"); break;
            case "identity": operation.OperationId = Guid.NewGuid(); break;
            case "timestamp": operation.CreatedAt = operation.CreatedAt.AddTicks(10); break;
            case "coherent-binding-id":
                var result = JsonNode.Parse(operation.Result)!;
                var id = result["content"]!["instructionSections"]![0]!["steps"]![0]!["bindings"]![0]!["id"]!.GetValue<string>();
                operation.Result = operation.Result.Replace(id, Guid.NewGuid().ToString()); break;
        }
        Assert.Throws<InvalidDataException>(() => Validate(operation, member));
    }
}
