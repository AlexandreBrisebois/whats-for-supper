using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Infrastructure;

/// <summary>Refuse AI-only entry before MVC reads form files or binds private content.</summary>
[AttributeUsage(AttributeTargets.Method)]
public sealed class DemoAiActionAttribute() : ProducesResponseTypeAttribute(typeof(DemoAiUnavailableError), StatusCodes.Status403Forbidden), IAsyncResourceFilter, IOrderedFilter
{
    public int Order => int.MinValue;

    public Task OnResourceExecutionAsync(ResourceExecutingContext context, ResourceExecutionDelegate next)
    {
        if (!context.HttpContext.RequestServices.GetRequiredService<DemoModeOptions>().Enabled)
            return next();

        context.Result = new ObjectResult(new DemoAiUnavailableError()) { StatusCode = StatusCodes.Status403Forbidden };
        return Task.CompletedTask;
    }
}
