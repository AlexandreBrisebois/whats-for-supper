using System.Text.RegularExpressions;

namespace RecipeApi.Utils;

public static class JsonUtils
{
    /// <summary>
    /// Extracts the first JSON object or array from a string.
    /// This is useful for cleaning up AI responses that may contain markdown or preamble.
    /// </summary>
    /// <param name="json">The potentially messy JSON string.</param>
    /// <returns>The extracted JSON string, or the original string if no braces are found.</returns>
    public static string SanitizeJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return json;

        var sanitized = json.Trim();

        // Handle possible markdown code blocks
        if (sanitized.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            sanitized = sanitized.Substring(7);
        }
        else if (sanitized.StartsWith("```", StringComparison.OrdinalIgnoreCase))
        {
            sanitized = sanitized.Substring(3);
        }

        if (sanitized.EndsWith("```", StringComparison.OrdinalIgnoreCase))
        {
            sanitized = sanitized.Substring(0, sanitized.Length - 3);
        }

        sanitized = sanitized.Trim();

        int firstBrace = sanitized.IndexOf('{');
        int firstBracket = sanitized.IndexOf('[');

        int start = -1;
        char endChar = ' ';

        if (firstBrace > -1 && (firstBracket == -1 || firstBrace < firstBracket))
        {
            start = firstBrace;
            endChar = '}';
        }
        else if (firstBracket > -1)
        {
            start = firstBracket;
            endChar = ']';
        }

        if (start > -1)
        {
            int lastBrace = sanitized.LastIndexOf(endChar);
            if (lastBrace > start)
            {
                return sanitized.Substring(start, lastBrace - start + 1);
            }
        }

        return sanitized;
    }
}
