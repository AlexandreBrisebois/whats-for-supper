using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using RecipeApi.Data;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Tests.Services;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class RecipeServingsPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public async Task LiveBrowser_RecipeServingsGeneratedClientAndResponsiveHeadings()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            using var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            var port = ((IPEndPoint)listener.LocalEndpoint).Port;
            listener.Stop();
            var pwa = $"http://127.0.0.1:{port}";
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(configurationOverrides: new() {
                ["Tests:PostgresConnectionString"] = settings.ConnectionString, ["Tests:HttpUrl"] = "http://127.0.0.1:0",
            }, configureApplication: app => app.MapFallback("{**path}", async context => {
                try {
                    using var proxy = new HttpClient();
                    using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), pwa + context.Request.Path + context.Request.QueryString);
                    if (context.Request.ContentLength > 0) request.Content = new StreamContent(context.Request.Body);
                    foreach (var header in context.Request.Headers)
                        if (!string.Equals(header.Key, "Host", StringComparison.OrdinalIgnoreCase)) request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    using var response = await proxy.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, context.RequestAborted);
                    context.Response.StatusCode = (int)response.StatusCode;
                    foreach (var header in response.Headers.Concat(response.Content.Headers)) context.Response.Headers[header.Key] = header.Value.ToArray();
                    context.Response.Headers.Remove("transfer-encoding");
                    await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
                } catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
            }));
            Guid id; Guid unknownId;
            using (var scope = factory.Services.CreateScope()) {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                id = await RecipeServingsTests.ExtractAndSync(db);
                var unknown = new RecipeApi.Models.Recipe { Name = "Unknown servings", Servings = null, IsReady = true, Ingredients = "[\"510 g beef\",\"340 g pasta\"]", RawMetadata = "{\"recipeYield\":\"4 portions\"}" };
                db.Recipes.Add(unknown); await db.SaveChangesAsync(); unknownId = unknown.Id;
            }
            ProcessStartInfo Command(params string[] args) {
                var start = new ProcessStartInfo("node") { WorkingDirectory = Path.Combine(TomorrowPushPostgresTests.Root(), "pwa"), RedirectStandardOutput = true, RedirectStandardError = true };
                foreach (var arg in args) start.ArgumentList.Add(arg);
                start.Environment["BASE_URL"] = factory.HttpAddress;
                start.Environment["SERVINGS_API_URL"] = factory.HttpAddress;
                start.Environment["SERVINGS_RECIPE_ID"] = id.ToString();
                start.Environment["SERVINGS_UNKNOWN_ID"] = unknownId.ToString();
                start.Environment["API_INTERNAL_URL"] = factory.HttpAddress;
                start.Environment["NEXT_PUBLIC_API_BASE_URL"] = "";
                start.Environment["HEARTH_SECRET"] = TestWebApplicationFactory.TestSecret;
                start.Environment["NEXT_PUBLIC_ENVIRONMENT"] = "test";
                return start;
            }
            using var server = Process.Start(Command("node_modules/next/dist/bin/next", "dev", "-H", "127.0.0.1", "-p", port.ToString()))!;
            server.OutputDataReceived += (_, e) => { if(e.Data is not null) output.WriteLine(e.Data); };
            server.ErrorDataReceived += (_, e) => { if(e.Data is not null) output.WriteLine(e.Data); };
            server.BeginOutputReadLine(); server.BeginErrorReadLine();
            try {
                using var probe = new HttpClient();
                var ready = false;
                for (var attempt = 0; attempt < 120; attempt++) {
                    try { ready = (await probe.GetAsync(pwa + "/welcome")).IsSuccessStatusCode; } catch (HttpRequestException) { }
                    if (ready || server.HasExited) break;
                    await Task.Delay(500);
                }
                Assert.True(ready, "Isolated PWA failed to start.");
                var parityStart = new ProcessStartInfo("task", "agent:drift:endpoints") { WorkingDirectory = TomorrowPushPostgresTests.Root(), RedirectStandardOutput = true, RedirectStandardError = true };
                parityStart.Environment["GENERATED_API_URL"] = factory.HttpAddress + "/openapi/v1.json";
                using (var parity = Process.Start(parityStart)!) {
                    var parityOutput = parity.StandardOutput.ReadToEndAsync(); var parityError = parity.StandardError.ReadToEndAsync();
                    await parity.WaitForExitAsync(); output.WriteLine(await parityOutput); output.WriteLine(await parityError);
                    Assert.Equal(0, parity.ExitCode);
                }
                using var browser = Process.Start(Command("node_modules/@playwright/test/cli.js", "test", "recipe-servings-live.spec.ts", "--workers=1", "--reporter=line"))!;
                var stdout = browser.StandardOutput.ReadToEndAsync(); var stderr = browser.StandardError.ReadToEndAsync();
                try {
                    await browser.WaitForExitAsync().WaitAsync(TimeSpan.FromMinutes(3));
                    output.WriteLine(await stdout); output.WriteLine(await stderr);
                    Assert.Equal(0, browser.ExitCode);
                } finally { if (!browser.HasExited) browser.Kill(true); await browser.WaitForExitAsync(); }
                using (var scope = factory.Services.CreateScope()) {
                    var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                    var known = await db.Recipes.FindAsync(id); var unknown = await db.Recipes.FindAsync(unknownId);
                    Assert.Equal(4, known!.Servings); Assert.Equal(2, unknown!.Servings);
                    foreach (var row in new[] { known, unknown }) {
                        Assert.Equal("4 portions", System.Text.Json.JsonDocument.Parse(row.RawMetadata!).RootElement.GetProperty("recipeYield").GetString());
                        Assert.Equal(new[] { "510 g beef", "340 g pasta" }, RecipeApi.Services.RecipeService.DeserializeIngredients(row.Ingredients));
                    }
                    var record = new {
                        api = factory.HttpAddress, postgres = new { database = settings.Database, host = settings.Host, port = settings.Port },
                        runtime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
                        assemblySha256 = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(await File.ReadAllBytesAsync(typeof(RecipeApi.Services.RecipeService).Assembly.Location))),
                        knownId = id, unknownId, known = known.Servings, unknown = unknown.Servings,
                        sourceYield = "4 portions", ingredients = new[] { "510 g beef", "340 g pasta" },
                    };
                    var evidence = Path.Combine(TomorrowPushPostgresTests.Root(), ".task/servings-edit/live-acceptance.json");
                    Directory.CreateDirectory(Path.GetDirectoryName(evidence)!);
                    await File.WriteAllTextAsync(evidence, System.Text.Json.JsonSerializer.Serialize(record));
                }
                // Keep this disposable HTTP API alive for the repository endpoint gate.
                // Stop the task-owned PWA first so impact tests can own their server.
                if (Environment.GetEnvironmentVariable("WFS_SERVINGS_VERIFY") == "1")
                {
                    if (!server.HasExited) server.Kill(true);
                    await server.WaitForExitAsync();
                    var root = TomorrowPushPostgresTests.Root();
                    var verifyStart = new ProcessStartInfo("task") { WorkingDirectory = root, RedirectStandardOutput = true, RedirectStandardError = true };
                    verifyStart.ArgumentList.Add("verify"); verifyStart.ArgumentList.Add("--");
                    foreach (var path in System.Text.Json.JsonSerializer.Deserialize<string[]>(await File.ReadAllTextAsync(Path.Combine(root, ".task/servings-edit/verify-paths.json")))!) verifyStart.ArgumentList.Add(path);
                    foreach (var key in new[] { "WFS_TEST_POSTGRES_CONNECTION", "WFS_CALENDAR_LIVE", "WFS_SERVINGS_PROVIDER", "WFS_SERVINGS_VERIFY", "BASE_URL" }) verifyStart.Environment.Remove(key);
                    verifyStart.Environment["GENERATED_API_URL"] = factory.HttpAddress + "/openapi/v1.json";
                    using var verify = Process.Start(verifyStart)!;
                    async Task Pump(StreamReader reader, string file)
                    {
                        await using var log = new StreamWriter(Path.Combine(root, ".task/servings-edit", file)) { AutoFlush = true };
                        while (await reader.ReadLineAsync() is { } line) await log.WriteLineAsync(line);
                    }
                    var stdoutLog = Pump(verify.StandardOutput, "final-verify.log");
                    var stderrLog = Pump(verify.StandardError, "final-verify.stderr.log");
                    try {
                        await verify.WaitForExitAsync().WaitAsync(TimeSpan.FromMinutes(30));
                        await Task.WhenAll(stdoutLog, stderrLog);
                        Assert.True(verify.ExitCode == 0, "Repository verification failed; inspect .task/servings-edit/final-verify.log and final-verify.stderr.log.");
                    } finally { if (!verify.HasExited) verify.Kill(true); await verify.WaitForExitAsync(); }
                }

            } finally { if (!server.HasExited) server.Kill(true); await server.WaitForExitAsync(); }
        });
    }
}
