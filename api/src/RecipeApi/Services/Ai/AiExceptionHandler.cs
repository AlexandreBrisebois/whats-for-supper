using System.ClientModel;
using System.Text.Json;
using RecipeApi.Models.Ai;

namespace RecipeApi.Services.Ai;

/// <summary>
/// Reusable utility for mapping complex AI exceptions to structured diagnostic data.
/// </summary>
public class AiExceptionHandler(ILogger<AiExceptionHandler> logger)
{
    public AiErrorDetail MapException(Exception ex, string? modelId = null, string? endpoint = null)
    {
        var detail = new AiErrorDetail
        {
            ModelId = modelId,
            Endpoint = endpoint,
            Message = ex.Message
        };

        if (ex is ClientResultException cre)
        {
            detail.Provider = "OpenAI/Gemini";
            detail.StatusCode = cre.Status;

            try
            {
                // Attempt to extract response body if available
                var response = cre.GetRawResponse();
                if (response != null)
                {
                    detail.ResponseBody = response.Content.ToString();
                }
            }
            catch
            {
                // Ignore failures in reading raw response
            }

            // Attempt to parse structured error if it's JSON
            if (!string.IsNullOrEmpty(detail.ResponseBody))
            {
                try
                {
                    using var doc = JsonDocument.Parse(detail.ResponseBody);
                    if (doc.RootElement.TryGetProperty("error", out var errorProp))
                    {
                        if (errorProp.TryGetProperty("message", out var msgProp))
                            detail.Message = msgProp.GetString();
                        if (errorProp.TryGetProperty("code", out var codeProp))
                            detail.ErrorCode = codeProp.GetString() ?? codeProp.GetRawText();
                    }
                }
                catch
                {
                    // Fallback to raw response
                }
            }
        }
        else if (ex is HttpRequestException hre)
        {
            detail.Provider = "Network/HTTP";
            detail.StatusCode = (int?)hre.StatusCode;
        }
        else if (ex is JsonException)
        {
            detail.Provider = "Data/Parser";
            detail.Message = "The AI returned an invalid or malformed response.";
        }

        logger.LogWarning("Mapped AI exception to detail: {Detail}", detail.ToString());
        return detail;
    }

    public bool IsTransient(Exception ex)
    {
        if (ex is ClientResultException cre)
        {
            // 429 (Rate Limit) and 503 (Service Unavailable) are transient
            return cre.Status == 429 || cre.Status == 503;
        }

        if (ex is HttpRequestException hre)
        {
            return hre.StatusCode == System.Net.HttpStatusCode.TooManyRequests ||
                   hre.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable ||
                   hre.StatusCode == System.Net.HttpStatusCode.GatewayTimeout;
        }

        return false;
    }
}
