using RecipeApi.Services;
namespace RecipeApi.Middleware;

/// <summary>Lease covers controller execution and streamed file response completion.</summary>
public sealed class RecoveryBoundaryMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, RecoveryBoundary boundary)
    {
        var path = context.Request.Path;
        if (!boundary.Enabled || !path.StartsWithSegments("/api") || path.StartsWithSegments("/api/management/recovery") || path == "/api/stream" || path == "/api/health")
        { await next(context); return; }
        IAsyncDisposable lease;
        try
        {
            var access = HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method)
                ? RecoveryAccess.Read : RecoveryAccess.Write;
            lease = await boundary.EnterAsync(access, context.RequestAborted);
        }
        catch (RecoveryBusyException ex)
        {
            context.Response.StatusCode = 503;
            context.Response.Headers.RetryAfter = "5";
            await context.Response.WriteAsJsonAsync(new { errorCode = "RECOVERY_BUSY", message = ex.Message }, context.RequestAborted);
            return;
        }
        await using (lease) await next(context);
    }
}
