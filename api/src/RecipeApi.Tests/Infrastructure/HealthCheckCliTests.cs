using System.Net;
using System.Net.Sockets;
using System.Text;
using RecipeApi.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Infrastructure;

public class HealthCheckCliTests
{
    private static readonly Func<string, string?> EmptyEnv = _ => null;

    [Fact]
    public void ResolveProbeUri_UsesDefaultPort9001_WhenNoUrlOrEnvironmentSet()
    {
        var uri = HealthCheckCli.ResolveProbeUri(["--healthcheck"], EmptyEnv);

        Assert.Equal("http://127.0.0.1:9001/api/health", uri.ToString());
    }

    [Theory]
    [InlineData("http://+:9001", "http://127.0.0.1:9001/api/health")]
    [InlineData("http://+:8080", "http://127.0.0.1:8080/api/health")]
    [InlineData("http://*:9050;https://*:9051", "http://127.0.0.1:9050/api/health")]
    [InlineData("http://0.0.0.0:9123", "http://127.0.0.1:9123/api/health")]
    [InlineData("http://localhost:9234", "http://127.0.0.1:9234/api/health")]
    public void ResolveProbeUri_UsesFirstValidPortFromAspNetCoreUrls(string aspNetCoreUrls, string expected)
    {
        var uri = HealthCheckCli.ResolveProbeUri(
            ["--healthcheck"],
            key => key == "ASPNETCORE_URLS" ? aspNetCoreUrls : null);

        Assert.Equal(expected, uri.ToString());
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not-a-valid-url")]
    public void ResolveProbeUri_FallsBackTo9001_WhenAspNetCoreUrlsIsInvalidOrBlank(string aspNetCoreUrls)
    {
        var uri = HealthCheckCli.ResolveProbeUri(
            ["--healthcheck"],
            key => key == "ASPNETCORE_URLS" ? aspNetCoreUrls : null);

        Assert.Equal("http://127.0.0.1:9001/api/health", uri.ToString());
    }

    [Theory]
    [InlineData(new[] { "--healthcheck", "--url", "http://127.0.0.1:45678/api/health" }, "http://127.0.0.1:45678/api/health")]
    [InlineData(new[] { "--healthcheck", "--url=http://127.0.0.1:45678" }, "http://127.0.0.1:45678/api/health")]
    [InlineData(new[] { "--healthcheck", "--url", "http://127.0.0.1:45678/custom/health" }, "http://127.0.0.1:45678/custom/health")]
    public void ResolveProbeUri_UrlArgumentOverridesAspNetCoreUrls(string[] args, string expected)
    {
        var uri = HealthCheckCli.ResolveProbeUri(
            args,
            key => key == "ASPNETCORE_URLS" ? "http://+:8080" : null);

        Assert.Equal(expected, uri.ToString());
    }

    [Fact]
    public async Task RunAsync_ReturnsZero_WhenLoopbackServerResponds200()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;

        string? requestLine = null;
        var serverTask = Task.Run(async () =>
        {
            using var client = await listener.AcceptTcpClientAsync();
            await using var stream = client.GetStream();
            using var reader = new StreamReader(stream, Encoding.ASCII, detectEncodingFromByteOrderMarks: false, bufferSize: 1024, leaveOpen: true);
            requestLine = await reader.ReadLineAsync();
            while (!string.IsNullOrEmpty(await reader.ReadLineAsync()))
            {
            }

            var responseBytes = Encoding.ASCII.GetBytes(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 20\r\nConnection: close\r\n\r\n{\"status\":\"healthy\"}");
            await stream.WriteAsync(responseBytes);
            await stream.FlushAsync();
        });

        var exitCode = await HealthCheckCli.RunAsync(
            ["--healthcheck", "--url", $"http://127.0.0.1:{port}/api/health"],
            getEnvironmentVariable: EmptyEnv);

        await serverTask;
        listener.Stop();

        Assert.Equal(0, exitCode);
        Assert.Equal("GET /api/health HTTP/1.1", requestLine);
    }

    [Fact]
    public async Task RunAsync_ReturnsOne_WhenLoopbackServerResponds503()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;

        var serverTask = Task.Run(async () =>
        {
            using var client = await listener.AcceptTcpClientAsync();
            await using var stream = client.GetStream();
            using var reader = new StreamReader(stream, Encoding.ASCII, detectEncodingFromByteOrderMarks: false, bufferSize: 1024, leaveOpen: true);
            while (!string.IsNullOrEmpty(await reader.ReadLineAsync()))
            {
            }

            var responseBytes = Encoding.ASCII.GetBytes(
                "HTTP/1.1 503 Service Unavailable\r\nContent-Length: 22\r\nConnection: close\r\n\r\n{\"status\":\"unhealthy\"}");
            await stream.WriteAsync(responseBytes);
            await stream.FlushAsync();
        });

        var exitCode = await HealthCheckCli.RunAsync(
            ["--healthcheck", "--url", $"http://127.0.0.1:{port}/api/health"],
            getEnvironmentVariable: EmptyEnv);

        await serverTask;
        listener.Stop();

        Assert.Equal(1, exitCode);
    }

