using System.Text.Json.Serialization;
using RecipeApi.Services;

namespace RecipeApi.Dto;

public sealed class DemoResetRequiredError(Guid generation)
{
    [JsonPropertyName("status")]
    public int Status { get; } = StatusCodes.Status412PreconditionFailed;
    [JsonPropertyName("code")]
    public string Code { get; } = DemoGenerationProtocol.ResetCode;
    [JsonPropertyName("message")]
    public string Message { get; } = "The demo was reset. Refresh to continue. This request did not change the restored household.";
    [JsonPropertyName("generation")]
    public Guid Generation { get; } = generation;
}
