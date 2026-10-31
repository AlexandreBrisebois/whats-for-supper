using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text.Json;
using OpenTelemetry;
using Xunit;

namespace RecipeApi.Tests.Integration;

// Test-owned receiver lifecycle only. Credentials remain process-local and are
// passed to Docker via its inherited environment, never command arguments/logs.
internal sealed class OwnedTelemetryReceiver : IAsyncDisposable
{
    private readonly string _name = "wfs-api-otel-live-" + Guid.NewGuid().ToString("N");
    private readonly string _passphrase = "synthetic-" + Guid.NewGuid().ToString("N");
    private readonly HttpClient _http;
    private readonly CookieContainer _cookies = new();
    private string _csrf = "";
    private string _appId = "";
    private string _image = "";
    private string _imageId = "";
    private string _containerId = "";
    private bool _container;
    private bool _network;
    private bool _volume;
    public string Origin { get; private set; } = "";
    public string ServerToken { get; private set; } = "";
    private OwnedTelemetryReceiver() => _http = new HttpClient(new HttpClientHandler { CookieContainer = _cookies, UseProxy = false, AllowAutoRedirect = false })
    { Timeout = TimeSpan.FromSeconds(10) };

    public static async Task<OwnedTelemetryReceiver> StartAsync()
    {
        var owner = new OwnedTelemetryReceiver();
        try
        {
            owner._image = Environment.GetEnvironmentVariable("WFS_API_SENTRAME_IMAGE")
                ?? throw new InvalidOperationException("Explicit reviewed WFS_API_SENTRAME_IMAGE is required.");
            // Image inspect is deliberately required; no pull/build fallback.
            owner._imageId = await DockerAsync(["image", "inspect", "--format", "{{.Id}}", owner._image]);
            var port = FreePort();
            owner.Origin = $"http://127.0.0.1:{port}";
            await DockerAsync(["network", "create", owner._name]);
            owner._network = true;
            await DockerAsync(["volume", "create", owner._name]);
            owner._volume = true;
            owner._container = true;
            owner._containerId = await DockerAsync(["run", "--detach", "--pull=never", "--name", owner._name,
                "--network", owner._name, "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges",
                "--publish", $"127.0.0.1:{port}:8096", "--mount", $"type=volume,src={owner._name},dst=/data",
                "--env", "SENTRAME_PASSPHRASE", "--env", "SENTRAME_ORIGIN=" + owner.Origin,
                "--env", "SENTRAME_ADDR=0.0.0.0:8096", "--env", "SENTRAME_DB=/data/registry.db", owner._image],
                new Dictionary<string, string> { ["SENTRAME_PASSPHRASE"] = owner._passphrase });
            await owner.LoginAsync();
            var app = await owner.RequestAsync("/api/apps", new { name = "Disposable WFS API exporter qualification" });
            owner._appId = app.GetProperty("id").GetString()!;
            var tokens = await owner.RequestAsync($"/api/apps/{owner._appId}/connection");
            owner.ServerToken = tokens.GetProperty("server").GetString()!;
            using var anonymous = new HttpClient();
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await anonymous.GetAsync(owner.Origin + $"/api/apps/{owner._appId}/snapshot")).StatusCode);
            Assert.Empty((await owner.SnapshotAsync()).GetProperty("evidence").EnumerateArray());
            return owner;
        }
        catch { await owner.DisposeAsync(); throw; }
    }

    public Task<JsonElement> SnapshotAsync() => RequestAsync($"/api/apps/{_appId}/snapshot");

    public async Task WaitForAsync(Func<JsonElement, bool> predicate)
    {
        var timer = Stopwatch.StartNew();
        do
        {
            if (predicate(await SnapshotAsync())) return;
            await Task.Delay(100);
        } while (timer.Elapsed < TimeSpan.FromSeconds(15));
        Assert.Fail("Owned receiver did not retain the required actual API export within 15 seconds.");
    }

    public async Task ReplayAsync(string route, byte[] bytes)
    {
        using var suppressed = SuppressInstrumentationScope.Begin();
        using var request = new HttpRequestMessage(HttpMethod.Post, Origin + route) { Content = new ByteArrayContent(bytes) };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", ServerToken);
        request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/x-protobuf");
        using var response = await _http.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    public async Task ReopenAsync()
    {
        await DockerAsync(["restart", _name]);
        await LoginAsync();
    }

    private async Task LoginAsync()
    {
        var timer = Stopwatch.StartNew();
        while (true)
        {
            try
            {
                using var ready = await _http.GetAsync(Origin + "/ready");
                if (ready.IsSuccessStatusCode) break;
            }
            catch (HttpRequestException) { }
            if (timer.Elapsed > TimeSpan.FromSeconds(20)) throw new TimeoutException("Owned disposable receiver did not become ready.");
            await Task.Delay(100);
        }
        var login = await RequestAsync("/api/login", new { passphrase = _passphrase });
        _csrf = login.GetProperty("csrf").GetString()!;
    }

    private async Task<JsonElement> RequestAsync(string route, object? body = null)
    {
        using var suppressed = SuppressInstrumentationScope.Begin();
        using var request = new HttpRequestMessage(body is null ? HttpMethod.Get : HttpMethod.Post, Origin + route);
        request.Headers.Add("Origin", Origin);
        request.Headers.Add("X-CSRF-Token", _csrf);
        if (body is not null) request.Content = JsonContent.Create(body);
        using var response = await _http.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).Clone();
    }

    public static string RetainedIdentity(JsonElement snapshot)
    {
        var evidence = snapshot.GetProperty("evidence").EnumerateArray()
            .OrderBy(x => x.GetProperty("id").GetInt64()).ToArray();
        var retained = JsonSerializer.SerializeToUtf8Bytes(new { evidence, model = snapshot.GetProperty("model") });
        return Convert.ToHexStringLower(SHA256.HashData(retained));
    }

    public async Task RecordEvidenceAsync(JsonElement snapshot, IReadOnlyCollection<TelemetryBatch> batches,
        string identity, DateTimeOffset started)
    {
        var directory = Environment.GetEnvironmentVariable("WFS_API_TELEMETRY_EVIDENCE_DIR");
        if (string.IsNullOrWhiteSpace(directory)) return;
        Directory.CreateDirectory(directory);
        Assert.Equal(_containerId, await DockerAsync(["inspect", "--format", "{{.Id}}", _name]));
        var sequence = 0;
        var records = new List<object>();
        foreach (var batch in batches)
        {
            var file = $"batch-{sequence++}.protobuf";
            await File.WriteAllBytesAsync(Path.Combine(directory, file), batch.Bytes);
            records.Add(new { file, batch.Route, batch.Status, batch.Forwarded, batch.LostAcknowledgement,
                sha256 = Convert.ToHexStringLower(SHA256.HashData(batch.Bytes)) });
        }
        await File.WriteAllTextAsync(Path.Combine(directory, "protected-before-replay.json"), snapshot.GetRawText());
        await File.WriteAllTextAsync(Path.Combine(directory, "qualification.json"), JsonSerializer.Serialize(new
        {
            started, containerId = _containerId, imageId = _imageId, imageTag = _image,
            receiver = _name, network = _name, volume = _name, retainedIdentity = identity,
            exportAndProtectedRetention = "passed", exactReplay = "passed", storageReopen = "passed",
            runtime = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
            operatingSystem = System.Runtime.InteropServices.RuntimeInformation.OSDescription,
            boundary = "real authenticated Kestrel controllers/service/PostgreSQL; actual standard exporters; separate Program container smoke required",
            batches = records,
        }, new JsonSerializerOptions { WriteIndented = true }));
    }

    public async ValueTask DisposeAsync()
    {
        _http.Dispose();
        if (_container) { await DockerAsync(["rm", "--force", _name], allowMissing: true); _container = false; }
        if (_volume) { await DockerAsync(["volume", "rm", _name]); _volume = false; }
        if (_network) { await DockerAsync(["network", "rm", _name]); _network = false; }
        var directory = Environment.GetEnvironmentVariable("WFS_API_TELEMETRY_EVIDENCE_DIR");
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
            await File.WriteAllTextAsync(Path.Combine(directory, "receiver-cleanup.json"), JsonSerializer.Serialize(new
            {
                receiver = _name, containerId = _containerId, imageId = _imageId,
                ownedContainerRemoved = !_container, ownedVolumeRemoved = !_volume, ownedNetworkRemoved = !_network,
                credentialFilesCreated = false, sharedReceiver18986 = "untouched", preview19010 = "untouched"
            }, new JsonSerializerOptions { WriteIndented = true }));
        }
    }

    private static int FreePort()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        return ((IPEndPoint)listener.LocalEndpoint).Port;
    }

    private static async Task<string> DockerAsync(string[] arguments, Dictionary<string, string>? environment = null, bool allowMissing = false)
    {
        var start = new ProcessStartInfo("docker") { RedirectStandardOutput = true, RedirectStandardError = true };
        foreach (var argument in arguments) start.ArgumentList.Add(argument);
        if (environment is not null) foreach (var (key, value) in environment) start.Environment[key] = value;
        using var process = Process.Start(start) ?? throw new InvalidOperationException("Docker did not start.");
        var stdout = process.StandardOutput.ReadToEndAsync();
        var stderr = process.StandardError.ReadToEndAsync();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(45));
        try { await process.WaitForExitAsync(timeout.Token); }
        catch { process.Kill(entireProcessTree: true); await process.WaitForExitAsync(); throw; }
        var error = await stderr; // Docker error text can contain runtime configuration; do not echo it.
        if (allowMissing && process.ExitCode != 0 && error.Contains("No such container", StringComparison.OrdinalIgnoreCase)) return "";
        Assert.True(process.ExitCode == 0, $"Owned Docker operation {arguments[0]} failed with exit {process.ExitCode}.");
        return (await stdout).Trim();
    }
}

