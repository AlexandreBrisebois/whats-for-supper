using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Text;
using Microsoft.Extensions.Configuration;
using RecipeApi.Telemetry;
using Xunit;

namespace RecipeApi.Tests.Telemetry;

[Collection("WFS telemetry SDK")]
public class RecipeIssueTelemetryExportTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task IssueFact_UsesIsolatedFixedLogAndRestoresAmbientActivity(bool resolved)
    {
        using var server = Receiver();
        var config = RecipeIssueTelemetryPolicyTests.Configuration(destination: server.Prefixes.Single().TrimEnd('/'));
        using var telemetry = new WfsTelemetry(config);
        using var activity = new Activity("private-activity").Start();
        activity.AddBaggage("private", "private-baggage");
        if (resolved) telemetry.Resolved(); else telemetry.Saved();
        Assert.Same(activity, Activity.Current);
        var flush = Task.Run(() => telemetry.ForceFlush());
        var context = await server.GetContextAsync().WaitAsync(TimeSpan.FromSeconds(4));
        using var bytes = new MemoryStream();
        await context.Request.InputStream.CopyToAsync(bytes);
        context.Response.StatusCode = 200; context.Response.Close();
        Assert.True(await flush);
        var payload = Encoding.UTF8.GetString(bytes.ToArray());
        Assert.Equal("/v1/logs", context.Request.Url!.AbsolutePath);
        Assert.Equal("application/x-protobuf", context.Request.ContentType);
        Assert.Equal("Bearer synthetic-server-token", context.Request.Headers["Authorization"]);
        Assert.Contains(resolved ? "wfs.recipe_issue.resolved" : "wfs.recipe_issue.saved", payload);
        Assert.Contains(resolved ? "WFS recipe issue resolved" : "WFS recipe issue saved", payload);
        Assert.Contains("event.id", payload);
        Assert.Contains("RecipeApi", payload);
        Assert.Contains("synthetic-version", payload);
        Assert.DoesNotContain("private", payload);
        Assert.DoesNotContain("service.instance.id", payload);
        Assert.DoesNotContain("telemetry.auto.version", payload);
    }

    [Fact]
    public async Task DisabledAndChangedConfiguration_NeverQueuesOrRecreatesProviders()
    {
        using var server = Receiver();
        var config = RecipeIssueTelemetryPolicyTests.Configuration(enabled: "false", destination: server.Prefixes.Single().TrimEnd('/'));
        using var telemetry = new WfsTelemetry(config);
        telemetry.Saved();
        telemetry.Resolved();
        config["WFS_TELEMETRY_ENABLED"] = "true";
        telemetry.Saved();
        telemetry.Resolved();
        telemetry.ForceFlush();
        var receive = server.GetContextAsync();
        Assert.NotSame(receive, await Task.WhenAny(receive, Task.Delay(150)));
        server.Stop();
        try { await receive; } catch (Exception e) when (e is HttpListenerException or ObjectDisposedException) { }
    }

    internal static HttpListener Receiver()
    {
        var socket = new TcpListener(IPAddress.Loopback, 0); socket.Start();
        var port = ((IPEndPoint)socket.LocalEndpoint).Port; socket.Stop();
        var server = new HttpListener(); server.Prefixes.Add($"http://127.0.0.1:{port}/"); server.Start(); return server;
    }
}
