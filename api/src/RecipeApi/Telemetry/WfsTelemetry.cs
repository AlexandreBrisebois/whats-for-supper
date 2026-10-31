using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection.Extensions;
using OpenTelemetry;
using OpenTelemetry.Exporter;
using OpenTelemetry.Logs;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using RecipeApi.Services;

namespace RecipeApi.Telemetry;

/// <summary>One host-owned native provider and a private, typed semantic-log producer.</summary>
public sealed class WfsTelemetry : IRecipeIssueTelemetry, IDisposable
{
    private readonly ServiceProvider? logServices;
    private readonly LoggerProvider? logProvider;
    private readonly ILogger? issueLogger;
    private readonly object admission = new();
    private long minute = -1;
    private int ordinary;
    private int disposed;

    public TracerProvider Traces { get; }

    public WfsTelemetry(IConfiguration configuration)
    {
        var settings = WfsTelemetryConfiguration.Read(configuration);
        var operationalDestinations = WfsTelemetryConfiguration.OperationalDestinations(configuration);
        var privateConfiguration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["OTEL_DOTNET_EXPERIMENTAL_OTLP_RETRY"] = "in_memory"
        }).Build();
        var traces = Sdk.CreateTracerProviderBuilder()
            .ConfigureServices(services => services.AddSingleton<IConfiguration>(privateConfiguration))
            .SetResourceBuilder(Resource(settings?.Version ?? "unknown"))
            .AddAspNetCoreInstrumentation(options => options.RecordException = false)
            .AddHttpClientInstrumentation(options =>
            {
                options.RecordException = false;
                options.FilterHttpRequestMessage = request => settings is null || request.RequestUri is null
                    || (!WfsTelemetryConfiguration.SameOrigin(settings.Base, request.RequestUri)
                        && !operationalDestinations.Any(endpoint => WfsTelemetryConfiguration.SameOrigin(endpoint, request.RequestUri)));
            });
        if (settings is not null)
        {
            traces.SetSampler(CreateSampler())
                .AddProcessor(new NativePrivacyProcessor())
                .AddOtlpExporter(options => ConfigureExporter(options, settings, "traces"));
            var services = new ServiceCollection();
            services.AddSingleton<IConfiguration>(privateConfiguration);
            services.AddOpenTelemetry().WithLogging(logging =>
            {
                logging.SetResourceBuilder(Resource(settings.Version));
                logging.AddOtlpExporter((exporter, processor) =>
                {
                    ConfigureExporter(exporter, settings, "logs");
                    processor.ExportProcessorType = ExportProcessorType.Batch;
                    processor.BatchExportProcessorOptions = new()
                    {
                        MaxQueueSize = 256,
                        MaxExportBatchSize = 64,
                        ScheduledDelayMilliseconds = 1000,
                        ExporterTimeoutMilliseconds = 2000
                    };
                });
            }, options =>
            {
                options.IncludeScopes = false;
                options.IncludeFormattedMessage = false;
            });
            logServices = services.BuildServiceProvider();
            logProvider = logServices.GetRequiredService<LoggerProvider>();
            issueLogger = logServices.GetRequiredService<ILoggerFactory>().CreateLogger("wfs.recipe_issue");
        }
        Traces = traces.Build();
    }

    public static void ConfigureOperationalExporter(Serilog.Sinks.OpenTelemetry.BatchedOpenTelemetrySinkOptions options) =>
        options.OnBeginSuppressInstrumentation = SuppressInstrumentationScope.Begin;

    public static Sampler CreateSampler() => new ParentBasedSampler(new TraceIdRatioBasedSampler(0.1),
        remoteParentSampled: new AlwaysOffSampler(), remoteParentNotSampled: new AlwaysOffSampler());

    private static ResourceBuilder Resource(string version) => ResourceBuilder.CreateEmpty()
        .AddService("RecipeApi", serviceVersion: version, autoGenerateServiceInstanceId: false)
        .AddTelemetrySdk();

    private static void ConfigureExporter(OtlpExporterOptions options, WfsTelemetryConfiguration settings, string signal)
    {
        options.Endpoint = new Uri(settings.Base, "v1/" + signal);
        options.Headers = "Authorization=Bearer " + settings.Token;
        options.Protocol = OtlpExportProtocol.HttpProtobuf;
        options.Compression = OtlpExportCompression.None;
        options.TimeoutMilliseconds = 2000;
        options.MaxResponseSizeBytes = 1024;
        options.ExportProcessorType = ExportProcessorType.Batch;
        options.BatchExportProcessorOptions = new()
        {
            MaxQueueSize = 256,
            MaxExportBatchSize = 64,
            ScheduledDelayMilliseconds = 1000,
            ExporterTimeoutMilliseconds = 2000
        };
        options.HttpClientFactory = () => new HttpClient(new SocketsHttpHandler
        {
            AllowAutoRedirect = false,
            MaxConnectionsPerServer = 1,
            UseProxy = false,
            ConnectTimeout = TimeSpan.FromSeconds(2),
            ResponseDrainTimeout = TimeSpan.FromSeconds(2),
            MaxResponseDrainSize = 0
        })
        { Timeout = TimeSpan.FromSeconds(2), MaxResponseContentBufferSize = 1024 };
    }

    public void Saved() => ObserveIssue("wfs.recipe_issue.saved", "WFS recipe issue saved");

    public void Resolved() => ObserveIssue("wfs.recipe_issue.resolved", "WFS recipe issue resolved");

    private void ObserveIssue(string eventName, string body)
    {
        if (issueLogger is null || Volatile.Read(ref disposed) != 0) return;
        lock (admission)
        {
            var current = Environment.TickCount64 / 60000;
            if (minute != current) { minute = current; ordinary = 0; }
            if (ordinary >= 100) return;
            ordinary++;
        }
        var previous = Activity.Current;
        try
        {
            Activity.Current = null;
            issueLogger.Log(LogLevel.Information, default, new KeyValuePair<string, object?>[]
            {
                new("event.name", eventName),
                new("event.id", Guid.NewGuid().ToString()),
                new("{OriginalFormat}", body)
            }, null, (_, _) => body);
        }
        catch (Exception) { /* Telemetry cannot change persistence handling. */ }
        finally { Activity.Current = previous; }
    }

    /// <summary>Bounded SDK wait; success does not establish receipt or termination of I/O.</summary>
    public bool ForceFlush(int timeoutMilliseconds = 2000)
    {
        var budget = Math.Clamp(timeoutMilliseconds, 0, 2000);
        var clock = Stopwatch.StartNew();
        var logs = logProvider?.ForceFlush(budget) ?? true;
        return Traces.ForceFlush(Math.Max(0, budget - (int)clock.ElapsedMilliseconds)) && logs;
    }

    public void Dispose()
    {
        if (Interlocked.Exchange(ref disposed, 1) != 0) return;
        Traces.Shutdown(2000);
        logProvider?.Shutdown(2000);
        Traces.Dispose();
        logServices?.Dispose();
    }
}

public static class WfsTelemetryRegistration
{
    public static IServiceCollection AddWfsTelemetry(this IServiceCollection services, IConfiguration configuration)
    {
        WfsTelemetryConfiguration.ValidateOperationalDestinations(configuration);
        services.TryAddSingleton(_ => new WfsTelemetry(configuration));
        services.TryAddSingleton<IRecipeIssueTelemetry>(provider => provider.GetRequiredService<WfsTelemetry>());
        services.AddHostedService<WfsTelemetryHost>();
        return services;
    }

    private sealed class WfsTelemetryHost(WfsTelemetry telemetry) : IHostedService
    {
        public Task StartAsync(CancellationToken cancellationToken) => Task.CompletedTask;
        public Task StopAsync(CancellationToken cancellationToken)
        {
            telemetry.ForceFlush();
            return Task.CompletedTask;
        }
    }
}
