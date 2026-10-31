using System.Diagnostics;
using Microsoft.Extensions.Configuration;
using OpenTelemetry;
using OpenTelemetry.Trace;
using RecipeApi.Telemetry;
using Xunit;

namespace RecipeApi.Tests.Telemetry;

[CollectionDefinition("WFS telemetry SDK", DisableParallelization = true)]
public sealed class WfsTelemetrySdkCollection;

[Collection("WFS telemetry SDK")]
public class RecipeIssueTelemetryPolicyTests
{
    public static IConfiguration Configuration(string? enabled = "true", string destination = "http://127.0.0.1:18985", string? token = "synthetic-server-token") =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["WFS_TELEMETRY_ENABLED"] = enabled,
            ["SENTRAME_OTLP_BASE"] = destination,
            ["SENTRAME_SERVER_TOKEN"] = token,
            ["WFS_VERSION"] = " synthetic-version ",
            ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "https://private-ambient.invalid",
            ["OTEL_EXPORTER_OTLP_HEADERS"] = "private-ambient-token",
            ["OTEL_DOTNET_EXPERIMENTAL_OTLP_RETRY"] = "disk"
        }).Build();

    [Fact]
    public void ExplicitServerOnlyConfiguration_OverridesAmbientExporterPolicy()
    {
        var settings = WfsTelemetryConfiguration.Read(Configuration());
        Assert.NotNull(settings);
        Assert.Equal("http://127.0.0.1:18985/", settings.Base.AbsoluteUri);
        Assert.Equal("synthetic-server-token", settings.Token);
        Assert.Equal("synthetic-version", settings.Version);
    }

    [Theory]
    [InlineData(null, "https://receiver.invalid", "synthetic")]
    [InlineData("True", "https://receiver.invalid", "synthetic")]
    [InlineData("false", "https://receiver.invalid", "synthetic")]
    [InlineData("true", "https://receiver.invalid/path", "synthetic")]
    [InlineData("true", "https://receiver.invalid?private=query", "synthetic")]
    [InlineData("true", "https://receiver.invalid#private", "synthetic")]
    [InlineData("true", "https://private:secret@receiver.invalid", "synthetic")]
    [InlineData("true", "http://receiver.invalid", "synthetic")]
    [InlineData("true", "https://receiver.invalid", null)]
    [InlineData("true", "https://receiver.invalid", "private\nheader")]
    [InlineData("true", "https://receiver.invalid", "private token")]
    [InlineData("true", "https://receiver.invalid", "private,token")]
    [InlineData("true", "https://receiver.invalid", "private%2cX-Extra%3dvalue")]
    public void InvalidConfiguration_FailsClosed(string? enabled, string destination, string? token) =>
        Assert.Null(WfsTelemetryConfiguration.Read(Configuration(enabled, destination, token)));

    [Fact]
    public void SafeNativeActivity_IsProjectedBeforeTheStandardBatchQueue()
    {
        using var processor = new NativePrivacyProcessor();
        using var listener = Listener("Microsoft.AspNetCore");
        using var source = new ActivitySource("Microsoft.AspNetCore");
        using var activity = source.StartActivity("private-path?token=private-secret", ActivityKind.Server)!;
        activity.SetTag("http.request.method", "POST");
        activity.SetTag("http.response.status_code", 202);
        activity.SetTag("url.full", "https://private.invalid/private-id?private-secret");
        activity.SetTag("db.statement", "private-sql");
        activity.SetTag("private.attribute", "private-content");
        activity.AddBaggage("private", "private-baggage");
        activity.TraceStateString = "private=private-state";
        activity.SetStatus(ActivityStatusCode.Error, "private-exception");
        activity.Stop();
        var identity = (activity.TraceId, activity.SpanId, activity.ParentSpanId, activity.StartTimeUtc, activity.Duration, activity.Kind);

        processor.OnEnd(activity);

        Assert.True(activity.Recorded);
        Assert.Equal("api.request", activity.DisplayName);
        Assert.Equal(ActivityStatusCode.Error, activity.Status);
        Assert.Null(activity.StatusDescription);
        Assert.Null(activity.TraceStateString);
        Assert.Empty(activity.Baggage);
        Assert.Equal(new[] { "http.request.method", "http.response.status_code" }, activity.TagObjects.Select(t => t.Key).Order().ToArray());
        Assert.Equal(identity, (activity.TraceId, activity.SpanId, activity.ParentSpanId, activity.StartTimeUtc, activity.Duration, activity.Kind));
    }

    [Theory]
    [InlineData("event")]
    [InlineData("link")]
    [InlineData("source")]
    public void ImmutableUnsafeActivity_IsDroppedBeforeStandardBatchBuffering(string unsafeField)
    {
        using var processor = new NativePrivacyProcessor();
        var sourceName = unsafeField == "source" ? "private-source" : "System.Net.Http";
        using var listener = Listener(sourceName);
        using var source = new ActivitySource(sourceName);
        using var activity = source.StartActivity("private-url", ActivityKind.Client)!;
        activity.SetTag("http.request.method", "GET");
        if (unsafeField == "event") activity.AddEvent(new ActivityEvent("private-exception"));
        if (unsafeField == "link") activity.AddLink(new ActivityLink(new ActivityContext(ActivityTraceId.CreateRandom(), ActivitySpanId.CreateRandom(), ActivityTraceFlags.Recorded)));
        activity.Stop();
        processor.OnEnd(activity);

        // This is the public SDK batch processor's admission boundary, not an imitation queue.
        using var exporter = new CaptureExporter();
        using var batch = new BatchActivityExportProcessor(exporter, 256, 1000, 2000, 64);
        batch.OnEnd(activity);
        Assert.True(batch.ForceFlush(2000));
        Assert.False(activity.Recorded);
        Assert.Empty(exporter.Activities);
    }

    [Theory]
    [InlineData("version")]
    [InlineData("tags")]
    [InlineData("schema")]
    public void ImmutableScopeMetadata_IsDroppedBeforeBatching(string field)
    {
        using var processor = new NativePrivacyProcessor();
        using var listener = Listener("System.Net.Http");
        using var source = new ActivitySource(new ActivitySourceOptions("System.Net.Http")
        {
            Version = field == "version" ? "private-version" : "",
            Tags = field == "tags" ? [new("private.scope", "private-value")] : null,
            TelemetrySchemaUrl = field == "schema" ? "https://private.invalid/schema" : null
        });
        using var activity = source.StartActivity("private", ActivityKind.Client)!;
        activity.Stop(); processor.OnEnd(activity);
        using var exporter = new CaptureExporter();
        using var batch = new BatchActivityExportProcessor(exporter, 256, 1000, 2000, 64);
        batch.OnEnd(activity); batch.ForceFlush(2000);
        Assert.False(activity.Recorded);
        Assert.Empty(exporter.Activities);
    }

    [Fact]
    public void RootSampling_IsTenPercentWithLocalInheritanceAndNoRemoteParents()
    {
        var sampler = WfsTelemetry.CreateSampler();
        SamplingResult Sample(string id, ActivityContext parent = default) => sampler.ShouldSample(new SamplingParameters(parent, ActivityTraceId.CreateFromString(id), "request", ActivityKind.Server));
        Assert.Equal(SamplingDecision.RecordAndSample, Sample("00000000000000000000000000000001").Decision);
        Assert.Equal(SamplingDecision.Drop, Sample("ffffffffffffffffffffffffffffffff").Decision);
        foreach (var flags in new[] { ActivityTraceFlags.Recorded, ActivityTraceFlags.None })
        {
            var remote = new ActivityContext(ActivityTraceId.CreateRandom(), ActivitySpanId.CreateRandom(), flags, "private", true);
            Assert.Equal(SamplingDecision.Drop, Sample("00000000000000000000000000000001", remote).Decision);
            var local = new ActivityContext(remote.TraceId, remote.SpanId, flags);
            Assert.Equal(flags == ActivityTraceFlags.Recorded ? SamplingDecision.RecordAndSample : SamplingDecision.Drop, Sample("ffffffffffffffffffffffffffffffff", local).Decision);
        }
    }

    [Fact]
    public void RemoteDescendants_AreExcludedEvenIfAnotherListenerRecordedThem()
    {
        using var processor = new NativePrivacyProcessor();
        using var listener = Listener("Microsoft.AspNetCore");
        using var source = new ActivitySource("Microsoft.AspNetCore");
        var remote = new ActivityContext(ActivityTraceId.CreateRandom(), ActivitySpanId.CreateRandom(), ActivityTraceFlags.Recorded, isRemote: true);
        using var root = source.StartActivity("foreign", ActivityKind.Server, remote)!;
        using var child = source.StartActivity("child", ActivityKind.Server)!;
        child.Stop(); processor.OnEnd(child);
        root.Stop(); processor.OnEnd(root);
        Assert.False(root.Recorded);
        Assert.False(child.Recorded);
    }

    [Theory]
    [InlineData("http://127.0.0.1:18985/v1/logs")]
    [InlineData("http://127.0.0.1:18985/other")]
    [InlineData("http://localhost:18985/v1/logs")]
    [InlineData("http://[::1]:18985/v1/logs")]
    public void BroadOperationalDestination_CannotShareTheSelectedReceiver(string endpoint)
    {
        var config = Configuration();
        config["OpenTelemetry:Endpoint"] = endpoint;
        Assert.Throws<InvalidOperationException>(() => WfsTelemetryConfiguration.ValidateOperationalDestinations(config));
    }

    private static ActivityListener Listener(string name)
    {
        var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == name,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded
        };
        ActivitySource.AddActivityListener(listener);
        return listener;
    }

    private sealed class CaptureExporter : BaseExporter<Activity>
    {
        public List<Activity> Activities { get; } = [];
        public override ExportResult Export(in Batch<Activity> batch)
        {
            foreach (var activity in batch) Activities.Add(activity);
            return ExportResult.Success;
        }
    }
}
