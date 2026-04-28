using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace RecipeApi.Infrastructure;

/// <summary>
/// Automatically wraps all successful (2xx) responses in a { data: ... } object
/// to provide a consistent structure for the PWA client.
/// Skip wrapping for FileResult, EmptyResult, or already wrapped responses.
/// </summary>
public class SuccessWrappingFilter : IAsyncResultFilter
{
    public async Task OnResultExecutionAsync(ResultExecutingContext context, ResultExecutionDelegate next)
    {
        if (context.Result is ObjectResult objectResult &&
            context.HttpContext.Response.StatusCode is >= 200 and < 300)
        {
            var value = objectResult.Value;

            if (value != null && !ShouldSkip(context, value))
            {
                objectResult.Value = new { data = value };
            }
        }

        await next();
    }

    private static bool ShouldSkip(ResultExecutingContext context, object value)
    {
        // 1. Explicit skip via attribute
        if (context.ActionDescriptor.EndpointMetadata.Any(m => m is SkipWrappingAttribute))
            return true;

        var type = value.GetType();

        // 2. Anonymous types with 'data' are already wrapped
        if (type.Name.Contains("AnonymousType") && type.GetProperty("data") != null)
            return true;

        // 3. ResponseDto types define their own structure (e.g. RecipeListResponseDto)
        // EXCEPT for WorkflowTriggerResponseDto which the spec says MUST be wrapped.
        if (type.Name.EndsWith("ResponseDto") && !type.Name.StartsWith("WorkflowTrigger"))
            return true;

        // 4. Specifically named Response types
        if (type.Name.EndsWith("Response") && !type.Name.StartsWith("WorkflowTrigger"))
            return true;

        return false;
    }
}
