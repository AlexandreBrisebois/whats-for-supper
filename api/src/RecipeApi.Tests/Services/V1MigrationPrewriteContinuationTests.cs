using System.Reflection;
using System.Text.Json;
using RecipeApi.Services;
using Microsoft.Extensions.Configuration;
using System.Security.Cryptography;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class V1MigrationPrewriteContinuationTests
{
    private static byte[] Contract => File.ReadAllBytes(Path.Combine(V1AttestationTests.Root,
        "docs/handoffs/dependable-portions-next-slice/V1-MIGRATION-PREWRITE-CONTRACT.json"));

    private static JsonElement Read(byte[] bytes)
    {
        var policy = typeof(CanonicalRecipeContentStore).Assembly.GetType("RecipeApi.Services.V1MigrationPrewritePolicy");
        var owner = policy ?? typeof(CanonicalRecipeContentStore).Assembly.GetType("RecipeApi.Services.V1ExactSourceAdmission")!;
        try
        {
            return (JsonElement)owner.GetMethod(policy is null ? "FullSnapshotPolicy" : "ReadContract", BindingFlags.NonPublic | BindingFlags.Static)!
                .Invoke(null, policy is null ? [V1AttestationTests.Root, bytes] : [bytes])!;
        }
        catch (TargetInvocationException error)
        {
            System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(error.InnerException!).Throw();
            throw;
        }
    }

    [Fact]
    public void FiniteContractPreservesSeparateSourceAuthorityAndCompleteSelectedMembership()
    {
        var contract = Read(Contract);
        Assert.Equal("attested-v1-migration-inventory-and-prewrite-only", contract.GetProperty("kind").GetString());
        var selected = contract.GetProperty("selected").EnumerateArray().ToArray();
        Assert.Equal(221, selected.Length);
        Assert.Equal(selected.Length, selected.Select(x => x.GetProperty("recipeId").GetGuid()).Distinct().Count());
        Assert.Equal(selected.Length, selected.Select(x => x.GetProperty("operationId").GetGuid()).Distinct().Count());
        Assert.Equal("93198cda23ad116f1b6880d9333537295e6118e7cdc373016dc81953ac6d473d", contract.GetProperty("originalHoldSha256").GetString());
    }

    [Fact]
    public void ReserializedOrForeignContractCannotSupplyAuthority()
    {
        Assert.Throws<InvalidDataException>(() => Read(JsonSerializer.SerializeToUtf8Bytes(JsonSerializer.Deserialize<JsonElement>(Contract))));
        Assert.Throws<InvalidDataException>(() => Read("{}"u8.ToArray()));
    }

    [Theory]
    [InlineData("2026-11-15", "America/Toronto", true)]
    [InlineData("2026-11-16", "America/Toronto", false)]
    [InlineData("2026-11-15", "UTC", false)]
    public void AttemptUsesDeploymentDateRatherThanUtcDate(string evaluationDate, string timeZone, bool valid)
    {
        var request = "independent request bytes"u8.ToArray();
        var bytes = JsonSerializer.SerializeToUtf8Bytes(new { version = 1, requestSha256 = Convert.ToHexStringLower(SHA256.HashData(request)),
            capturedAt = DateTimeOffset.Parse("2026-11-16T02:00:00Z"), evaluationDate, timeZone });
        var calendar = new DeploymentCalendar(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            { ["Calendar:TimeZone"] = "America/Toronto" }).Build());
        void Validate()
        {
            try { typeof(CanonicalRecipeContentStore).Assembly.GetType("RecipeApi.Services.V1MigrationPrewritePolicy")!
                .GetMethod("Attempt", BindingFlags.NonPublic | BindingFlags.Static)!.Invoke(null, [request, bytes, calendar]); }
            catch (TargetInvocationException error) { System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(error.InnerException!).Throw(); }
        }
        if (valid) Validate(); else Assert.Throws<InvalidDataException>(Validate);
    }

    [Fact]
    public void InvocationLocalSourceCannotOutliveItsOwner()
    {
        var type = typeof(CanonicalRecipeContentStore).Assembly.GetType("RecipeApi.Services.V1MigrationSource")!;
        var source = (IDisposable)Activator.CreateInstance(type, [null, null, null, null, null])!;
        type.GetMethod("RequireActive", BindingFlags.NonPublic | BindingFlags.Instance)!.Invoke(source, null);
        source.Dispose();
        var error = Assert.Throws<TargetInvocationException>(() => type.GetMethod("RequireActive", BindingFlags.NonPublic | BindingFlags.Instance)!.Invoke(source, null));
        Assert.IsType<InvalidDataException>(error.InnerException);
    }
}
