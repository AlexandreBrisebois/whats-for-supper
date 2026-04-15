namespace RecipeApi.Dto;

public class HealthCheckResponseDto
{
    public string Status { get; set; } = "healthy";
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
    public Dictionary<string, object> Checks { get; set; } = [];
}
