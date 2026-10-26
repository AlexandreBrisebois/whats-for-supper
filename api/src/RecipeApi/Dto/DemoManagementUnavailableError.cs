namespace RecipeApi.Dto;

public sealed class DemoManagementUnavailableError
{
    public const string Explanation = Services.DemoModeOptions.ManagementUnavailableMessage;
    public int Status { get; set; } = StatusCodes.Status403Forbidden;
    public string Code { get; set; } = "DEMO_MANAGEMENT_UNAVAILABLE";
    public string Message { get; set; } = Explanation;
}