internal sealed record TelemetryBatch(string Route, byte[] Bytes, int Status, bool Forwarded, bool LostAcknowledgement);

internal sealed class TelemetryCaptureBridge : IAsyncDisposable
{
    private readonly HttpListener _listener = new();
    private readonly HttpListener _upstream = new();
    private readonly HttpClient _http = new(new SocketsHttpHandler { UseProxy = false, AllowAutoRedirect = false }) { Timeout = TimeSpan.FromSeconds(10) };
    private readonly ConcurrentQueue<TelemetryBatch> _batches = new();
    private Task _worker = Task.CompletedTask;
    private OwnedTelemetryReceiver _receiver = null!;
    public TelemetryBatch[] Batches => _batches.ToArray();
    public string Origin { get; private set; } = "";
    public string UpstreamOrigin { get; private set; } = "";
    public bool Reject { get; set; }
    public bool Redirect { get; set; }
    public int RedirectTargetRequests { get; private set; }
    public bool LoseFirstLogAcknowledgement { get; set; }
    public bool LostAcknowledgementOccurred { get; private set; }

    public static Task<TelemetryCaptureBridge> StartAsync(OwnedTelemetryReceiver receiver)
    {
        var owner = new TelemetryCaptureBridge { _receiver = receiver };
        using var reservation = new TcpListener(IPAddress.Loopback, 0);
        reservation.Start();
        var port = ((IPEndPoint)reservation.LocalEndpoint).Port;
        reservation.Stop();
        owner.Origin = $"http://127.0.0.1:{port}";
        owner._listener.Prefixes.Add(owner.Origin + "/");
        owner._listener.Start();
        using var upstreamReservation = new TcpListener(IPAddress.Loopback, 0);
        upstreamReservation.Start();
        var upstreamPort = ((IPEndPoint)upstreamReservation.LocalEndpoint).Port;
        upstreamReservation.Stop();
        owner.UpstreamOrigin = $"http://127.0.0.1:{upstreamPort}";
        owner._upstream.Prefixes.Add(owner.UpstreamOrigin + "/");
        owner._upstream.Start();
        owner._worker = Task.WhenAll(owner.RunAsync(), owner.RunUpstreamAsync());
        return Task.FromResult(owner);
    }

