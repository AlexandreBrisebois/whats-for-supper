using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Services;

public sealed class RecoveryVocabularyContractTests
{
    [Theory]
    [InlineData("null")]
    [InlineData("[]")]
    [InlineData("{\"unknown\":true}")]
    [InlineData("{\"expectedDestinationRevision\":42}")]
    [InlineData("{\"expectedDestinationRevision\":\"BAD\"}")]
    [InlineData("{\"expectedDestinationRevision\":null,\"expectedDestinationRevision\":null}")]
    public Task Restore_RejectsMalformedClosedRequestBeforeCreatingStage(string body) => Check(body, malformed: true);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData("{}")]
    [InlineData("{\"expectedDestinationRevision\":null}")]
    [InlineData("{\"expectedDestinationRevision\":\"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef\"}")]
    public Task Restore_AcceptsOptionalBodyAndReachesSnapshotOwner(string? body) => Check(body, malformed: false);

    private static async Task Check(string? body, bool malformed)
    {
        var testRoot = Path.Combine(OperatingSystem.IsMacOS() ? "/private/tmp" : Path.GetTempPath(), "wfs-recovery-contract-" + Guid.NewGuid().ToString("N"));
        var backup = Path.Combine(testRoot, "backups");
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new()
        { ["Recovery:BackupRoot"] = backup, ["DataRoot"] = Path.Combine(testRoot, "data") });
        using var client = factory.CreateAuthenticatedClient();
        using var response = await client.PostAsync($"/api/management/recovery/restore/{Guid.NewGuid()}",
            body is null ? null : new StringContent(body, Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<RecoveryError>();
        Assert.Equal("invalid", error!.State);
        if (malformed) Assert.NotEqual("Snapshot manifest is missing.", error.Message);
        else Assert.Equal("Snapshot manifest is missing.", error.Message);
        Assert.False(Directory.Exists(backup));
        using var scope = factory.Services.CreateScope();
        var roots = scope.ServiceProvider.GetRequiredService<RecipesRootResolver>();
        Assert.False(File.Exists(Path.Combine(roots.BaseRoot, ".recovery-journal.json")));
        Assert.False(Directory.Exists(Path.Combine(roots.BaseRoot, ".recovery-generations")));
        Assert.Null(roots.Generation);
        if (Directory.Exists(testRoot)) Directory.Delete(testRoot, true);
    }
}
