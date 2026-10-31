using System.Diagnostics;
using System.Collections.Concurrent;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Npgsql;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using RecipeApi.Telemetry;
using OpenTelemetry;
using Xunit;

namespace RecipeApi.Tests.Integration;

[CollectionDefinition("Recipe issue exporter qualification", DisableParallelization = true)]
public sealed class RecipeIssueExporterCollection;

// Explicit live qualification. The caller supplies an installed, reviewed local
// Sentrame image and an isolated PostgreSQL admin connection. No shared receiver
// or development database is used. The ordinary database gate excludes this case.
[Collection("Recipe issue exporter qualification")]
public sealed class RecipeIssueTelemetryPostgresTests
{
    private const string Sentinel = "wfs-api-private-sentinel";

    [LiveReceiverPostgresFact]
    public async Task LiveReceiver_ActualApiSaveAndNativeSpans_PreservePrivacyReplayAndReopen()
    {
        var nativeScopes = new ConcurrentDictionary<string, object>();
        using var sourceObserver = new ActivityListener
        {
            ShouldListenTo = source => source.Name is "Microsoft.AspNetCore" or "System.Net.Http",
            ActivityStarted = activity => nativeScopes.TryAdd(activity.Source.Name, new
            {
                name = activity.Source.Name, version = activity.Source.Version,
                schema = activity.Source.TelemetrySchemaUrl, tags = activity.Source.Tags?.ToArray()
            }),
        };
        ActivitySource.AddActivityListener(sourceObserver);
        await using var receiver = await OwnedTelemetryReceiver.StartAsync();
        await using var database = await OwnedDatabase.StartAsync();
        await using var bridge = await TelemetryCaptureBridge.StartAsync(receiver);
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["WFS_TELEMETRY_ENABLED"] = "true",
            ["SENTRAME_OTLP_BASE"] = bridge.Origin,
            ["SENTRAME_SERVER_TOKEN"] = receiver.ServerToken,
            ["WFS_VERSION"] = "synthetic-api-m3",
        }).Build();
        var options = new Dictionary<string, string?>
        {
            ["Tests:PostgresConnectionString"] = database.Connection,
            ["Tests:HttpUrl"] = "http://127.0.0.1:0",
        };
        await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
            configurationOverrides: options,
            configureApplication: app => app.MapGet("/_qualification/native", async () =>
            {
                using var upstream = new HttpClient();
                var body = await upstream.GetStringAsync(bridge.UpstreamOrigin + "/private?sentinel=" + Sentinel);
                return Results.Text(body);
            }),
            configureServices: services =>
            {
                services.AddWfsTelemetry(configuration);
            });
        using var client = factory.CreateAuthenticatedClient();
        var recipeId = await SeedAsync(factory);
        var started = DateTimeOffset.UtcNow;

        // The first committed batch is acknowledged unsuccessfully by the bridge,
        // after the real receiver has accepted it. SDK memory retry must retain IDs.
        bridge.LoseFirstLogAcknowledgement = true;
        using (var ambient = new Activity(Sentinel).Start())
        using (factory.Services.GetRequiredService<ILogger<RecipeIssueTelemetryPostgresTests>>()
                   .BeginScope(new Dictionary<string, object> { [Sentinel] = Sentinel }))
        {
            ambient.AddBaggage("private", Sentinel);
            ambient.SetTag("private", Sentinel);
            for (var save = 0; save < 2; save++)
            {
                using var response = await SubmitAsync(client, factory, recipeId, ["duplicate"]);
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                Assert.False(body.RootElement.GetProperty("reimportStarted").GetBoolean());
                Assert.False(body.RootElement.GetProperty("reimportLaunchFailed").GetBoolean());
                Assert.Equal(1, await database.ReportCountAsync());
            }
        }

        factory.WorkflowOrchestratorMock.Setup(x => x.TriggerAsync("url-import", It.IsAny<Dictionary<string, string>>(), null))
            .ThrowsAsync(new InvalidOperationException(Sentinel));
        using (var response = await SubmitAsync(client, factory, recipeId, ["ingredients"]))
        {
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.True(body.RootElement.GetProperty("reimportLaunchFailed").GetBoolean());
            Assert.False(body.RootElement.GetProperty("reimportStarted").GetBoolean());
            Assert.Equal(1, await database.ReportCountAsync());
            Assert.Equal(0, await database.WorkflowCountAsync());
        }

        var metadataDirectory = Environment.GetEnvironmentVariable("WFS_API_TELEMETRY_EVIDENCE_DIR");
        if (!string.IsNullOrWhiteSpace(metadataDirectory))
        {
            Directory.CreateDirectory(metadataDirectory);
            await File.WriteAllTextAsync(Path.Combine(metadataDirectory, "native-source-metadata.json"), JsonSerializer.Serialize(nativeScopes.Values));
        }
        await receiver.WaitForAsync(snapshot => Saved(snapshot).Length == 3);
        var savedBeforeRejection = Saved(await receiver.SnapshotAsync());
        Assert.Equal(3, savedBeforeRejection.Select(x => Text(x, "record")).Distinct().Count());
        foreach (var record in savedBeforeRejection)
        {
            Assert.Equal("server", Text(record, "source"));
            Assert.Equal("logs", Text(record, "signal"));
            Assert.Equal("RecipeApi", Text(record, "service"));
            Assert.Equal("synthetic-api-m3", Text(record, "version"));
            Assert.True(Guid.TryParse(Text(record, "record"), out _));
            foreach (var field in new[] { "trace", "span", "scope", "tab", "occurrence", "action" })
                Assert.Equal("", Text(record, field));
            Assert.Equal(9, record.GetProperty("severity").GetInt32());
            var time = long.Parse(Text(record, "time"));
            Assert.InRange(time, started.ToUnixTimeMilliseconds() * 1_000_000,
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 1_000_000 + 1_000_000);
            Assert.True(long.Parse(Text(record, "receipt")) >= time);
            Assert.Equal(time, long.Parse(Text(record, "observed")));
            Assert.Equal(0, record.GetProperty("sequence").GetInt64());
            AssertSdkMetadata(record);
            foreach (var attribute in record.GetProperty("attrs").EnumerateObject())
                Assert.Contains(attribute.Name, new[] { "telemetry.sdk.language" });
        }

        // Real relational rejection occurs before the save fact. The earlier
        // committed row remains independently readable; a failed response is no
        // evidence that no previous business work was saved.
        await database.ExecuteAsync("ALTER TABLE recipe_import_reports ADD CONSTRAINT synthetic_reject_note CHECK (note IS NULL) NOT VALID");
        using (var response = await SubmitAsync(client, factory, recipeId, ["duplicate"]))
            Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal(1, await database.ReportCountAsync());
        await Task.Delay(1300);
        Assert.Equal(3, Saved(await receiver.SnapshotAsync()).Length);
        await database.ExecuteAsync("ALTER TABLE recipe_import_reports DROP CONSTRAINT synthetic_reject_note");

        // Explicit resolution observes only the confirmed removal. Repetition
        // is a successful business no-op, never another removal fact.
        using (var ambient = new Activity(Sentinel).Start())
        using (factory.Services.GetRequiredService<ILogger<RecipeIssueTelemetryPostgresTests>>()
                   .BeginScope(new Dictionary<string, object> { [Sentinel] = Sentinel }))
        {
            using var response = await ResolveAsync(client, factory, recipeId);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal(JsonValueKind.Null, body.RootElement.GetProperty("recipe").GetProperty("importIssue").ValueKind);
            Assert.Equal(0, await database.ReportCountAsync());
        }
        await receiver.WaitForAsync(snapshot => Resolved(snapshot).Length == 1);
        var removal = Assert.Single(Resolved(await receiver.SnapshotAsync()));
        Assert.Equal("server", Text(removal, "source"));
        Assert.Equal("logs", Text(removal, "signal"));
        Assert.Equal("RecipeApi", Text(removal, "service"));
        Assert.Equal("synthetic-api-m3", Text(removal, "version"));
        Assert.Equal(9, removal.GetProperty("severity").GetInt32());
        Assert.True(Guid.TryParse(Text(removal, "record"), out _));
        Assert.DoesNotContain(savedBeforeRejection, saved => Text(saved, "record") == Text(removal, "record"));
        foreach (var field in new[] { "trace", "span", "scope", "tab", "occurrence", "action" })
            Assert.Equal("", Text(removal, field));
        var removalTime = long.Parse(Text(removal, "time"));
        Assert.InRange(removalTime, started.ToUnixTimeMilliseconds() * 1_000_000,
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 1_000_000 + 1_000_000);
        Assert.Equal(removalTime, long.Parse(Text(removal, "observed")));
        Assert.True(long.Parse(Text(removal, "receipt")) >= removalTime);
        AssertSdkMetadata(removal);
        foreach (var attribute in removal.GetProperty("attrs").EnumerateObject())
            Assert.Contains(attribute.Name, new[] { "telemetry.sdk.language" });
        using (var response = await ResolveAsync(client, factory, recipeId))
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await Task.Delay(1300);
        Assert.Equal(1, Resolved(await receiver.SnapshotAsync()).Length);
        Assert.Equal(0, await database.ReportCountAsync());

        // Repeated remote context is excluded rather than reparented into an
        // invented local root. The real ASP.NET request still succeeds.
        var beforeRemote = Traces(await receiver.SnapshotAsync()).Length;
        for (var index = 0; index < 20; index++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"/api/recipes/{recipeId}?private={Sentinel}");
            request.Headers.Add("traceparent", "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01");
            request.Headers.Add("tracestate", "synthetic=" + Sentinel);
            request.Headers.Add("baggage", "synthetic=" + Sentinel);
            using var response = await SendSuppressedAsync(client, request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
        await Task.Delay(1300);
        Assert.Equal(beforeRemote, Traces(await receiver.SnapshotAsync()).Length);

        // The production sampler is unchanged. Repeated local synthetic requests
        // qualify actual native instrumentation, not manually fabricated spans.
        for (var index = 0; index < 256 && !Traces(await receiver.SnapshotAsync()).Any(x => Text(x, "name") == "api.http"); index++)
        {
            using var response = await SendSuppressedAsync(client, new HttpRequestMessage(HttpMethod.Get, "/_qualification/native?private=" + Sentinel));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            if (index % 16 == 15) await Task.Delay(1100);
        }
        await receiver.WaitForAsync(snapshot =>
        {
            var received = Traces(snapshot);
            var children = received.Where(x => Text(x, "name") == "api.http").ToArray();
            return children.Length > 0 && children.All(child => received.Any(parent =>
                Text(parent, "name") == "api.request" && Text(parent, "trace") == Text(child, "trace")
                && Text(parent, "span") == Text(child, "parent")));
        });
        var native = Traces(await receiver.SnapshotAsync());
        Assert.Contains(native, x => Text(x, "name") == "api.request");
        foreach (var child in native.Where(x => Text(x, "name") == "api.http"))
        {
            var parent = Assert.Single(native, x => Text(x, "trace") == Text(child, "trace") && Text(x, "span") == Text(child, "parent"));
            Assert.Equal("api.request", Text(parent, "name"));
            Assert.Equal(2, parent.GetProperty("kind").GetInt32());
            Assert.Equal(3, child.GetProperty("kind").GetInt32());
            Assert.True(long.Parse(Text(child, "time")) >= long.Parse(Text(parent, "time")));
            Assert.True(long.Parse(Text(child, "end")) <= long.Parse(Text(parent, "end")));
        }
        foreach (var span in native)
        {
            Assert.Contains(Text(span, "name"), new[] { "api.request", "api.http" });
            Assert.Equal("server", Text(span, "source"));
            Assert.Equal("RecipeApi", Text(span, "service"));
            Assert.Equal("synthetic-api-m3", Text(span, "version"));
            Assert.NotEqual("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", Text(span, "trace"));
            Assert.Equal(32, Text(span, "trace").Length);
            Assert.Equal(16, Text(span, "span").Length);
            AssertSdkMetadata(span);
            Assert.True(long.Parse(Text(span, "end")) > long.Parse(Text(span, "time")));
            Assert.Equal(0, span.GetProperty("eventCount").GetInt32());
            Assert.True(span.GetProperty("links").ValueKind == JsonValueKind.Null || span.GetProperty("links").GetArrayLength() == 0);
            foreach (var attribute in span.GetProperty("attrs").EnumerateObject())
                Assert.Contains(attribute.Name, new[] { "http.request.method", "http.response.status_code", "http.route", "diagnostic.policy", "telemetry.sdk.language" });
        }
        Assert.Contains(native, span => span.GetProperty("attrs").TryGetProperty("http.request.method", out var method) && method.GetString() == "GET"
            && span.GetProperty("attrs").TryGetProperty("http.response.status_code", out var status) && status.GetString() == "200");

        // Terminal telemetry failure cannot change persistence, response handling
        // or create recursive exports. This is receipt-independent business proof.
        bridge.Reject = true;
        var attempts = bridge.Batches.Length;
        var timer = Stopwatch.StartNew();
        using (var response = await SubmitAsync(client, factory, recipeId, ["duplicate"]))
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(timer.Elapsed < TimeSpan.FromSeconds(5));
        Assert.Equal(1, await database.ReportCountAsync());
        using (var response = await ResolveAsync(client, factory, recipeId))
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(0, await database.ReportCountAsync());
        await Task.Delay(3500);
        Assert.Equal(1, Resolved(await receiver.SnapshotAsync()).Length);
        Assert.Equal(3, Saved(await receiver.SnapshotAsync()).Length);
        Assert.InRange(bridge.Batches.Length - attempts, 1, 3);
        var settledAttempts = bridge.Batches.Length;
        await Task.Delay(1300);
        Assert.Equal(settledAttempts, bridge.Batches.Length);

        bridge.Reject = false;
        bridge.Redirect = true;
        var beforeRedirect = bridge.Batches.Length;
        using (var response = await SubmitAsync(client, factory, recipeId, ["duplicate"]))
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await Task.Delay(2300);
        Assert.Contains(bridge.Batches.Skip(beforeRedirect), batch => batch.Status == 307);
        Assert.Equal(0, bridge.RedirectTargetRequests);
        Assert.Equal(3, Saved(await receiver.SnapshotAsync()).Length);
        Assert.Equal(1, await database.ReportCountAsync());

        // Stop producer before comparing the protected durable identity. No late
        // queued record can be mistaken for a replay-derived diagnostic.
        await factory.DisposeAsync();
        var before = await receiver.SnapshotAsync();
        var identity = OwnedTelemetryReceiver.RetainedIdentity(before);
        Assert.DoesNotContain(Sentinel, before.GetRawText());
        var forwarded = bridge.Batches.Where(x => x.Forwarded).ToArray();
        Assert.NotEmpty(forwarded);
        Assert.True(bridge.LostAcknowledgementOccurred);
        var lost = bridge.Batches.First(x => x.LostAcknowledgement);
        Assert.Contains(bridge.Batches.SkipWhile(x => !ReferenceEquals(x, lost)).Skip(1),
            x => x.Route == lost.Route && x.Bytes.SequenceEqual(lost.Bytes));
        foreach (var batch in bridge.Batches)
            Assert.DoesNotContain(Sentinel, Encoding.UTF8.GetString(batch.Bytes));
        foreach (var batch in forwarded)
            await receiver.ReplayAsync(batch.Route, batch.Bytes);
        Assert.Equal(identity, OwnedTelemetryReceiver.RetainedIdentity(await receiver.SnapshotAsync()));
        await receiver.ReopenAsync();
        Assert.Equal(identity, OwnedTelemetryReceiver.RetainedIdentity(await receiver.SnapshotAsync()));
        await receiver.RecordEvidenceAsync(before, bridge.Batches, identity, started);
        if (!string.IsNullOrWhiteSpace(metadataDirectory))
            await File.WriteAllTextAsync(Path.Combine(metadataDirectory, "native-source-metadata.json"), JsonSerializer.Serialize(nativeScopes.Values));
    }

    private static JsonElement[] Saved(JsonElement snapshot) => snapshot.GetProperty("evidence").EnumerateArray()
        .Where(x => Text(x, "name") == "wfs.recipe_issue.saved").Select(x => x.Clone()).ToArray();
    private static JsonElement[] Resolved(JsonElement snapshot) => snapshot.GetProperty("evidence").EnumerateArray()
        .Where(x => Text(x, "name") == "wfs.recipe_issue.resolved").Select(x => x.Clone()).ToArray();
    private static JsonElement[] Traces(JsonElement snapshot) => snapshot.GetProperty("evidence").EnumerateArray()
        .Where(x => Text(x, "signal") == "traces").Select(x => x.Clone()).ToArray();
    private static string Text(JsonElement element, string name) => element.GetProperty(name).GetString() ?? "";
    private static void AssertSdkMetadata(JsonElement record)
    {
        var attributes = record.GetProperty("attrs");
        Assert.Equal("dotnet", Text(attributes, "telemetry.sdk.language"));
        // Sentrame deliberately retains the safe language metadata while name/
        // version remain exporter resource fields outside its attribute projection.
    }


    private static async Task<Guid> SeedAsync(TestWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var recipe = new Recipe { Id = Guid.NewGuid(), Name = Sentinel, SourceUrl = "https://example.invalid/" + Sentinel,
            AddedBy = factory.DefaultFamilyMemberId, IsReady = true };
        db.Recipes.Add(recipe);
        await db.SaveChangesAsync();
        return recipe.Id;
    }

    private static Task<HttpResponseMessage> SubmitAsync(HttpClient client, TestWebApplicationFactory factory, Guid recipe, string[] reasons)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/recipes/{recipe}/import-report?private={Sentinel}")
        { Content = JsonContent.Create(new { reasons, note = Sentinel }) };
        request.Headers.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        return SendSuppressedAsync(client, request);
    }

    private static Task<HttpResponseMessage> ResolveAsync(HttpClient client, TestWebApplicationFactory factory, Guid recipe)
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/recipes/{recipe}/import-report?private={Sentinel}");
        request.Headers.Add("X-Family-Member-Id", factory.DefaultFamilyMemberId.ToString());
        return SendSuppressedAsync(client, request);
    }

    private static async Task<HttpResponseMessage> SendSuppressedAsync(HttpClient client, HttpRequestMessage request)
    {
        // The qualification caller is outside the server process boundary. Suppress
        // this in-process test client's instrumentation/propagation so only real
        // Kestrel server operations qualify the API pipeline.
        using var suppressed = SuppressInstrumentationScope.Begin();
        return await client.SendAsync(request);
    }

    public sealed class LiveReceiverPostgresFactAttribute : FactAttribute
    {
        public LiveReceiverPostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) ||
                string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("WFS_API_SENTRAME_IMAGE")))
                Skip = "Requires isolated PostgreSQL and an explicitly reviewed WFS_API_SENTRAME_IMAGE; separate live receiver qualification.";
        }
    }

    private sealed class OwnedDatabase : IAsyncDisposable
    {
        private readonly string _name = "wfs_issue_export_" + Guid.NewGuid().ToString("N");
        private NpgsqlConnection _admin = null!;
        public string Connection { get; private set; } = "";
        public static async Task<OwnedDatabase> StartAsync()
        {
            var owner = new OwnedDatabase();
            var builder = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("WFS_TEST_POSTGRES_CONNECTION")) { Pooling = false };
            owner._admin = new NpgsqlConnection(builder.ConnectionString);
            await owner._admin.OpenAsync();
            await new NpgsqlCommand($"CREATE DATABASE {owner._name}", owner._admin).ExecuteNonQueryAsync();
            builder.Database = owner._name;
            owner.Connection = builder.ConnectionString;
            var root = new DirectoryInfo(AppContext.BaseDirectory);
            while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "api", "database"))) root = root.Parent;
            try
            {
                await owner.ExecuteAsync(await File.ReadAllTextAsync(Path.Combine(root?.FullName
                    ?? throw new DirectoryNotFoundException("Repository root missing."), "api", "database", "schema.sql")));
                return owner;
            }
            catch { await owner.DisposeAsync(); throw; }
        }
        public async Task ExecuteAsync(string sql)
        {
            await using var connection = new NpgsqlConnection(Connection);
            await connection.OpenAsync();
            await new NpgsqlCommand(sql, connection).ExecuteNonQueryAsync();
        }
        private async Task<int> CountAsync(string table)
        {
            await using var connection = new NpgsqlConnection(Connection);
            await connection.OpenAsync();
            return Convert.ToInt32(await new NpgsqlCommand("SELECT COUNT(*) FROM " + table, connection).ExecuteScalarAsync());
        }
        public Task<int> ReportCountAsync() => CountAsync("recipe_import_reports");
        public Task<int> WorkflowCountAsync() => CountAsync("workflow_instances");
        public async ValueTask DisposeAsync()
        {
            if (_admin is null) return;
            if (_admin.State == System.Data.ConnectionState.Open)
                await new NpgsqlCommand($"DROP DATABASE IF EXISTS {_name} WITH (FORCE)", _admin).ExecuteNonQueryAsync();
            await _admin.DisposeAsync();
        }
    }
}
