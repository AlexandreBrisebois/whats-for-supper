using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging.Abstractions;
using RecipeApi.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Infrastructure;

public class SuccessWrappingFilterTests
{
    [Theory]
    [InlineData(400, 200, false)]
    [InlineData(404, 200, false)]
    [InlineData(409, 200, false)]
    [InlineData(500, 200, false)]
    [InlineData(200, 200, true)]
    [InlineData(201, 200, true)]
    [InlineData(200, 409, true)]
    [InlineData(null, 400, false)]
    [InlineData(null, 200, true)]
    public async Task ResultStatus_DeterminesWhetherPayloadIsWrapped(int? resultStatus, int responseStatus, bool shouldWrap)
    {
        var http = new DefaultHttpContext();
        http.Response.StatusCode = responseStatus;
        var action = new ActionContext(http, new RouteData(), new ActionDescriptor());
        var payload = new { status = resultStatus ?? responseStatus, message = "Plan changed" };
        var result = new ObjectResult(payload) { StatusCode = resultStatus };
        var context = new ResultExecutingContext(action, [], result, new object());
        var filter = new SuccessWrappingFilter(NullLogger<SuccessWrappingFilter>.Instance);

        await filter.OnResultExecutionAsync(context,
            () => Task.FromResult(new ResultExecutedContext(action, [], result, context.Controller)));

        var body = JsonSerializer.SerializeToElement(result.Value);
        Assert.Equal(shouldWrap, body.TryGetProperty("data", out var data));
        var content = shouldWrap ? data : body;
        Assert.Equal(resultStatus ?? responseStatus, content.GetProperty("status").GetInt32());
        Assert.Equal("Plan changed", content.GetProperty("message").GetString());
        if (!shouldWrap) Assert.Same(payload, result.Value);
    }
}
