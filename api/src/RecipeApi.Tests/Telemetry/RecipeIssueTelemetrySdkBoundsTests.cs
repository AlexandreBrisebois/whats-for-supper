using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Tracing;
using System.Net;
using System.Net.Sockets;
using System.Text;
using RecipeApi.Telemetry;
using Serilog;
using Serilog.Sinks.OpenTelemetry;
using Xunit;

namespace RecipeApi.Tests.Telemetry;

// The disk-retry environment control and exporter diagnostic EventListener are
// process-wide test inputs. Run with the shared nonparallel SDK qualification collection.
[Collection("WFS telemetry SDK")]
public sealed class RecipeIssueTelemetrySdkBoundsTests(Xunit.Abstractions.ITestOutputHelper output)
{
    [Fact]
    public async Task TypedLog_PrivateMemoryRetryOverridesAmbientDisk_AndPreservesExactBatch()
    {
        var disk = Path.Combine(Path.GetTempPath(), "wfs-rejected-disk-" + Guid.NewGuid().ToString("N"));
        var previousRetry = Environment.GetEnvironmentVariable("OTEL_DOTNET_EXPERIMENTAL_OTLP_RETRY");
        var previousDisk = Environment.GetEnvironmentVariable("OTEL_DOTNET_EXPERIMENTAL_OTLP_DISK_RETRY_DIRECTORY_PATH");
        try
        {
            Environment.SetEnvironmentVariable("OTEL_DOTNET_EXPERIMENTAL_OTLP_RETRY", "disk");
            Environment.SetEnvironmentVariable("OTEL_DOTNET_EXPERIMENTAL_OTLP_DISK_RETRY_DIRECTORY_PATH", disk);
            await using var receiver = new CaptureReceiver(firstStatus: 503);
            using var telemetry = new WfsTelemetry(RecipeIssueTelemetryPolicyTests.Configuration(destination: receiver.Origin));
            telemetry.Saved();
            var flush = Task.Run(() => telemetry.ForceFlush());
            await WaitUntil(() => receiver.Requests.Count >= 2);
            await flush;
            var requests = receiver.Requests.ToArray();
            Assert.Equal(2, requests.Length);
            Assert.All(requests, request => Assert.Equal("/v1/logs", request.Path));
            Assert.Equal(requests[0].Bytes, requests[1].Bytes);
            Assert.Equal(1, Count(requests[0].Bytes, "event.id"));
            Assert.Equal(1, receiver.MaximumActive);
            Assert.False(Directory.Exists(disk));
            Assert.Equal("disk", Environment.GetEnvironmentVariable("OTEL_DOTNET_EXPERIMENTAL_OTLP_RETRY"));
        }
        finally
        {
            Environment.SetEnvironmentVariable("OTEL_DOTNET_EXPERIMENTAL_OTLP_RETRY", previousRetry);
            Environment.SetEnvironmentVariable("OTEL_DOTNET_EXPERIMENTAL_OTLP_DISK_RETRY_DIRECTORY_PATH", previousDisk);
        }
    }

    [Fact]
    public async Task TypedLog_SameOriginRedirectIsTerminal_WithoutRecursiveRequests()
    {
        await using var receiver = new CaptureReceiver(firstStatus: 307);
        using var telemetry = new WfsTelemetry(RecipeIssueTelemetryPolicyTests.Configuration(destination: receiver.Origin));
        telemetry.Saved();
        await Task.Run(() => telemetry.ForceFlush());
        await WaitUntil(() => receiver.Requests.Count >= 1);
        await Task.Delay(250);
        var requests = receiver.Requests.ToArray();
        Assert.Single(requests);
        Assert.Equal("/v1/logs", requests[0].Path);
        Assert.Equal(1, Count(requests[0].Bytes, "wfs.recipe_issue.saved"));
        Assert.Equal(1, receiver.MaximumActive);
    }

