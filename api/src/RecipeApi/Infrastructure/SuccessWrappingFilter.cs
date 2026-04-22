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
            // Don't wrap if it's already an ApiResponse or has a 'data' property
            // (Simple heuristic: if the value is an anonymous type with a 'data' property)
            var value = objectResult.Value;

            if (value != null && !IsAlreadyWrapped(value))
            {
                objectResult.Value = new { data = value };
            }
        }

        await next();
    }

    private static bool IsAlreadyWrapped(object value)
    {
        var type = value.GetType();

        // Don't wrap ResponseDto types — they define their own structure
        if (type.Name.EndsWith("ResponseDto"))
            return true;

        // Don't wrap if it's an anonymous type that already has a 'data' property.
        if (type.Name.Contains("AnonymousType") && type.GetProperty("data") != null)
            return true;

        return false;
    }
}
