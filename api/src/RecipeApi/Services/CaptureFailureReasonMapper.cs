namespace RecipeApi.Services;

public static class CaptureFailureReasonMapper
{
    private const string FallbackReason =
        "Something went wrong importing the recipe. Try again or come back later.";

    private static readonly Dictionary<string, string> KnownReasons =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["url_unreadable"] =
                "We couldn't read the recipe page. The site may be blocking import right now.",
            ["extraction_incomplete"] =
                "We found the page, but not enough recipe details to save it cleanly.",
            ["model_timeout"] =
                "The recipe took too long to process. Try again in a moment.",
            ["image_parse_failure"] =
                "The photos were too unclear to turn into a recipe.",
        };

    public static string ToFriendlyReason(string? failureCode) =>
        failureCode is not null && KnownReasons.TryGetValue(failureCode, out var reason)
            ? reason
            : FallbackReason;
}
