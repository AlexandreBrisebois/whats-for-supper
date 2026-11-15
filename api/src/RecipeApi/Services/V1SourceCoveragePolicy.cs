using System.Text;
using System.Text.Json;

namespace RecipeApi.Services;

// This finite task-only wrapper never enters schema preparation/history dispatch.
internal static class V1SourceCoveragePolicy
{
    internal const string RequestSha256 = "7c24eecd198bfb4d03bd04426b304e857f433a20dbe63b6ca4f07c57d9b984a1";
    private const string RequestPath = "docs/handoffs/dependable-portions-next-slice/V1-SOURCE-COVERAGE-CONTINUATION.json";

    internal static JsonElement ReadRequest(byte[] bytes)
    {
        FoodVocabularyDefinitions.Require(FoodVocabularyDefinitions.Sha256(bytes) == RequestSha256);
        return FoodVocabularyDefinitions.ReadStrict<JsonElement>(new UTF8Encoding(false, true).GetString(bytes));
    }

    internal static JsonElement Load(string root, byte[] bytes)
    {
        var request = ReadRequest(bytes);
        _ = Exact(root, RequestPath, RequestSha256);
        RequireBindings(root, request.GetProperty("source"));
        RequireBindings(root, request.GetProperty("authorityBindings"));
        _ = SourceRequest(root, request);
        return request;
    }

    internal static byte[] SourceRequest(string root, JsonElement request)
    {
        var source = request.GetProperty("source").GetProperty("request");
        var bytes = Exact(root, source.GetProperty("path").GetString()!, source.GetProperty("sha256").GetString()!);
        _ = V1ExactSourceAdmission.FullSnapshotPolicy(root, bytes);
        return bytes;
    }

    private static void RequireBindings(string root, JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Array)
            foreach (var value in element.EnumerateArray()) RequireBindings(root, value);
        else if (element.ValueKind == JsonValueKind.Object)
        {
            if (element.TryGetProperty("path", out var path) && element.TryGetProperty("sha256", out var sha))
                _ = Exact(root, path.GetString()!, sha.GetString()!);
            foreach (var property in element.EnumerateObject()) RequireBindings(root, property.Value);
        }
    }

    private static byte[] Exact(string root, string relative, string sha)
    {
        FoodVocabularyDefinitions.Require(!Path.IsPathRooted(relative) && !relative.Split('/', '\\').Contains(".."));
        var path = Path.Combine(root, relative);
        RecoverySnapshotService.RejectLinks(path);
        var bytes = File.ReadAllBytes(path);
        FoodVocabularyDefinitions.Require(FoodVocabularyDefinitions.Sha256(bytes) == sha);
        return bytes;
    }
}
