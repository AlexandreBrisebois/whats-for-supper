using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RecipeApi.Data;
using RecipeApi.Services;
using Serilog.Core;
using Serilog.Events;
using Xunit;

namespace RecipeApi.Tests.Integration;

[CollectionDefinition("Retired integration host", DisableParallelization = true)]
public sealed class RetirementHostCollection { }

[Collection("Retired integration host")]
public class TelemetryRetirementTests
{
    [Fact]
    public async Task Program_IgnoresLegacyExportConfiguration_AndRetainsOrdinaryDiagnostics()
    {
        var directory = Path.Combine(Path.GetTempPath(), "wfs-retirement-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        using var endpoint = new HttpListener();
        var port = new TcpListener(IPAddress.Loopback, 0);
        port.Start();
        var origin = $"http://127.0.0.1:{((IPEndPoint)port.LocalEndpoint).Port}/";
        port.Stop();
        endpoint.Prefixes.Add(origin);
        endpoint.Start();
        var received = 0;
        var drain = Task.Run(async () =>
        {
            try
            {
                while (true)
                {
                    var request = await endpoint.GetContextAsync();
                    if (request.Request.Url!.AbsolutePath != "/probe") Interlocked.Increment(ref received);
                    await request.Request.InputStream.CopyToAsync(Stream.Null);
                    request.Response.StatusCode = 200;
                    request.Response.Close();
                }
            }
            catch (Exception error) when (error is HttpListenerException or ObjectDisposedException) { }
        });
        var sink = new CaptureSink();
        string[] registrations = [];
        try
        {
            // Positive control: absence below cannot be explained by an unreachable sink.
            using (var probe = new HttpClient()) Assert.True((await probe.GetAsync(origin + "probe")).IsSuccessStatusCode);
            await using (var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment("Testing");
                builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["DataRoot"] = directory,
                    ["HEARTH_SECRET"] = "synthetic-test-secret",
                    ["WFS_TELEMETRY_ENABLED"] = "true",
                    ["SENTRAME_OTLP_BASE"] = origin,
                    ["SENTRAME_SERVER_TOKEN"] = "synthetic-server-token",
                    ["OpenTelemetry:Endpoint"] = origin,
                    ["Serilog:MinimumLevel:Default"] = "Information",
                    ["Serilog:WriteTo:0:Name"] = "Console",
                    ["Serilog:WriteTo:1:Name"] = "File",
                    ["Serilog:WriteTo:1:Args:path"] = Path.Combine(directory, "ordinary.log"),
                    ["Serilog:WriteTo:1:Args:rollingInterval"] = "Infinite"
                }));
                builder.ConfigureServices(services =>
                {
                    // Replace only external database/background-business effects, never telemetry registrations.
                    var businessWorkers = new HashSet<string>
                    {
                        "RecoveryReconciler", "DreamingWorkflowSeederHostedService", "RecipeSearchFilterBackfillHostedService",
                        "DemoWorkflowSeederHostedService", "WorkflowWorker"
                    };
                    foreach (var descriptor in services.Where(d => d.ServiceType == typeof(IHostedService)
                        && businessWorkers.Contains(d.ImplementationType?.Name ?? "")).ToArray()) services.Remove(descriptor);
                    registrations = services.Select(d => (d.ServiceType.FullName ?? "") + " " + (d.ImplementationType?.FullName ?? "")).ToArray();
                    services.RemoveAll<RecipeDbContext>();
                    services.RemoveAll<DbContextOptions<RecipeDbContext>>();
                    services.RemoveAll<IDbContextOptionsConfiguration<RecipeDbContext>>();
                    services.AddDbContext<RecipeDbContext>(options => options.UseInMemoryDatabase("retirement-" + Guid.NewGuid()));
                    services.AddSingleton<ILogEventSink>(sink);
                });
            }))
            {
                using var client = factory.CreateClient();
                using (var scope = factory.Services.CreateScope())
                {
                    await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().Database.EnsureCreatedAsync();
                    var logger = scope.ServiceProvider.GetRequiredService<ILogger<TelemetryRetirementTests>>();
                    logger.LogInformation("Synthetic ordinary diagnostic {Category}", "retained");
                    logger.LogWarning("Synthetic ordinary warning");
                    logger.LogError("Synthetic ordinary error");
                    scope.ServiceProvider.GetRequiredService<ISearchTelemetry>().Emit("synthetic_search_diagnostic", new() { ["resultCount"] = 0 });
                }
                Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/health")).StatusCode);
                await Task.Delay(1500); // Existing batching interval is one second; shutdown also flushes its old providers.
            }
            Assert.Contains(sink.Events, e => e.RenderMessage().Contains("Synthetic ordinary diagnostic"));
            Assert.Contains(sink.Events, e => e.Level == LogEventLevel.Warning && e.RenderMessage().Contains("Synthetic ordinary warning"));
            Assert.Contains(sink.Events, e => e.Level == LogEventLevel.Error && e.RenderMessage().Contains("Synthetic ordinary error"));
            Assert.Contains(sink.Events, e => e.RenderMessage().Contains("synthetic_search_diagnostic"));
            Assert.Contains(sink.Events, e => e.MessageTemplate.Text.StartsWith("HTTP {RequestMethod} {RequestPath} responded")
                && e.Properties.TryGetValue("RequestPath", out var path) && path is ScalarValue { Value: "/api/health" }
                && e.Properties.TryGetValue("StatusCode", out var status) && status is ScalarValue { Value: 200 });
            Assert.Contains("Synthetic ordinary diagnostic", await File.ReadAllTextAsync(Path.Combine(directory, "ordinary.log")));
            Assert.DoesNotContain(registrations, value => value.Contains("OpenTelemetry", StringComparison.Ordinal) || value.Contains("RecipeApi.Telemetry", StringComparison.Ordinal));
            Assert.Equal(0, Volatile.Read(ref received));
        }
        finally
        {
            endpoint.Stop();
            await drain;
            Directory.Delete(directory, recursive: true);
        }
    }

    private sealed class CaptureSink : ILogEventSink
    {
        public ConcurrentQueue<LogEvent> Events { get; } = new();
        public void Emit(LogEvent logEvent) => Events.Enqueue(logEvent);
    }
}