    [Fact]
    public async Task TypedLog_AdmissionAndBatchesStayBounded_WhileDiagnosticBodyOutlivesFlushWait()
    {
        using var diagnostics = new ExportDiagnostics();
        await using var receiver = new InactiveResponseReceiver();
        using var telemetry = new WfsTelemetry(RecipeIssueTelemetryPolicyTests.Configuration(destination: receiver.Origin));
        // Avoid crossing the production fixed-minute window in this burst test.
        var untilNextMinute = 60000 - Environment.TickCount64 % 60000;
        if (untilNextMinute < 8000) await Task.Delay((int)untilNextMinute + 5);
        for (var index = 0; index < 64; index++) telemetry.Saved();
        await receiver.FirstHeaders.Task.WaitAsync(TimeSpan.FromSeconds(5));
        var stalledAt = Stopwatch.StartNew();
        var admission = Stopwatch.StartNew();
        for (var index = 0; index < 10000; index++) telemetry.Saved();
        Assert.True(admission.Elapsed < TimeSpan.FromSeconds(1));
        var flushClock = Stopwatch.StartNew();
        var flushResult = await Task.Run(() => telemetry.ForceFlush(2000)).WaitAsync(TimeSpan.FromSeconds(3));
        Assert.True(flushClock.Elapsed < TimeSpan.FromMilliseconds(2500));
        // Success or timeout is only the SDK wait outcome, never proof of I/O termination.
        _ = flushResult;
        await Task.Delay(TimeSpan.FromMilliseconds(Math.Max(0, 3200 - stalledAt.ElapsedMilliseconds)));
        Assert.False(diagnostics.Failed.Task.IsCompleted);
        Assert.Single(receiver.Requests);
        Assert.False(receiver.Listener.Pending());
        Assert.False(receiver.FirstPeerClosed.Task.IsCompleted);
        receiver.ReleaseFirst.TrySetResult();
        await diagnostics.Failed.Task.WaitAsync(TimeSpan.FromSeconds(4));
        await WaitUntil(() => receiver.Requests.Count >= 2);
        await Task.Run(() => telemetry.ForceFlush());
        var batches = receiver.Requests.ToArray();
        Assert.Equal(2, batches.Length);
        Assert.All(batches, bytes => Assert.InRange(Count(bytes, "event.id"), 1, 64));
        Assert.Equal(100, batches.Sum(bytes => Count(bytes, "event.id")));
        Assert.All(batches, bytes => Assert.DoesNotContain("private", Encoding.UTF8.GetString(bytes)));
    }

    [Fact]
    public async Task TraceQueue_UsesIndependent256CapacityAnd64Batches_WithOneBlockedExporterSlot()
    {
        // Synthetic recognized ActivitySource input qualifies the actual configured
        // SDK queue only. It is not evidence of framework-native capture.
        using var diagnostics = new ExportDiagnostics();
        await using var receiver = new InactiveResponseReceiver();
        using var telemetry = new WfsTelemetry(RecipeIssueTelemetryPolicyTests.Configuration(destination: receiver.Origin));
        using var source = new ActivitySource("Microsoft.AspNetCore");
        for (var index = 0; index < 10000 && !receiver.FirstHeaders.Task.IsCompleted; index++)
        {
            using var activity = source.StartActivity("private-native-operation", ActivityKind.Server);
            activity?.SetTag("http.request.method", "GET");
        }
        await receiver.FirstHeaders.Task.WaitAsync(TimeSpan.FromSeconds(5));
        var admitted = Stopwatch.StartNew();
        for (var index = 0; index < 10000; index++)
        {
            using var activity = source.StartActivity("private-native-operation", ActivityKind.Server);
            activity?.SetTag("http.request.method", "GET");
        }
        Assert.True(admitted.Elapsed < TimeSpan.FromSeconds(2));
        await Task.Run(() => telemetry.ForceFlush()).WaitAsync(TimeSpan.FromSeconds(3));
        Assert.Single(receiver.Requests);
        Assert.False(receiver.Listener.Pending());
        receiver.ReleaseFirst.TrySetResult();
        await diagnostics.Failed.Task.WaitAsync(TimeSpan.FromSeconds(4));
        await Task.Run(() => telemetry.ForceFlush());
        await WaitUntil(() => receiver.Requests.Count >= 5);
        var batches = receiver.Requests.ToArray();
        Assert.Equal(5, batches.Length);
        Assert.All(batches, bytes => Assert.Equal(64, Count(bytes, "api.request")));
        Assert.Equal(320, batches.Sum(bytes => Count(bytes, "api.request")));
        Assert.All(batches, bytes => Assert.DoesNotContain("private", Encoding.UTF8.GetString(bytes)));
    }

