using System.Diagnostics;
using System.Text.Json;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientEditPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_CanonicalIngredientCorrection() => RunCanonicalBrowser(mixed: false);

    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public Task LiveBrowser_CanonicalMixedIncompleteBaseline() => RunCanonicalBrowser(mixed: true);

    private async Task RunCanonicalBrowser(bool mixed)
    {
        // The task runner prepares an immutable production-built source copy.
        // Ordinary application composition never registers the canonical store.
        var browserRoot = Environment.GetEnvironmentVariable("WFS_CANONICAL_BROWSER_ROOT")
            ?? throw new InvalidOperationException("Requires an isolated production-built PWA copy.");
        var evidenceRoot = Environment.GetEnvironmentVariable("WFS_CANONICAL_EVIDENCE")
            ?? throw new InvalidOperationException("Requires a unique evidence directory.");
        var evidence = Path.Combine(evidenceRoot, mixed ? "mixed" : "correction");
        Assert.True(File.Exists(Path.Combine(browserRoot, "pwa", ".next", "BUILD_ID")));
        Directory.CreateDirectory(evidence);
        var pwaPort = DeploymentCalendarPostgresTests.FreePort();
        var pwaUrl = $"http://127.0.0.1:{pwaPort}";
        var monday = new DateOnly(2026, 10, 12);
        await WithEditor(async (factory, before) =>
        {
            Guid secondMember;
            var savedBaseline = before;
            if (mixed)
            {
                using var seedClient = factory.CreateAuthenticatedClient();
                var created = await seedClient.PatchAsJsonAsync($"/api/recipes/{Id}", new
                {
                    expectedContentRevision = before.ContentRevision,
                    ingredientLines = new[] { Row(before.IngredientLines[0]), Row(before.IngredientLines[1]),
                        Row(before.IngredientLines[0]) with { Id = null, ClientId = "mixed-unknown", Description = "Additional pasta", Amount = null, AmountText = null } }
                });
                Assert.Equal(System.Net.HttpStatusCode.OK, created.StatusCode);
                using var body = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
                using var scope = factory.Services.CreateScope();
                savedBaseline = CanonicalRecipeContentStore.Read(await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking().SingleAsync(x => x.Id == Id))!;
                Assert.Equal(body.RootElement.GetProperty("createdIds").GetProperty("mixed-unknown").GetGuid(), savedBaseline.IngredientLines[2].Id);
            }
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var member = new FamilyMember { Id = Guid.NewGuid(), Name = "Second shopper" };
                secondMember = member.Id;
                db.FamilyMembers.Add(member);
                db.FamilySettings.Add(new FamilySetting { Key = SupperServingsService.DefaultKey,
                    Value = JsonSerializer.SerializeToElement(new { servings = 8, version = Guid.NewGuid() }) });
                await db.SaveChangesAsync();
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
            }
            ProcessStartInfo Command(params string[] args)
            {
                var start = new ProcessStartInfo("node") { WorkingDirectory = Path.Combine(browserRoot, "pwa"),
                    RedirectStandardOutput = true, RedirectStandardError = true };
                foreach (var arg in args) start.ArgumentList.Add(arg);
                foreach (var key in new[] { "CI", "WFS_E2E_SUITE", "PORT" }) start.Environment.Remove(key);
                start.Environment["BASE_URL"] = factory.HttpAddress;
                start.Environment["API_INTERNAL_URL"] = factory.HttpAddress;
                start.Environment["NEXT_PUBLIC_API_BASE_URL"] = "";
                start.Environment["NEXT_PUBLIC_ENVIRONMENT"] = "test";
                start.Environment["NEXT_TELEMETRY_DISABLED"] = "1";
                start.Environment["HEARTH_SECRET"] = TestWebApplicationFactory.TestSecret;
                start.Environment["CANONICAL_RECIPE_ID"] = Id.ToString();
                start.Environment["CANONICAL_MEMBERS"] = $"{factory.DefaultFamilyMemberId},{secondMember}";
                start.Environment["PLAYWRIGHT_JSON_OUTPUT_NAME"] = Path.Combine(evidence, "browser-results.json");
                return start;
            }
            using var server = Process.Start(Command("node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", pwaPort.ToString()))!;
            var stdout = Pump(server.StandardOutput, Path.Combine(evidence, "server.log"));
            var stderr = Pump(server.StandardError, Path.Combine(evidence, "server-error.log"));
            await File.WriteAllTextAsync(Path.Combine(evidence, "live-resource.json"), JsonSerializer.Serialize(new
            { api = factory.HttpAddress, pwa = pwaUrl, pid = server.Id, browserRoot, stopped = false }));
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
                Assert.True(ready, "Owned production PWA did not become ready.");
                using var browser = Process.Start(Command("node_modules/@playwright/test/cli.js", "test", "canonical-ingredient-live.spec.ts", "--grep", mixed ? "mixed incomplete baseline" : "original correction",
                    "--workers=1", "--retries=0", "--reporter=line,json", "--output", Path.Combine(evidence, "browser-artifacts")))!;
                var browserOut = Pump(browser.StandardOutput, Path.Combine(evidence, "browser.log"));
                var browserError = Pump(browser.StandardError, Path.Combine(evidence, "browser-error.log"));
                try
                {
                    await browser.WaitForExitAsync().WaitAsync(TimeSpan.FromMinutes(4));
                    await Task.WhenAll(browserOut, browserError);
                    Assert.Equal(0, browser.ExitCode);
                }
                finally { await StopOwned(browser); }
                using var final = factory.Services.CreateScope();
                var finalDb = final.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var saved = await finalDb.Recipes.AsNoTracking().SingleAsync(x => x.Id == Id);
                var content = CanonicalRecipeContentStore.Read(saved)!;
                Assert.Equal(before.SourceRevision, content.SourceRevision);
                Assert.Equal(savedBaseline.IngredientLines.Select(x => x.Id), content.IngredientLines.Select(x => x.Id));
                if (mixed)
                {
                    Assert.Equal("200", content.IngredientLines[0].AmountText);
                    Assert.Equal("150", content.IngredientLines[1].AmountText);
                    Assert.Equal("100", content.IngredientLines[2].AmountText);
                    Assert.Equal("g", content.IngredientLines[2].Unit!.Text);
                }
                else
                {
                    Assert.Equal("Retained family pasta", saved.Name);
                    Assert.Equal(RecipeRating.Love, saved.Rating);
                    Assert.Equal("2", content.IngredientLines[0].AmountText);
                    Assert.Equal("cup", content.IngredientLines[0].Unit!.Text);
                    Assert.Equal(JsonSerializer.Serialize(before.IngredientLines[1]), JsonSerializer.Serialize(content.IngredientLines[1]));
                }
                var plan = await finalDb.WeeklyPlans.AsNoTracking().SingleAsync(x => x.WeekStartDate == monday);
                var rows = JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!;
                var checks = JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)!;
                Assert.True(checks[rows.Single(x => x.NormalizedKey == "pasta").RowId]);
                Assert.Equal(!mixed, checks[rows.Single(x => x.NormalizedKey == "sauce").RowId]);
                using var baselines = JsonDocument.Parse(plan.GroceryCheckedDemandBaselines);
                var baseline = baselines.RootElement.GetProperty(rows.Single(x => x.NormalizedKey == "pasta").RowId);
                Assert.Equal("g", baseline.GetProperty("Unit").GetString());
                Assert.Equal(LegacyGroceryQuantity.Parse(mixed ? "400" : "500"), baseline.GetProperty("Quantity").Deserialize<GroceryQuantity>());
                if (mixed) Assert.False(baseline.GetProperty("QuantityComplete").GetBoolean());
                await File.WriteAllTextAsync(Path.Combine(evidence, "persisted-result.json"), JsonSerializer.Serialize(new
                { content, rows, checks, baseline, operations = await finalDb.CanonicalRecipeOperations.CountAsync() }, Json));
            }
            finally
            {
                await StopOwned(server);
                await Task.WhenAll(stdout, stderr);
                await File.WriteAllTextAsync(Path.Combine(evidence, "live-resource.json"), JsonSerializer.Serialize(new
                { api = factory.HttpAddress, pwa = pwaUrl, pid = server.Id, browserRoot, stopped = server.HasExited }));
            }
        }, application =>
        {
            // Test-only work dispatch. Executes the existing recompute owner; it
            // does not bypass revision checks or activate normal composition.
            application.MapPost("/_test/canonical/recompute", async (GroceryRecomputeService service) =>
            {
                await service.RecomputeForWeekAsync(monday, default);
                return Results.Ok();
            }).ExcludeFromDescription().RequireAuthorization();
            application.MapFallback("{**path}", async context =>
            {
                using var gateway = new HttpClient();
                using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), pwaUrl + context.Request.Path + context.Request.QueryString);
                if (context.Request.ContentLength > 0) request.Content = new StreamContent(context.Request.Body);
                foreach (var header in context.Request.Headers)
                    if (!string.Equals(header.Key, "Host", StringComparison.OrdinalIgnoreCase)) request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
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
        });
    }

    private static async Task Pump(StreamReader reader, string path)
    {
        await using var log = new StreamWriter(path) { AutoFlush = true };
        while (await reader.ReadLineAsync() is { } line) await log.WriteLineAsync(line);
    }
    private static async Task StopOwned(Process process)
    {
        if (!process.HasExited)
        {
            using var terminate = Process.Start(new ProcessStartInfo("kill") { ArgumentList = { "-TERM", process.Id.ToString() } });
            if (terminate is not null) await terminate.WaitForExitAsync();
            try { await process.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(15)); }
            catch (TimeoutException) { process.Kill(true); await process.WaitForExitAsync(); }
        }
    }
}
