using System.Diagnostics;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class BilingualShoppingIdentityPostgresTests
{
    private async Task VerifyProgramRestartsAsync(string connectionString, string recipeRoot, Guid id,
        string canonical, string evidence, string files, string membership)
    {
        var options = new DbContextOptionsBuilder<RecipeDbContext>().UseNpgsql(connectionString).Options;
        await using var db = new RecipeDbContext(options);
        // This restart fixture observes a quiescent library. Defer its manually
        // driven producer tasks so real startup workers cannot rerun extraction.
        var deferredUntil = DateTimeOffset.UtcNow.AddYears(1);
        await db.WorkflowTasks.ExecuteUpdateAsync(setters => setters.SetProperty(x => x.ScheduledAt, deferredUntil));
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseKestrel().UseUrls("http://127.0.0.1:0");
        await using var unavailableProvider = builder.Build();
        var providerCalls = 0;
        unavailableProvider.MapFallback(() =>
        {
            Interlocked.Increment(ref providerCalls);
            return Results.StatusCode(503);
        });
        await unavailableProvider.StartAsync();
        var providerUrl = unavailableProvider.Services.GetRequiredService<IServer>()
            .Features.Get<IServerAddressesFeature>()!.Addresses.Single();
        var dataRoot = recipeRoot + ".process-data";
        var backupRoot = dataRoot + ".backups";
        var inheritedWorkflowRoot = recipeRoot + ".foreign-workflows";
        var assembly = typeof(FoodVocabularyStore).Assembly.Location;
        try
        {
            Directory.CreateDirectory(inheritedWorkflowRoot);
            await File.WriteAllTextAsync(Path.Combine(inheritedWorkflowRoot, "sentinel"), "Preserve this owned canary.");
            for (var iteration = 0; iteration < 2; iteration++)
            {
                var url = $"http://127.0.0.1:{DeploymentCalendarPostgresTests.FreePort()}";
                var start = new ProcessStartInfo("dotnet")
                {
                    WorkingDirectory = Path.GetDirectoryName(assembly)!, RedirectStandardOutput = true, RedirectStandardError = true
                };
                start.ArgumentList.Add(assembly);
                start.ArgumentList.Add("--urls");
                start.ArgumentList.Add(url);
                // Simulate an inherited configuration-style root using an owned canary.
                start.Environment["WorkflowsRoot"] = inheritedWorkflowRoot;
                foreach (var key in start.Environment.Keys.Where(key => key.StartsWith("GEMINI_", StringComparison.Ordinal)
                    || key is "DATA_ROOT" or "RECIPES_ROOT" or "WORKFLOWS_ROOT" or "POSTGRES_CONNECTION_STRING").ToArray())
                    start.Environment.Remove(key);
                start.Environment["POSTGRES_CONNECTION_STRING"] = connectionString;
                start.Environment["DataRoot"] = dataRoot;
                start.Environment["RecipesRoot"] = recipeRoot;
                start.Environment["WorkflowsRoot"] = Path.Combine(dataRoot, "workflows");
                start.Environment["Recovery__BackupRoot"] = backupRoot;
                start.Environment["Calendar__TimeZone"] = "America/Toronto";
                start.Environment["HEARTH_SECRET"] = TestWebApplicationFactory.TestSecret;
                start.Environment["GEMINI_API_KEY"] = "unavailable-provider-fixture";
                start.Environment["GEMINI_ENDPOINT"] = providerUrl + "/v1beta/openai/";
                start.Environment["HTTP_PROXY"] = providerUrl;
                start.Environment["HTTPS_PROXY"] = providerUrl;
                start.Environment["NO_PROXY"] = "127.0.0.1,localhost";
                start.Environment["DEMO_MODE"] = "false";
                start.Environment["ASPNETCORE_ENVIRONMENT"] = "Production";
                using var process = Process.Start(start)!;
                var stdout = process.StandardOutput.ReadToEndAsync();
                var stderr = process.StandardError.ReadToEndAsync();
                try
                {
                    using var client = new HttpClient { BaseAddress = new Uri(url), Timeout = TimeSpan.FromSeconds(2) };
                    client.DefaultRequestHeaders.Add("X-Hearth-Secret", TestWebApplicationFactory.TestSecret);
                    var ready = false;
                    for (var attempt = 0; attempt < 100; attempt++)
                    {
                        try { ready = (await client.GetAsync("/api/health")).IsSuccessStatusCode; }
                        catch (HttpRequestException) { }
                        if (ready || process.HasExited) break;
                        await Task.Delay(100);
                    }
                    Assert.True(ready, "Owned Program.cs process did not become ready.");
                    using var response = await client.GetAsync($"/api/recipes/{id}");
                    response.EnsureSuccessStatusCode();
                    using var detail = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                    using var original = JsonDocument.Parse(canonical);
                    Assert.Equal(original.RootElement.GetProperty("contentRevision").GetString(),
                        detail.RootElement.GetProperty("recipe").GetProperty("contentRevision").GetString());
                    var saved = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == id);
                    Assert.Equal(canonical, saved.CanonicalContent);
                    Assert.Equal(evidence, saved.FoodMappingEvidence);
                    Assert.Equal(membership, (await db.FamilySettings.AsNoTracking().SingleAsync(x => x.Key == "food_vocabulary_publication")).Value.GetRawText());
                    var currentFiles = JsonSerializer.Serialize(Directory.GetFiles(Path.Combine(recipeRoot, ".household", "food-vocabulary"))
                        .Order(StringComparer.Ordinal).Select(path => new { Name = Path.GetFileName(path), Sha256 = FoodVocabularyDefinitions.Sha256(File.ReadAllBytes(path)) }));
                    Assert.Equal(files, currentFiles);
                    Assert.Equal(new[] { "sentinel" }, Directory.GetFiles(inheritedWorkflowRoot).Select(Path.GetFileName).Order());
                    Assert.Equal(0, Volatile.Read(ref providerCalls));
                    output.WriteLine("BILINGUAL_PROGRAM_RESTART " + JsonSerializer.Serialize(new
                    {
                        iteration, process.Id, assemblySha256 = FoodVocabularyDefinitions.Sha256(File.ReadAllBytes(assembly)),
                        reference = BoundedVocabularyInput.Reference, providerCalls, vocabularyFiles = JsonSerializer.Deserialize<JsonElement>(currentFiles)
                    }, Json));
                }
                finally
                {
                    if (!process.HasExited) process.Kill(entireProcessTree: true);
                    await process.WaitForExitAsync();
                    var outputText = await stdout;
                    var errorText = await stderr;
                    if (process.ExitCode != 137 && process.ExitCode != 0 && process.ExitCode != -1)
                        output.WriteLine(outputText + "\n" + errorText);
                }
            }
        }
        finally
        {
            await unavailableProvider.StopAsync();
            if (Directory.Exists(dataRoot)) Directory.Delete(dataRoot, true);
            if (Directory.Exists(backupRoot)) Directory.Delete(backupRoot, true);
            if (Directory.Exists(inheritedWorkflowRoot)) Directory.Delete(inheritedWorkflowRoot, true);
        }
    }
}
