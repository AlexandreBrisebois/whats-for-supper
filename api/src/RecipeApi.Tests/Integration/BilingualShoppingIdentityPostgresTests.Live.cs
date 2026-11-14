using System.Diagnostics;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class BilingualShoppingIdentityPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public async Task LiveBrowser_ReviewedEnFrPublicationAndGeneratedClientQuantitySave()
    {
        var browserRoot = Environment.GetEnvironmentVariable("WFS_BOUNDED_BROWSER_ROOT")
            ?? throw new InvalidOperationException("Requires an isolated built PWA source copy.");
        var evidence = Environment.GetEnvironmentVariable("WFS_BOUNDED_EVIDENCE")
            ?? throw new InvalidOperationException("Requires an owned evidence directory.");
        Assert.True(File.Exists(Path.Combine(browserRoot, "pwa", ".next", "BUILD_ID")));
        Directory.CreateDirectory(evidence);
        var pwaPort = DeploymentCalendarPostgresTests.FreePort();
        var pwaUrl = $"http://127.0.0.1:{pwaPort}";
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var provider = new Mock<IChatClient>(MockBehavior.Strict);
            var network = new Mock<IHttpClientFactory>(MockBehavior.Strict);
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
                new DeploymentCalendarIntegrationTests.CalendarClock(), new()
                {
                    ["Calendar:TimeZone"] = "America/Toronto",
                    ["Tests:PostgresConnectionString"] = settings.ConnectionString,
                    ["Tests:LocalRecipeStore"] = "true",
                    ["Tests:HttpUrl"] = "http://127.0.0.1:0"
                }, configureApplication: app =>
                {
                    app.MapFallback("{**path}", async context =>
                    {
                        using var gateway = new HttpClient();
                        using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), pwaUrl + context.Request.Path + context.Request.QueryString);
                        if (context.Request.ContentLength > 0) request.Content = new StreamContent(context.Request.Body);
                        foreach (var header in context.Request.Headers)
                            if (!string.Equals(header.Key, "Host", StringComparison.OrdinalIgnoreCase))
                                request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                        try
                        {
                            using var response = await gateway.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, context.RequestAborted);
                            context.Response.StatusCode = (int)response.StatusCode;
                            foreach (var header in response.Headers.Concat(response.Content.Headers)) context.Response.Headers[header.Key] = header.Value.ToArray();
                            context.Response.Headers.Remove("transfer-encoding");
                            await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                        }
                        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
                    });
                }, configureServices: registrations =>
                {
                    registrations.RemoveAll<IChatClient>();
                    registrations.AddSingleton(provider.Object);
                    registrations.RemoveAll<IHttpClientFactory>();
                    registrations.AddSingleton(network.Object);
                });
            await TomorrowPushPostgresTests.Seed(factory);
            using var scope = factory.Services.CreateScope();
            var services = scope.ServiceProvider;
            var db = services.GetRequiredService<RecipeDbContext>();
            await services.GetRequiredService<FoodVocabularyStore>().PublishReviewedAsync(
                BoundedVocabularyInput.Bytes(), null, Guid.NewGuid(), BoundedVocabularyInput.ReviewIdentity);
            var imports = new Dictionary<string, ImportedSource>
            {
                ["en"] = await ImportAsync(services, "en"),
                ["fr"] = await ImportAsync(services, "fr")
            };
            var originalRecipes = await db.Recipes.AsNoTracking().Where(x => imports.Values.Select(value => value.Id).Contains(x.Id)).ToArrayAsync();
            var originalFiles = VocabularyFiles(services);
            var calls = imports.ToDictionary(x => x.Key, x => x.Value.Provider.Invocations.Count);
            var member = await db.FamilyMembers.Select(x => x.Id).FirstAsync();
            ProcessStartInfo Command(params string[] arguments)
            {
                var start = new ProcessStartInfo("node")
                {
                    WorkingDirectory = Path.Combine(browserRoot, "pwa"), RedirectStandardOutput = true, RedirectStandardError = true
                };
                foreach (var argument in arguments) start.ArgumentList.Add(argument);
                foreach (var name in new[] { "CI", "WFS_E2E_SUITE", "PORT" }) start.Environment.Remove(name);
                start.Environment["BASE_URL"] = factory.HttpAddress;
                start.Environment["API_INTERNAL_URL"] = factory.HttpAddress;
                start.Environment["NEXT_PUBLIC_API_BASE_URL"] = "";
                start.Environment["NEXT_PUBLIC_ENVIRONMENT"] = "test";
                start.Environment["NEXT_TELEMETRY_DISABLED"] = "1";
                start.Environment["HEARTH_SECRET"] = TestWebApplicationFactory.TestSecret;
                start.Environment["BILINGUAL_SOURCE_IDS"] = JsonSerializer.Serialize(imports.ToDictionary(x => x.Key, x => x.Value.Id));
                start.Environment["BILINGUAL_MEMBER_ID"] = member.ToString("D");
                start.Environment["PLAYWRIGHT_JSON_OUTPUT_NAME"] = Path.Combine(evidence, "browser-results.json");
                return start;
            }
            using var server = Process.Start(Command("node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", pwaPort.ToString()))!;
            var serverOut = server.StandardOutput.ReadToEndAsync();
            var serverError = server.StandardError.ReadToEndAsync();
            try
            {
                using var probe = new HttpClient();
                var ready = false;
                for (var attempt = 0; attempt < 100; attempt++)
                {
                    try { ready = (await probe.GetAsync(pwaUrl + "/welcome")).IsSuccessStatusCode; }
                    catch (HttpRequestException) { }
                    if (ready || server.HasExited) break;
                    await Task.Delay(300);
                }
                Assert.True(ready, "Owned PWA did not become ready.");
                using var browser = Process.Start(Command("node_modules/@playwright/test/cli.js", "test", "bilingual-publication-live.spec.ts",
                    "--workers=1", "--retries=0", "--reporter=line,json", "--output", Path.Combine(evidence, "browser-artifacts")))!;
                var browserOut = browser.StandardOutput.ReadToEndAsync();
                var browserError = browser.StandardError.ReadToEndAsync();
                try
                {
                    await browser.WaitForExitAsync().WaitAsync(TimeSpan.FromMinutes(4));
                    Assert.Equal(0, browser.ExitCode);
                }
                finally
                {
                    if (!browser.HasExited) browser.Kill(entireProcessTree: true);
                    await browser.WaitForExitAsync();
                    await File.WriteAllTextAsync(Path.Combine(evidence, "browser.log"), await browserOut);
                    await File.WriteAllTextAsync(Path.Combine(evidence, "browser-error.log"), await browserError);
                }
                foreach (var (locale, imported) in imports)
                {
                    var recipe = await db.Recipes.AsNoTracking().SingleAsync(x => x.Id == imported.Id);
                    var original = originalRecipes.Single(x => x.Id == recipe.Id);
                    var content = CanonicalRecipeContentStore.Read(recipe)!;
                    Assert.Equal("50", content.IngredientLines[0].AmountText);
                    Assert.Equal(original.RawMetadata, recipe.RawMetadata);
                    Assert.Equal(CanonicalRecipeContentStore.Read(original)!.IngredientLines.Select(x => x.Shopping), content.IngredientLines.Select(x => x.Shopping));
                    var saved = JsonSerializer.Deserialize<RecipeFoodMappingEvidence>(recipe.FoodMappingEvidence!, Json)!;
                    Assert.Equal(3, saved.Mappings.Length);
                    Assert.All(saved.Mappings, mapping => Assert.Equal(content.ContentRevision, mapping.Facts.ContentRevision));
                    Assert.Equal(calls[locale], imported.Provider.Invocations.Count);
                }
                Assert.Equal(originalFiles, VocabularyFiles(services));
                Assert.Empty(provider.Invocations);
                Assert.Empty(network.Invocations);
                await File.WriteAllTextAsync(Path.Combine(evidence, "persisted-result.json"), JsonSerializer.Serialize(new
                {
                    recipes = await db.Recipes.AsNoTracking().Where(x => imports.Values.Select(value => value.Id).Contains(x.Id))
                        .Select(x => new { x.Id, x.CanonicalContent, x.FoodMappingEvidence, x.RawMetadata }).ToArrayAsync(),
                    vocabularyFiles = JsonSerializer.Deserialize<JsonElement>(originalFiles), providerCalls = provider.Invocations.Count, networkCalls = network.Invocations.Count
                }, Json));
            }
            finally
            {
                if (!server.HasExited) server.Kill(entireProcessTree: true);
                await server.WaitForExitAsync();
                await File.WriteAllTextAsync(Path.Combine(evidence, "server.log"), await serverOut);
                await File.WriteAllTextAsync(Path.Combine(evidence, "server-error.log"), await serverError);
            }
        });
    }
}
