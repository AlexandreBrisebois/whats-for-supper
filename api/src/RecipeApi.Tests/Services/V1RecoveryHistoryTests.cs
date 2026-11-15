using System.Reflection;
using System.Runtime.ExceptionServices;
using System.Text;
using System.Text.Json;
using RecipeApi.Models;
using RecipeApi.Services;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class V1RecoveryHistoryTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly Type Admission = typeof(CanonicalRecipeContentStore).Assembly.GetType("RecipeApi.Services.V1ExactSourceAdmission")!;
    private static readonly string Policy = Path.Combine(V1AttestationTests.Root, "docs/handoffs/dependable-portions-next-slice");
    private static readonly byte[] Intent = File.ReadAllBytes(Path.Combine(Policy, "V1-RECOVERY-HISTORY-CONTINUATION.json"));
    private static readonly JsonElement Request = JsonDocument.Parse(Intent).RootElement;
    private static Guid Snapshot => Request.GetProperty("snapshotId").GetGuid();
    private static Guid Operation => Request.GetProperty("recoveryOperationId").GetGuid();
    private static string Generation => Request.GetProperty("targetGeneration").GetString()!;

    private static object Call(Type type, string name, object? instance, params object?[] args)
    {
        try { return type.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static)
            .Single(x => x.Name == name && x.GetParameters().Length == args.Length).Invoke(instance, args)!; }
        catch (TargetInvocationException e) { ExceptionDispatchInfo.Capture(e.InnerException!).Throw(); throw; }
    }

    private static (object Context, FoodVocabularyInventoryFacts Facts) Fixture()
    {
        // Isolate the codec trust boundary with two real attested receipts. Only
        // tests invoke the private constructor; production must admit the full source.
        var operations = new[] { "attested-v1-original.json", "attested-v1-duplicate-original.json" }
            .Select(name => JsonSerializer.Deserialize<CanonicalRecipeOperation>(File.ReadAllText(Path.Combine(
                V1AttestationTests.Root, "api/src/RecipeApi.Tests/Fixtures", name)), Json)!).ToArray();
        var set = JsonSerializer.SerializeToElement(new { rows = operations.Select(x => V1AttestationTests.Member(x.OperationId)).ToArray() });
        var admission = Admission.GetConstructors(BindingFlags.Instance | BindingFlags.NonPublic).Single()
            .Invoke([V1AttestationTests.Root, set, Intent, operations]);
        var contextType = Admission.Assembly.GetType("RecipeApi.Services.V1RecoveryHistoryContext");
        // Before the bounded context exists, exercise the actual strict history owner
        // to establish RED instead of failing compilation or a missing-method check.
        var context = contextType is null ? admission : Activator.CreateInstance(contextType,
            BindingFlags.Instance | BindingFlags.NonPublic, null, [admission, Request], null)!;
        var facts = new FoodVocabularyInventoryFacts(new(null), [], operations, [],
            new([], [], [], [], [], [], [], [], [], [], []), new(FoodVocabularyOverrideCoverage.CapturedV1, []));
        return (context, facts);
    }

    private static byte[] Write(object context, FoodVocabularyInventoryFacts facts) =>
        context.GetType() == Admission ? FoodVocabularyInventoryQualification.WriteHistoryObservations(facts, "snapshot", Snapshot, Operation, Generation)
        : (byte[])Call(typeof(FoodVocabularyInventoryQualification), "WriteHistoryObservations", null, facts, "snapshot", Snapshot, Operation, Generation, context);
    private static IReadOnlyList<FoodVocabularyContextFacts> Read(object context, byte[] bytes) =>
        (IReadOnlyList<FoodVocabularyContextFacts>)Call(typeof(FoodVocabularyInventoryQualification), "ReadHistoryObservations", null, bytes, context);

    [Fact]
    public void ExactAttestedReceiptsSurviveEnvelopeReadAndMergeWhileOrdinaryReadersReject()
    {
        var (context, facts) = Fixture();
        Assert.Throws<InvalidDataException>(() => FoodVocabularyInventoryQualification.WriteHistoryObservations(facts, "snapshot", Snapshot, Operation, Generation));
        var bytes = Write(context, facts);
        var read = Assert.Single(Read(context, bytes));
        foreach (var original in facts.CanonicalOperations)
        {
            var saved = Assert.Single(read.Facts.CanonicalOperations, x => x.OperationId == original.OperationId);
            Assert.Equal(Encoding.UTF8.GetBytes(original.OriginalRequest!), Encoding.UTF8.GetBytes(saved.OriginalRequest!));
            Assert.Equal(Encoding.UTF8.GetBytes(original.Result), Encoding.UTF8.GetBytes(saved.Result));
            Assert.Equal(original.InputHash, saved.InputHash);
            Assert.Equal(original.CreatedAt, saved.CreatedAt);
            Assert.Throws<InvalidDataException>(() => CanonicalRecipeContentStore.VocabularyReferences(saved));
        }
        var merged = (byte[])Call(typeof(FoodVocabularyInventoryQualification), "MergeHistoryObservations", null, context, new byte[][] { bytes, bytes });
        Assert.Equal(bytes, merged);
        Assert.Throws<InvalidDataException>(() => FoodVocabularyInventoryQualification.ReadHistoryObservations(bytes));
        Assert.Throws<InvalidDataException>(() => FoodVocabularyInventoryQualification.MergeHistoryObservations(bytes));
        var index = new FoodVocabularyRecoveryIndex(1, Snapshot, Generation, null, FoodVocabularyDefinitions.Sha256(bytes),
            FoodVocabularyOverrideCoverage.CapturedV1, [], []);
        var indexBytes = JsonSerializer.SerializeToUtf8Bytes(index, Json);
        Assert.Single((IReadOnlyList<FoodVocabularyContextFacts>)Call(typeof(FoodVocabularyInventoryQualification), "ValidateRecoveryArtifacts", null,
            indexBytes, bytes, Array.Empty<FoodVocabularyCapture>(), "snapshot", context));
        Assert.Throws<InvalidDataException>(() => FoodVocabularyInventoryQualification.ValidateRecoveryArtifacts(indexBytes, bytes, [], "snapshot"));
    }

    [Theory]
    [InlineData("result-bytes")]
    [InlineData("request-bytes")]
    [InlineData("timestamp")]
    [InlineData("missing")]
    [InlineData("duplicate")]
    [InlineData("unlisted")]
    public void AttestedWriterRejectsChangedReceiptBytesAndMembership(string mutation)
    {
        var (context, facts) = Fixture();
        var operation = facts.CanonicalOperations[0];
        switch (mutation)
        {
            case "result-bytes": operation.Result += " "; break;
            case "request-bytes": operation.OriginalRequest += " "; break;
            case "timestamp": operation.CreatedAt = operation.CreatedAt.AddTicks(10); break;
            case "missing": facts = facts with { CanonicalOperations = facts.CanonicalOperations.Skip(1).ToArray() }; break;
            case "duplicate": facts = facts with { CanonicalOperations = facts.CanonicalOperations.Append(operation).ToArray() }; break;
            case "unlisted": operation.OperationId = Guid.NewGuid(); break;
        }
        Assert.Throws<InvalidDataException>(() => Write(context, facts));
    }

    [Theory]
    [InlineData("kind")]
    [InlineData("snapshot")]
    [InlineData("operation")]
    [InlineData("generation")]
    public void AttestedWriterRejectsForeignContext(string mutation)
    {
        var (context, facts) = Fixture();
        Assert.Throws<InvalidDataException>(() => Call(typeof(FoodVocabularyInventoryQualification), "WriteHistoryObservations", null,
            facts, mutation == "kind" ? "demo" : "snapshot", mutation == "snapshot" ? Guid.NewGuid() : Snapshot,
            mutation == "operation" ? Guid.NewGuid() : Operation, mutation == "generation" ? Guid.NewGuid().ToString("N") : Generation, context));
    }
    [Theory]
    [InlineData("result-bytes")]
    [InlineData("request-bytes")]
    [InlineData("unlisted-duplicate")]
    [InlineData("timestamp")]
    public void RehashedEnvelopeCannotReplaceOriginalReceiptAuthority(string mutation)
    {
        var (context, facts) = Fixture();
        var bytes = Write(context, facts);
        var envelope = JsonSerializer.Deserialize<FoodVocabularyHistoryObservationsV1>(bytes, Json)!;
        var rows = envelope.Observations.ToArray();
        var index = Array.FindIndex(rows, x => x.OwnerKind == "canonical-operation");
        var operation = JsonSerializer.Deserialize<CanonicalRecipeOperation>(rows[index].RawJson, Json)!;
        if (mutation == "result-bytes") operation.Result += " ";
        if (mutation == "request-bytes") operation.OriginalRequest += " ";
        if (mutation == "unlisted-duplicate") operation.OriginalRequest = operation.OriginalRequest!.Replace("\"version\":1", "\"version\":1,\"version\":1");
        if (mutation == "timestamp") operation.CreatedAt = operation.CreatedAt.AddTicks(10);
        var raw = JsonSerializer.Serialize(operation, Json);
        rows[index] = rows[index] with { RawJson = raw, RawSha256 = FoodVocabularyDefinitions.Sha256(Encoding.UTF8.GetBytes(raw)) };
        var sorted = rows.OrderBy(x => x.OwnerKind, StringComparer.Ordinal).ThenBy(x => x.OwnerKey, StringComparer.Ordinal)
            .ThenBy(x => x.RawSha256, StringComparer.Ordinal).ToArray();
        var id = (string)Call(typeof(FoodVocabularyInventoryQualification), "ContextHash", null, rows[0].Context, sorted);
        var changed = JsonSerializer.SerializeToUtf8Bytes(new FoodVocabularyHistoryObservationsV1(1,
            sorted.Select(x => x with { Context = x.Context with { ContextId = id } }).ToArray()), Json);
        Assert.Throws<InvalidDataException>(() => Read(context, changed));
    }

    [Fact]
    public void AttestedMergeRejectsForeignAndMixedContexts()
    {
        var (context, facts) = Fixture();
        var bytes = Write(context, facts);
        var empty = facts with { CanonicalOperations = [] };
        var foreign = FoodVocabularyInventoryQualification.WriteHistoryObservations(empty, "snapshot", Guid.NewGuid(), null, null);
        Assert.Throws<InvalidDataException>(() => Call(typeof(FoodVocabularyInventoryQualification), "MergeHistoryObservations", null,
            context, new byte[][] { bytes, foreign }));
        var package = JsonSerializer.Deserialize<FoodVocabularyHistoryObservationsV1>(bytes, Json)!;
        var other = JsonSerializer.Deserialize<FoodVocabularyHistoryObservationsV1>(foreign, Json)!;
        var mixed = JsonSerializer.SerializeToUtf8Bytes(new FoodVocabularyHistoryObservationsV1(1,
            package.Observations.Concat(other.Observations).ToArray()), Json);
        Assert.Throws<InvalidDataException>(() => Read(context, mixed));
    }

}
