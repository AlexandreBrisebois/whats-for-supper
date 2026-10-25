using RecipeApi.Services;

namespace RecipeApi.Dto;

public sealed class DemoAiUnavailableError
{
    public int Status { get; set; } = StatusCodes.Status403Forbidden;
    public string Code { get; set; } = DemoAiUnavailableException.Code;
    public string Message { get; set; } = DemoAiUnavailableException.Explanation;
}