    [Fact]
    public async Task RunAsync_ReturnsOne_WhenPortIsUnreachable()
    {
        int closedPort;
        using (var ephemeral = new TcpListener(IPAddress.Loopback, 0))
        {
            ephemeral.Start();
            closedPort = ((IPEndPoint)ephemeral.LocalEndpoint).Port;
            ephemeral.Stop();
        }

        var exitCode = await HealthCheckCli.RunAsync(
            ["--healthcheck", "--url", $"http://127.0.0.1:{closedPort}/api/health"],
            getEnvironmentVariable: EmptyEnv,
            timeout: TimeSpan.FromMilliseconds(500));

        Assert.Equal(1, exitCode);
    }

    [Fact]
    public async Task RunAsync_ReturnsOne_WhenServerTimesOut()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        using var releaseServer = new CancellationTokenSource();

        var serverTask = Task.Run(async () =>
        {
            using var client = await listener.AcceptTcpClientAsync(releaseServer.Token);
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(5), releaseServer.Token);
            }
            catch (OperationCanceledException)
            {
            }
        });

        var exitCode = await HealthCheckCli.RunAsync(
            ["--healthcheck", "--url", $"http://127.0.0.1:{port}/api/health"],
            getEnvironmentVariable: EmptyEnv,
            timeout: TimeSpan.FromMilliseconds(150));

        await releaseServer.CancelAsync();
        await serverTask;
        listener.Stop();

        Assert.Equal(1, exitCode);
    }

    [Theory]
    [InlineData((object)new[] { "--healthcheck", "--url" })]
    [InlineData((object)new[] { "--healthcheck", "--url", "relative/path" })]
    [InlineData((object)new[] { "--healthcheck", "--url=ftp://127.0.0.1:9001/api/health" })]
    public async Task RunAsync_ReturnsOne_WhenUrlArgumentIsInvalid(string[] args)
    {
        var exitCode = await HealthCheckCli.RunAsync(args, getEnvironmentVariable: EmptyEnv);

        Assert.Equal(1, exitCode);
    }

    [Theory]
    [InlineData(HttpStatusCode.OK, 0)]
    [InlineData(HttpStatusCode.NoContent, 0)]
    [InlineData(HttpStatusCode.ServiceUnavailable, 1)]
    [InlineData(HttpStatusCode.InternalServerError, 1)]
    public async Task RunAsync_MapsHttpStatusCodesToExitCode(HttpStatusCode statusCode, int expectedExitCode)
    {
        using var handler = new StubHandler(statusCode);

        var exitCode = await HealthCheckCli.RunAsync(
            ["--healthcheck"],
            handler: handler,
            getEnvironmentVariable: EmptyEnv);

        Assert.Equal(expectedExitCode, exitCode);
        Assert.Equal("http://127.0.0.1:9001/api/health", handler.LastRequestUri?.ToString());
    }

    private sealed class StubHandler(HttpStatusCode statusCode) : HttpMessageHandler
    {
        public Uri? LastRequestUri { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequestUri = request.RequestUri;
            return Task.FromResult(new HttpResponseMessage(statusCode));
        }
    }
}
