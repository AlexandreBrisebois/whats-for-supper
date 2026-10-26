using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Infrastructure;
using RecipeApi.Services;
namespace RecipeApi.Middleware;

/// <summary>Lease covers controller execution and streamed file response completion.</summary>
public sealed class RecoveryBoundaryMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, RecoveryBoundary boundary, RecipeDbContext db, DemoModeOptions demoMode)
    {
        var path = context.Request.Path;
        var mutation = !HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method)
            && path != "/api/recipes/search";
        if ((!boundary.Enabled && !(mutation && boundary.CoordinatesWrites)) || !path.StartsWithSegments("/api")
            || path.StartsWithSegments("/api/management/recovery") || path == "/api/management/status" || path == "/api/stream" || path == "/api/health")
        { await next(context); return; }
        IAsyncDisposable lease;
        try
        {
            lease = await boundary.EnterAsync(mutation ? RecoveryAccess.Write : RecoveryAccess.Read, context.RequestAborted);
        }
        catch (RecoveryBusyException ex)
        {
            context.Response.StatusCode = 503;
            context.Response.Headers.RetryAfter = "5";
            await context.Response.WriteAsJsonAsync(new { errorCode = "RECOVERY_BUSY", message = ex.Message }, context.RequestAborted);
            return;
        }
        await using (lease)
        {
            if (demoMode.Enabled)
            {
                var generation = await DemoGenerationProtocol.CurrentAsync(db, context.RequestAborted);
                context.Response.Headers[DemoGenerationProtocol.Header] = generation.ToString();
                var forbidden = context.GetEndpoint()?.Metadata.GetMetadata<DemoAiActionAttribute>() is not null
                    || context.GetEndpoint()?.Metadata.GetMetadata<DemoManagementActionAttribute>() is not null;
                var media = !mutation && path.StartsWithSegments("/api/recipes")
                    && (path.Value!.EndsWith("/hero", StringComparison.Ordinal) || path.Value.Contains("/original/", StringComparison.Ordinal))
                    && context.Request.Query.ContainsKey(DemoGenerationProtocol.MediaQuery);
                if (db.Database.IsNpgsql() && (mutation && !forbidden || media))
                {
                    var supplied = media ? context.Request.Query[DemoGenerationProtocol.MediaQuery] : context.Request.Headers[DemoGenerationProtocol.Header];
                    if (!Guid.TryParse(supplied, out var observed) || observed != generation)
                    {
                        context.Response.StatusCode = StatusCodes.Status412PreconditionFailed;
                        await context.Response.WriteAsJsonAsync(new DemoResetRequiredError(generation), context.RequestAborted);
                        return;
                    }
                }
            }
            await next(context);
        }
    }
}
