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
        char openChar = ' ';
        char closeChar = ' ';

        if (firstBrace > -1 && (firstBracket == -1 || firstBrace < firstBracket))
        {
            start = firstBrace;
            openChar = '{';
            closeChar = '}';
        }
        else if (firstBracket > -1)
        {
            start = firstBracket;
            openChar = '[';
            closeChar = ']';
        }

        if (start > -1)
        {
            int depth = 0;
            bool inString = false;
            bool escaped = false;

            for (int i = start; i < sanitized.Length; i++)
            {
                char c = sanitized[i];
                if (escaped) { escaped = false; continue; }
                if (c == '\\') { escaped = true; continue; }
                if (c == '"') { inString = !inString; continue; }
                if (!inString)
                {
                    if (c == openChar) depth++;
                    else if (c == closeChar)
                    {
                        depth--;
                        if (depth == 0)
                        {
                            return sanitized.Substring(start, i - start + 1);
                        }
                    }
                }
            }

            // If we didn't find the closing brace but we have a start,
            // we might be truncated. Returning the whole thing from start
            // is better than nothing, but let's at least try to find the last
            // close brace as a fallback.
            int lastClose = sanitized.LastIndexOf(closeChar);
            if (lastClose > start)
            {
                return sanitized.Substring(start, lastClose - start + 1);
            }

            return sanitized.Substring(start);
        }

        return sanitized;
    }
}
