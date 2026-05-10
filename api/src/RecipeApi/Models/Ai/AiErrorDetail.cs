namespace RecipeApi.Models.Ai;

/// <summary>
/// Structured diagnostic information for AI-related failures.
/// This is persisted as part of the task error message to aid debugging.
/// </summary>
public class AiErrorDetail
{
    public string Provider { get; set; } = "Unknown";
    public string? Endpoint { get; set; }
    public string? ModelId { get; set; }
    public int? StatusCode { get; set; }
    public string? ErrorCode { get; set; }
    public string? Message { get; set; }
    public string? ResponseBody { get; set; }
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;

    public override string ToString()
    {
        return $"[AI Error | {Provider} | Status: {StatusCode ?? 0}] {Message ?? "No message"}. " +
               (string.IsNullOrEmpty(ResponseBody) ? "" : $"Details: {ResponseBody}");
    }
}
