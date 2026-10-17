using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public partial class TonightReplacementPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarLiveFact]
    public async Task LiveBrowser_TonightReplacementGeneratedClientAndTwoClientUpdates()
    {
        await new TomorrowPushPostgresTests(output).WithDatabase(async settings => {
            using var listener = new TcpListener(IPAddress.Loopback, 0);
            listener.Start();
            var port = ((IPEndPoint)listener.LocalEndpoint).Port;
            listener.Stop();
            var dropNext = 0; var rejectNext = 1; var moveRequests = 0; var assignments = 0;
            var clock = new DeploymentCalendarIntegrationTests.CalendarClock();
            var pwaUrl = $"http://127.0.0.1:{port}";
            await using var factory = await TestWebApplicationFactory.CreateWithAuthAsync(
                clock, new() {
                    ["Calendar:TimeZone"]="America/Toronto", ["Tests:PostgresConnectionString"]=settings.ConnectionString,
                    ["Tests:HttpUrl"]="http://127.0.0.1:0",
                }, app => {
                    app.Use(async (context, next) => {
                        if (context.Request.Method == "POST" && context.Request.Path == "/api/schedule/move") Interlocked.Increment(ref moveRequests);
                        if (context.Request.Method != "POST" || context.Request.Path != "/api/schedule/assign") { await next(context); return; }
                        Interlocked.Increment(ref assignments);
                        if (Interlocked.Exchange(ref rejectNext, 0) == 1) {
                            context.Response.StatusCode = 400;
                            await context.Response.WriteAsJsonAsync(new { message = "Injected save rejection before persistence" });
                            return;
                        }
                        if (Interlocked.Exchange(ref dropNext,0) == 0) { await next(context); return; }
                        var original=context.Response.Body;
                        await using var buffer=new MemoryStream();context.Response.Body=buffer;
                        try {
                            await next(context);
                            context.Response.Body=original;
                            context.Response.StatusCode=504;
                            context.Response.ContentLength=null;
                            await context.Response.WriteAsJsonAsync(new {message="Gateway lost the reply after commit"});
                        } finally { context.Response.Body=original; }
                    });
                    app.MapPost("/_test/tonight/fail-groceries", async (RecipeDbContext db) => {
                        await db.Database.ExecuteSqlRawAsync("CREATE OR REPLACE FUNCTION fail_tonight_grocery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected grocery failure'; END $$; CREATE TRIGGER fail_tonight_grocery BEFORE UPDATE OF grocery_items ON weekly_plans FOR EACH ROW EXECUTE FUNCTION fail_tonight_grocery()");
                        return Results.Ok();
                    }).RequireAuthorization();
                    app.MapPost("/_test/tonight/restore-groceries", async (RecipeDbContext db) => {
                        await db.Database.ExecuteSqlRawAsync("DROP TRIGGER IF EXISTS fail_tonight_grocery ON weekly_plans");
                        return Results.Ok();
                    }).RequireAuthorization();
                    app.MapPost("/_test/tonight/reject-next", () => { Interlocked.Exchange(ref rejectNext, 1); return Results.Ok(); }).RequireAuthorization();
                    app.MapPost("/_test/tonight/clock", async (HttpContext c) => {
                        var body = await c.Request.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                        clock.UtcNow = DateTimeOffset.Parse(body.GetProperty("instant").GetString()!);
                        return Results.Ok();
                    }).RequireAuthorization();
                    app.MapPost("/_test/tonight/drop-next",()=> { Interlocked.Exchange(ref dropNext,1); return Results.Ok(); }).RequireAuthorization();
                    app.MapGet("/_test/tonight/requests",()=>Results.Ok(new { moves=Volatile.Read(ref moveRequests), assignments=Volatile.Read(ref assignments) })).RequireAuthorization();
                    app.MapFallback("{**path}", async context => {
                    try {
                        using var client = new HttpClient();
                        using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method),pwaUrl+context.Request.Path+context.Request.QueryString);
                        if (context.Request.ContentLength>0) request.Content=new StreamContent(context.Request.Body);
                        foreach(var header in context.Request.Headers)
                            if (!string.Equals(header.Key,"Host",StringComparison.OrdinalIgnoreCase)) request.Headers.TryAddWithoutValidation(header.Key,header.Value.ToArray());
                        using var response=await client.SendAsync(request,HttpCompletionOption.ResponseHeadersRead,context.RequestAborted);
                        context.Response.StatusCode=(int)response.StatusCode;
                        foreach(var header in response.Headers.Concat(response.Content.Headers)) context.Response.Headers[header.Key]=header.Value.ToArray();
                        context.Response.Headers.Remove("transfer-encoding");
                        await response.Content.CopyToAsync(context.Response.Body,context.RequestAborted);
                    } catch(OperationCanceledException) when(context.RequestAborted.IsCancellationRequested) { }
                });
                });
            await TomorrowPushPostgresTests.Seed(factory);
            using (var scope = factory.Services.CreateScope()) {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                foreach (var recipe in await db.Recipes.ToListAsync()) recipe.IsDiscoverable = true;
                await db.SaveChangesAsync();
            }
            ProcessStartInfo Command(string file, params string[] args) {
                var process=new ProcessStartInfo(file) {WorkingDirectory=Path.Combine(TomorrowPushPostgresTests.Root(),"pwa"),RedirectStandardOutput=true,RedirectStandardError=true};
                foreach(var arg in args) process.ArgumentList.Add(arg);
                process.Environment["BASE_URL"]=factory.HttpAddress;
                process.Environment["TONIGHT_API_URL"]=factory.HttpAddress;
                process.Environment["API_INTERNAL_URL"]=factory.HttpAddress;
                process.Environment["NEXT_PUBLIC_API_BASE_URL"]="";
                process.Environment["HEARTH_SECRET"]=TestWebApplicationFactory.TestSecret;
                process.Environment["NEXT_PUBLIC_ENVIRONMENT"]="test";
                process.Environment["TZ"]="UTC";
                return process;
            }
            using var server=Process.Start(Command("node","node_modules/next/dist/bin/next","dev","-H","127.0.0.1","-p",port.ToString()))!;
            server.OutputDataReceived+=(_,e)=>{if(e.Data is not null) output.WriteLine(e.Data);};
            server.ErrorDataReceived+=(_,e)=>{if(e.Data is not null) output.WriteLine(e.Data);};
            server.BeginOutputReadLine();server.BeginErrorReadLine();
            try {
                using var probe=new HttpClient();var ready=false;
                for(var attempt=0;attempt<60;attempt++) {
                    try {ready=(await probe.GetAsync(pwaUrl+"/welcome")).IsSuccessStatusCode;}catch(HttpRequestException){}
                    if(ready||server.HasExited) break;
                    await Task.Delay(500);
                }
                Assert.True(ready,"Task-owned PWA failed to start.");
                output.WriteLine($"Real API/gateway {factory.HttpAddress}; PWA {pwaUrl}; database {settings.Database}");
                using var browser=Process.Start(Command("node","node_modules/@playwright/test/cli.js","test","tonight-replacement-live.spec.ts","--workers=1","--reporter=line"))!;
                var stdout=browser.StandardOutput.ReadToEndAsync();var stderr=browser.StandardError.ReadToEndAsync();
                try {
                    await browser.WaitForExitAsync().WaitAsync(TimeSpan.FromMinutes(3));
                    output.WriteLine(await stdout);output.WriteLine(await stderr);
                    Assert.Equal(0,browser.ExitCode);
                } finally {if(!browser.HasExited) browser.Kill(entireProcessTree:true);await browser.WaitForExitAsync();}
            } finally {if(!server.HasExited) server.Kill(entireProcessTree:true);await server.WaitForExitAsync();}
        });
    }
}
