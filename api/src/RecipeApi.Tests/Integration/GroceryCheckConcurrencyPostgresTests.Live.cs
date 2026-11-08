using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Models;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class GroceryCheckConcurrencyPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public async Task LiveBrowser_IndependentWaterRowsConvergeAndRejectOlderSnapshot()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings =>
        {
            var connection = settings.ConnectionString;
            var pwaUrl = $"http://127.0.0.1:{DeploymentCalendarPostgresTests.FreePort()}";
            RecipeApi.Dto.ScheduleDays? olderSnapshot = null;
            await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(new DeploymentCalendarIntegrationTests.CalendarClock(), new()
            {
                ["Tests:PostgresConnectionString"] = connection,
                ["Calendar:TimeZone"] = "America/Toronto",
                ["Tests:HttpUrl"] = "http://127.0.0.1:0"
            }, application =>
            {
                application.MapPost("/_test/ux/snapshot/capture", async (ScheduleService service) =>
                {
                    olderSnapshot = await service.GetScheduleAsync(0);
                    return Results.Ok();
                }).ExcludeFromDescription().RequireAuthorization();
                application.MapPost("/_test/ux/snapshot/release", async (IScheduleEventPublisher publisher) =>
                {
                    await publisher.PublishWeekUpdatedAsync(olderSnapshot!);
                    return Results.Ok();
                }).ExcludeFromDescription().RequireAuthorization();
                // The deployment gateway serves PWA navigation and terminates API/SSE here.
                application.MapFallback("{**path}", async context =>
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
                    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
                    {
                        // Development HMR navigation aborts the proxy stream after headers start.
                        // A disconnected client cannot receive an error response.
                    }
                });
            });
            await using var db = new RecipeApi.Data.RecipeDbContext(new DbContextOptionsBuilder<RecipeApi.Data.RecipeDbContext>().UseNpgsql(connection).Options);
            var secondMember = new FamilyMember { Id = Guid.NewGuid(), Name = "Other shopper" };
            db.FamilyMembers.Add(secondMember);
            foreach (var (unit, offset) in new[] { ("g", 0), ("ml", 1), ("cup", 2) })
            {
                var ingredient = $"1 {unit} Water";
                var recipe = new Recipe { Id = Guid.NewGuid(), Name = $"Water in {unit}", Servings = 4,
                    Ingredients = JsonSerializer.Serialize(new[] { ingredient }),
                    RawMetadata = JsonSerializer.Serialize(new { recipeIngredient = new[] { ingredient }, supply = new[] { new { name = "Water", quantity = 1, unitText = unit } } }) };
                db.Recipes.Add(recipe);
                db.CalendarEvents.Add(new CalendarEvent { Date = new DateOnly(2026, 10, 5).AddDays(offset), RecipeId = recipe.Id });
            }
            var extraId = Guid.NewGuid();
            db.GroceryExtraOccurrences.Add(GroceryExtraOccurrence.Create(extraId, Guid.NewGuid(), new(2026, 10, 5), "Water", "water", "Grocery", DateTimeOffset.UtcNow));
            db.WeeklyPlans.Add(new WeeklyPlan { WeekStartDate = new(2026, 10, 5), GroceryState = "{}" });
            await db.SaveChangesAsync();
            using (var seedScope = app.Services.CreateScope())
                await seedScope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(new(2026, 10, 5), CancellationToken.None);


            var root = DeploymentCalendarPostgresTests.RepositoryRoot();
            var isolatedRoot = Path.Combine(Path.GetTempPath(), $"wfs-grocery-live-{Guid.NewGuid():N}");
            CopyBrowserSource(Path.Combine(root, "pwa"), Path.Combine(isolatedRoot, "pwa"));
            CopyBrowserSource(Path.Combine(root, "scripts", "ci"), Path.Combine(isolatedRoot, "scripts", "ci"));
            Directory.CreateSymbolicLink(Path.Combine(isolatedRoot, "pwa", "node_modules"), Path.Combine(root, "pwa", "node_modules"));
            var start = new ProcessStartInfo("node")
            {
                WorkingDirectory = Path.Combine(isolatedRoot, "pwa"), RedirectStandardOutput = true, RedirectStandardError = true
            };
            foreach (var arg in new[] { "node_modules/next/dist/bin/next", "dev", "--webpack", "-H", "127.0.0.1", "-p", new Uri(pwaUrl).Port.ToString() }) start.ArgumentList.Add(arg);
            DeploymentCalendarPostgresTests.ConfigureEnvironment(start, app.HttpAddress, pwaUrl);
            using var server = Process.Start(start)!;
            server.OutputDataReceived += (_, e) => { if (e.Data is not null) output.WriteLine(e.Data); };
            server.ErrorDataReceived += (_, e) => { if (e.Data is not null) output.WriteLine(e.Data); };
            server.BeginOutputReadLine();
            server.BeginErrorReadLine();
            try
            {
                using var probe = new HttpClient();
                var ready = false;
                for (var attempt = 0; attempt < 60; attempt++)
                {
                    try { ready = (await probe.GetAsync(pwaUrl + "/welcome")).IsSuccessStatusCode; }
                    catch (HttpRequestException) { }
                    if (ready || server.HasExited) break;
                    await Task.Delay(500);
                }
                Assert.True(ready, "Task-owned PWA failed to start.");
                var acceptance = new ProcessStartInfo("task") { WorkingDirectory = root, RedirectStandardOutput = true, RedirectStandardError = true };
                foreach (var arg in new[] { "test:e2e:reuse-server", "--", "grocery-checks-live.spec.ts" }) acceptance.ArgumentList.Add(arg);
                DeploymentCalendarPostgresTests.ConfigureEnvironment(acceptance, app.HttpAddress, pwaUrl);
                acceptance.Environment["GROCERY_CHECKS_LIVE_MEMBERS"] = $"{app.DefaultFamilyMemberId},{secondMember.Id}";
                using var browser = Process.Start(acceptance)!;
                var progress = Path.Combine(Path.GetTempPath(), "wfs-grocery-checks-browser-progress.log");
                await File.WriteAllTextAsync(progress, "");
                var stdout = Task.Run(async () =>
                {
                    var buffer = new StringBuilder();
                    while (await browser.StandardOutput.ReadLineAsync() is { } line)
                    {
                        buffer.AppendLine(line);
                        await File.AppendAllTextAsync(progress, line + Environment.NewLine);
                    }
                    return buffer.ToString();
                });
                var stderr = browser.StandardError.ReadToEndAsync();
                try
                {
                    await browser.WaitForExitAsync().WaitAsync(TimeSpan.FromMinutes(3));
                    output.WriteLine(await stdout);
                    output.WriteLine(await stderr);
                    Assert.Equal(0, browser.ExitCode);
                    var saved = await db.WeeklyPlans.AsNoTracking().SingleAsync();
                    output.WriteLine($"Live API {app.HttpAddress}; PWA {pwaUrl}; persisted map {saved.GroceryState}");
                    var checks = JsonSerializer.Deserialize<Dictionary<string, bool>>(saved.GroceryState)!;
                    var rows = JsonSerializer.Deserialize<List<RecipeApi.Dto.GroceryLineItemDto>>(saved.GroceryItems)!;
                    Assert.Equal(3, rows.Count);
                    Assert.True(checks[rows.Single(row => row.UnitText == "g").RowId!]);
                    Assert.True(checks[rows.Single(row => row.UnitText == "ml").RowId!]);
                    Assert.False(checks[rows.Single(row => row.UnitText == "cup").RowId!]);
                    Assert.False((await db.GroceryExtraOccurrences.AsNoTracking().SingleAsync(row => row.Id == extraId)).Checked);
                    var drift = new ProcessStartInfo("task") { WorkingDirectory = root, RedirectStandardOutput = true, RedirectStandardError = true };
                    drift.ArgumentList.Add("agent:drift:endpoints");
                    drift.Environment["GENERATED_API_URL"] = app.HttpAddress + "/openapi/v1.json";
                    using var driftProcess = Process.Start(drift)!;
                    var driftOut = driftProcess.StandardOutput.ReadToEndAsync();
                    var driftErr = driftProcess.StandardError.ReadToEndAsync();
                    await driftProcess.WaitForExitAsync();
                    output.WriteLine(await driftOut); output.WriteLine(await driftErr);
                    Assert.Equal(0, driftProcess.ExitCode);
                    var holdFile = Environment.GetEnvironmentVariable("WFS_GROCERY_CHECKS_VERIFY_HOLD_FILE");
                    if (!string.IsNullOrWhiteSpace(holdFile))
                    {
                        // Keep only the isolated API available to final endpoint parity checks.
                        if (!server.HasExited) { server.Kill(entireProcessTree: true); await server.WaitForExitAsync(); }
                        await File.WriteAllTextAsync(holdFile, app.HttpAddress);
                        var deadline = DateTimeOffset.UtcNow.AddMinutes(20);
                        while (File.Exists(holdFile) && DateTimeOffset.UtcNow < deadline) await Task.Delay(500);
                    }
                }
                finally
                {
                    if (!browser.HasExited) { browser.Kill(entireProcessTree: true); await browser.WaitForExitAsync(); }
                }
            }
            finally
            {
                if (!server.HasExited) { server.Kill(entireProcessTree: true); await server.WaitForExitAsync(); }
                Directory.Delete(isolatedRoot, recursive: true);
            }
        });
    }

    private static void CopyBrowserSource(string source, string target)
    {
        Directory.CreateDirectory(target);
        foreach (var file in Directory.EnumerateFiles(source))
        {
            var name = Path.GetFileName(file);
            if (name.StartsWith(".env", StringComparison.Ordinal) || name == "tsconfig.tsbuildinfo") continue;
            File.Copy(file, Path.Combine(target, name));
        }
        foreach (var directory in Directory.EnumerateDirectories(source))
        {
            var name = Path.GetFileName(directory);
            if (name is "node_modules" or ".next" or "test-results" or "playwright-report" or "blob-report" or ".git") continue;
            CopyBrowserSource(directory, Path.Combine(target, name));
        }
    }
}