    [Fact]
    public async Task OperationalSerilogExporter_IsSuppressedByTheProductionConfigurationSeam()
    {
        await using var selectedReceiver = new CaptureReceiver(firstStatus: 200);
        await using var operationalReceiver = new CaptureReceiver(firstStatus: 200);
        using var telemetry = new WfsTelemetry(RecipeIssueTelemetryPolicyTests.Configuration(destination: selectedReceiver.Origin));
        // Deterministic diagnostic listener admits the real native HttpClient
        // operation if the production suppression option is missing.
        var observed = new ConcurrentQueue<string>();
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == "System.Net.Http",
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
            ActivityStopped = activity => observed.Enqueue($"source={activity.Source.Name};kind={activity.Kind};recorded={activity.Recorded};events={activity.Events.Count()};links={activity.Links.Count()};parent={activity.Parent is not null};rootParentSpan={activity.ParentSpanId != default}")
        };
        ActivitySource.AddActivityListener(listener);
        using (var operational = new LoggerConfiguration().WriteTo.OpenTelemetry(options =>
        {
            options.Endpoint = operationalReceiver.Origin;
            options.Protocol = OtlpProtocol.HttpProtobuf;
            options.HttpMessageHandler = new SocketsHttpHandler();
            options.BatchingOptions.BatchSizeLimit = 1;
            options.BatchingOptions.BufferingTimeLimit = TimeSpan.FromMilliseconds(10);
            WfsTelemetry.ConfigureOperationalExporter(options);
        }, ignoreEnvironment: true).CreateLogger())
        {
            operational.Information("Synthetic operational log");
            await WaitUntil(() => operationalReceiver.Requests.Count >= 1);
        }
        await Task.Run(() => telemetry.ForceFlush());
        await Task.Delay(150);
        output.WriteLine(string.Join("\n", observed));
        Assert.Single(operationalReceiver.Requests);
        Assert.NotEmpty(observed);
        Assert.Empty(selectedReceiver.Requests);
    }

    [Theory]
    [InlineData("OpenTelemetry:Endpoint")]
    [InlineData("Serilog:WriteTo:0:Args:Endpoint")]
    public async Task ConfiguredOperationalDestination_IsExcludedFromSelectedNativeExport(string endpointKey)
    {
        await using var selectedReceiver = new CaptureReceiver(firstStatus: 200);
        await using var operationalReceiver = new CaptureReceiver(firstStatus: 200);
        var configuration = RecipeIssueTelemetryPolicyTests.Configuration(destination: selectedReceiver.Origin);
        configuration[endpointKey] = operationalReceiver.Origin;
        using var telemetry = new WfsTelemetry(configuration);
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == "System.Net.Http",
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded
        };
        ActivitySource.AddActivityListener(listener);
        using var http = new HttpClient(new SocketsHttpHandler());
        using var response = await http.GetAsync(operationalReceiver.Origin + "/v1/logs");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await Task.Run(() => telemetry.ForceFlush());
        await Task.Delay(150);
        Assert.Single(operationalReceiver.Requests);
        Assert.Empty(selectedReceiver.Requests);
    }

    private static int Count(byte[] bytes, string marker)
    {
        var text = Encoding.UTF8.GetString(bytes);
        var count = 0;
        for (var index = 0; (index = text.IndexOf(marker, index, StringComparison.Ordinal)) >= 0; index += marker.Length) count++;
        return count;
    }

    private static async Task WaitUntil(Func<bool> ready)
    {
        var clock = Stopwatch.StartNew();
        while (!ready() && clock.Elapsed < TimeSpan.FromSeconds(8)) await Task.Delay(20);
        Assert.True(ready(), "The owned SDK receiver did not observe the required batch.");
    }

    private sealed class CaptureReceiver : IAsyncDisposable
    {
        private readonly HttpListener listener = new();
        private readonly ConcurrentBag<Task> handlers = new();
        private readonly Task loop;
        private int active;
        private int maximumActive;
        private int received;
        public int MaximumActive => Volatile.Read(ref maximumActive);
        public string Origin { get; }
        public ConcurrentQueue<(string Path, byte[] Bytes)> Requests { get; } = new();

        public CaptureReceiver(int firstStatus)
        {
            using var socket = new TcpListener(IPAddress.Loopback, 0); socket.Start();
            Origin = "http://127.0.0.1:" + ((IPEndPoint)socket.LocalEndpoint).Port;
            socket.Stop();
            listener.Prefixes.Add(Origin + "/"); listener.Start();
            loop = Task.Run(async () =>
            {
                try
                {
                    while (listener.IsListening)
                    {
                        var context = await listener.GetContextAsync();
                        handlers.Add(Handle(context, firstStatus));
                    }
                }
                catch (Exception e) when (e is HttpListenerException or ObjectDisposedException) { }
            });
        }

        private async Task Handle(HttpListenerContext context, int firstStatus)
        {
            var current = Interlocked.Increment(ref active);
            int previous;
            do { previous = Volatile.Read(ref maximumActive); }
            while (current > previous && Interlocked.CompareExchange(ref maximumActive, current, previous) != previous);
            try
            {
                using var bytes = new MemoryStream();
                await context.Request.InputStream.CopyToAsync(bytes);
                var ordinal = Interlocked.Increment(ref received);
                Requests.Enqueue((context.Request.Url!.AbsolutePath, bytes.ToArray()));
                context.Response.StatusCode = ordinal == 1 ? firstStatus : 200;
                if (context.Response.StatusCode == 307) context.Response.RedirectLocation = Origin + "/redirect-target";
                context.Response.Close();
            }
            finally { Interlocked.Decrement(ref active); }
        }

        public async ValueTask DisposeAsync()
        {
            listener.Close(); await loop;
            await Task.WhenAll(handlers);
        }
    }

    private sealed class InactiveResponseReceiver : IAsyncDisposable
    {
        public TcpListener Listener { get; } = new(IPAddress.Loopback, 0);
        public string Origin { get; }
        public ConcurrentQueue<byte[]> Requests { get; } = new();
        public TaskCompletionSource FirstHeaders { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource ReleaseFirst { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource FirstPeerClosed { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly CancellationTokenSource stop = new();
        private readonly Task loop;

        public InactiveResponseReceiver()
        {
            Listener.Start(); Origin = "http://127.0.0.1:" + ((IPEndPoint)Listener.LocalEndpoint).Port;
            loop = Task.Run(async () =>
            {
                try
                {
                    while (!stop.IsCancellationRequested)
                    {
                        using var peer = await Listener.AcceptTcpClientAsync(stop.Token);
                        using var stream = peer.GetStream();
                        var header = new List<byte>(); var one = new byte[1];
                        while (await stream.ReadAsync(one, stop.Token) == 1)
                        {
                            header.Add(one[0]);
                            if (header.Count >= 4 && header[^4] == 13 && header[^3] == 10 && header[^2] == 13 && header[^1] == 10) break;
                        }
                        var text = Encoding.ASCII.GetString(header.ToArray());
                        var length = int.Parse(text.Split("\r\n").Single(line => line.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase)).Split(':')[1]);
                        var bytes = new byte[length]; await stream.ReadExactlyAsync(bytes, stop.Token); Requests.Enqueue(bytes);
                        if (Requests.Count == 1)
                        {
                            await stream.WriteAsync(Encoding.ASCII.GetBytes("HTTP/1.1 400 Bad Request\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n"), stop.Token);
                            await stream.FlushAsync(stop.Token); FirstHeaders.TrySetResult();
                            var peerRead = Task.Run(async () =>
                            {
                                try { if (await stream.ReadAsync(new byte[1], stop.Token) == 0) FirstPeerClosed.TrySetResult(); }
                                catch (Exception e) when (e is IOException or OperationCanceledException or ObjectDisposedException) { FirstPeerClosed.TrySetResult(); }
                            });
                            await ReleaseFirst.Task.WaitAsync(stop.Token);
                            if (!FirstPeerClosed.Task.IsCompleted)
                                await stream.WriteAsync(Encoding.ASCII.GetBytes("0\r\n\r\n"), stop.Token);
                            // Closing this peer completes its read observer before processing the next connection.
                            peer.Close(); await peerRead;
                        }
                        else
                        {
                            await stream.WriteAsync(Encoding.ASCII.GetBytes("HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"), stop.Token);
                        }
                    }
                }
                catch (Exception e) when (e is OperationCanceledException or SocketException or ObjectDisposedException) { }
            });
        }

        public async ValueTask DisposeAsync()
        {
            ReleaseFirst.TrySetResult(); stop.Cancel(); Listener.Stop();
            await loop; stop.Dispose();
        }
    }

    private sealed class ExportDiagnostics : EventListener
    {
        private bool ready;
        public TaskCompletionSource Failed { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public ExportDiagnostics()
        {
            ready = true;
            foreach (var source in EventSource.GetSources()) Enable(source);
        }
        protected override void OnEventSourceCreated(EventSource source) { if (ready) Enable(source); }
        private void Enable(EventSource source)
        {
            if (source.Name == "OpenTelemetry-Exporter-OpenTelemetryProtocol") EnableEvents(source, EventLevel.Error, EventKeywords.All);
        }
        protected override void OnEventWritten(EventWrittenEventArgs data)
        {
            if (data.EventName == "HttpRequestFailed") Failed.TrySetResult();
        }
    }
}
