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

    private static readonly Dictionary<string, string> StepFailureReasons =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["fetch_url"] =
                "Couldn’t load the page — the site may be blocking import or temporarily unreachable.",
            ["fetch_url_content"] =
                "Couldn’t load the page — the site may be blocking import or temporarily unreachable.",
            ["parse_url"] =
                "Couldn’t read enough recipe details from that web page. Try again or enter it manually.",
            ["convert_pdf"] =
                "Couldn’t read the uploaded pages clearly enough to import.",
            ["extract_recipe"] =
                "Couldn’t extract the full recipe steps and ingredients. Retry to try parsing again.",
            ["synthesize_recipe"] =
                "Couldn’t write the recipe from your description right now. Retry to generate it again.",
            ["generate_hero"] =
                "Couldn’t create the recipe photo yet. Retry to pick up from this step.",
            ["sync_recipe"] =
                "Couldn’t finish saving the recipe details. Retry to continue.",
            ["categorize_ingredients"] =
                "Couldn’t organize the recipe ingredients yet. Retry to finish importing.",
            ["categorize_recipe"] =
                "Couldn’t finish tagging the recipe yet. Retry to continue.",
            ["recipe_ready"] =
                "Couldn’t mark the recipe ready yet. Retry to finish saving.",
            ["queue_search_index"] =
                "The recipe was saved, but search indexing failed to queue. Retry to index it.",
        };

    private static readonly Dictionary<string, string> ActiveStepLabels =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["fetch_url"] = "Loading page",
            ["fetch_url_content"] = "Loading page",
            ["parse_url"] = "Reading page",
            ["convert_pdf"] = "Reading pages",
            ["extract_recipe"] = "Extracting recipe",
            ["synthesize_recipe"] = "Writing recipe",
            ["generate_hero"] = "Creating photo",
            ["sync_recipe"] = "Saving recipe",
            ["categorize_ingredients"] = "Organizing ingredients",
            ["categorize_recipe"] = "Tagging recipe",
            ["recipe_ready"] = "Finishing up",
            ["complete_import_report"] = "Checking duplicates",
            ["queue_search_index"] = "Preparing search index",
        };

    public static string ToFriendlyReason(string? failureCode, string? failedStep = null, string? workflowId = null)
    {
        if (failureCode is not null && KnownReasons.TryGetValue(failureCode, out var reason))
            return reason;

        if (!string.IsNullOrWhiteSpace(failedStep) && StepFailureReasons.TryGetValue(failedStep, out var stepReason))
            return stepReason;

        if (workflowId is not null && workflowId.Equals("goto-synthesis", StringComparison.OrdinalIgnoreCase))
            return StepFailureReasons["synthesize_recipe"];

        return FallbackReason;
    }

    public static string? ToStepLabel(string? stepName) =>
        !string.IsNullOrWhiteSpace(stepName) && ActiveStepLabels.TryGetValue(stepName, out var label)
            ? label
            : null;
}
