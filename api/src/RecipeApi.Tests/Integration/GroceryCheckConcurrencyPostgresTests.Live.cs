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
    public async Task LiveBrowser_SharedChecksPersistAndRecoverAfterDelayedSnapshot()
    {
        var pwaUrl = $"http://127.0.0.1:{DeploymentCalendarPostgresTests.FreePort()}";
        await using var app = await TestWebApplicationFactory.CreateWithAuthAsync(new FixedClock(), new()
        {
            ["Tests:PostgresConnectionString"] = connection,
            ["Tests:HttpUrl"] = "http://127.0.0.1:0"
        }, application =>
        {
            RecipeApi.Dto.ScheduleDays? olderSnapshot = null;
            application.MapPost("/_test/grocery/snapshot", async (JsonElement body, ScheduleService schedule, IScheduleEventPublisher publisher) =>
            {
                if (body.GetProperty("capture").GetBoolean()) olderSnapshot = await schedule.GetScheduleAsync(0);
                else await publisher.PublishWeekUpdatedAsync(olderSnapshot ?? throw new InvalidOperationException("Capture first"));
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
                using var response = await gateway.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, context.RequestAborted);
                context.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers.Concat(response.Content.Headers)) context.Response.Headers[header.Key] = header.Value.ToArray();
                context.Response.Headers.Remove("transfer-encoding");
                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
            });
        });
        await using var db = Context();
        var secondMember = new FamilyMember { Id = Guid.NewGuid(), Name = "Other shopper" };
        db.FamilyMembers.Add(secondMember);
        var plan = await db.WeeklyPlans.SingleAsync();
        plan.GroceryItems = JsonSerializer.Serialize(new[]
        {
            new RecipeApi.Dto.GroceryLineItemDto("Tomato", "tomato", "Produce", 1, null, []),
            new RecipeApi.Dto.GroceryLineItemDto("Lettuce", "lettuce", "Produce", 1, null, [])
        }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await db.SaveChangesAsync();

        var root = DeploymentCalendarPostgresTests.RepositoryRoot();
        var start = new ProcessStartInfo("node")
        {
            WorkingDirectory = Path.Combine(root, "pwa"), RedirectStandardOutput = true, RedirectStandardError = true
        };
        foreach (var arg in new[] { "node_modules/next/dist/bin/next", "dev", "-H", "127.0.0.1", "-p", new Uri(pwaUrl).Port.ToString() }) start.ArgumentList.Add(arg);
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
                var saved = await ReadAsync();
                Assert.False(saved["Tomato"]);
                Assert.True(saved["Lettuce"]);
                output.WriteLine($"API={app.HttpAddress}; PostgreSQL database={database}; persisted={JsonSerializer.Serialize(saved)}");
                var holdFile = Environment.GetEnvironmentVariable("WFS_GROCERY_CHECKS_VERIFY_HOLD_FILE");
                if (!string.IsNullOrWhiteSpace(holdFile))
                {
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
        }
    }

}