    private async Task RunAsync()
    {
        while (_listener.IsListening)
        {
            HttpListenerContext context;
            try { context = await _listener.GetContextAsync(); }
            catch (HttpListenerException) when (!_listener.IsListening) { break; }
            catch (ObjectDisposedException) { break; }
            // HttpListener keeps this test transport outside ASP.NET native
            // instrumentation; it is not a second synthetic API application.
            using var suppressed = SuppressInstrumentationScope.Begin();
            var route = context.Request.Url!.AbsolutePath;
            if (route == "/redirected")
            {
                RedirectTargetRequests++;
                context.Response.StatusCode = 200;
                context.Response.Close();
                continue;
            }
            Assert.Contains(route, new[] { "/v1/logs", "/v1/traces" });
            Assert.Equal("application/x-protobuf", context.Request.ContentType);
            Assert.True(context.Request.Headers["Authorization"] == "Bearer " + _receiver.ServerToken,
                "Actual exporter must use the owned receiver's server authority.");
            Assert.Null(context.Request.Headers["Content-Encoding"]);
            using var data = new MemoryStream();
            await context.Request.InputStream.CopyToAsync(data);
            var bytes = data.ToArray();
            if (Reject || Redirect)
            {
                var status = Redirect ? 307 : 400;
                _batches.Enqueue(new(route, bytes, status, false, false));
                context.Response.StatusCode = status;
                if (Redirect) context.Response.RedirectLocation = Origin + "/redirected";
                context.Response.Close();
                continue;
            }
            using var request = new HttpRequestMessage(HttpMethod.Post, _receiver.Origin + route)
            { Content = new ByteArrayContent(bytes) };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _receiver.ServerToken);
            request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/x-protobuf");
            using var response = await _http.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var lost = route == "/v1/logs" && LoseFirstLogAcknowledgement && !LostAcknowledgementOccurred;
            if (lost) LostAcknowledgementOccurred = true;
            _batches.Enqueue(new(route, bytes, lost ? 503 : 200, true, lost));
            context.Response.StatusCode = lost ? 503 : 200;
            context.Response.ContentType = "application/x-protobuf";
            if (!lost) await response.Content.CopyToAsync(context.Response.OutputStream);
            context.Response.Close();
        }
    }

    private async Task RunUpstreamAsync()
    {
        while (_upstream.IsListening)
        {
            HttpListenerContext context;
            try { context = await _upstream.GetContextAsync(); }
            catch (HttpListenerException) when (!_upstream.IsListening) { break; }
            catch (ObjectDisposedException) { break; }
            var bytes = System.Text.Encoding.UTF8.GetBytes("wfs-api-private-sentinel");
            context.Response.ContentType = "text/plain";
            context.Response.ContentLength64 = bytes.Length;
            await context.Response.OutputStream.WriteAsync(bytes);
            context.Response.Close();
        }
    }

    public async ValueTask DisposeAsync()
    {
        _listener.Stop();
        _listener.Close();
        _upstream.Stop();
        _upstream.Close();
        await _worker;
        _http.Dispose();
    }
}
