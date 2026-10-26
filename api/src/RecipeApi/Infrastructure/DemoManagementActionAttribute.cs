using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using RecipeApi.Dto;
using RecipeApi.Services;

namespace RecipeApi.Infrastructure;

[AttributeUsage(AttributeTargets.Method)]
public sealed class DemoManagementActionAttribute() : ProducesResponseTypeAttribute(typeof(DemoManagementUnavailableError), StatusCodes.Status403Forbidden), IAsyncResourceFilter
{
    public Task OnResourceExecutionAsync(ResourceExecutingContext context, ResourceExecutionDelegate next)
    {
        if (!context.HttpContext.RequestServices.GetRequiredService<DemoModeOptions>().Enabled)
            return next();
        context.Result = new ObjectResult(new DemoManagementUnavailableError()) { StatusCode = StatusCodes.Status403Forbidden };
        return Task.CompletedTask;
    }
}
