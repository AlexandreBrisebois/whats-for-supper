using System.Text.Json;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using YamlDotNet.RepresentationModel;

namespace RecipeApi.Tests.Controllers;

public class OpenApiEndpointParityTests
{
    private static readonly HashSet<string> HttpMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "get",
        "post",
        "put",
        "delete",
        "patch",
    };

    [Fact]
    public async Task GeneratedOpenApiEndpointsMatchSpec()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/openapi/v1.json");
        response.EnsureSuccessStatusCode();

        using var generatedDoc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var generatedPaths = ReadGeneratedPaths(generatedDoc);
        var specPaths = ReadSpecPaths(FindOpenApiSpecPath());

        var inGeneratedNotSpec = generatedPaths
            .Except(specPaths)
            .OrderBy(static endpoint => endpoint.Method, StringComparer.Ordinal)
            .ThenBy(static endpoint => endpoint.Path, StringComparer.Ordinal)
            .Select(static endpoint => $"{endpoint.Method} {endpoint.Path}")
            .ToArray();

        var inSpecNotGenerated = specPaths
            .Except(generatedPaths)
            .OrderBy(static endpoint => endpoint.Method, StringComparer.Ordinal)
            .ThenBy(static endpoint => endpoint.Path, StringComparer.Ordinal)
            .Select(static endpoint => $"{endpoint.Method} {endpoint.Path}")
            .ToArray();

        Assert.True(
            inGeneratedNotSpec.Length == 0 && inSpecNotGenerated.Length == 0,
            $"OpenAPI endpoint parity mismatch between /openapi/v1.json and specs/openapi.yaml.\n" +
            $"In generated API but missing from specs/openapi.yaml ({inGeneratedNotSpec.Length}): [{string.Join(", ", inGeneratedNotSpec)}]\n" +
            $"In specs/openapi.yaml but missing from generated API ({inSpecNotGenerated.Length}): [{string.Join(", ", inSpecNotGenerated)}]");
    }

    private static HashSet<(string Method, string Path)> ReadGeneratedPaths(JsonDocument document)
    {
        var result = new HashSet<(string Method, string Path)>();
        if (!document.RootElement.TryGetProperty("paths", out var paths))
            return result;

        foreach (var pathEntry in paths.EnumerateObject())
        {
            if (pathEntry.Value.ValueKind != JsonValueKind.Object)
                continue;

            foreach (var methodEntry in pathEntry.Value.EnumerateObject())
            {
                if (HttpMethods.Contains(methodEntry.Name))
                    result.Add((methodEntry.Name.ToUpperInvariant(), pathEntry.Name));
            }
        }

        return result;
    }

    private static HashSet<(string Method, string Path)> ReadSpecPaths(string specPath)
    {
        using var reader = File.OpenText(specPath);
        var yaml = new YamlStream();
        yaml.Load(reader);

        var result = new HashSet<(string Method, string Path)>();
        if (yaml.Documents.Count == 0 || yaml.Documents[0].RootNode is not YamlMappingNode root)
            return result;

        var pathsKey = new YamlScalarNode("paths");
        if (!root.Children.TryGetValue(pathsKey, out var pathsNode) || pathsNode is not YamlMappingNode paths)
            return result;

        foreach (var (pathKey, pathValue) in paths.Children)
        {
            if (pathKey is not YamlScalarNode { Value: { } path } || pathValue is not YamlMappingNode methods)
                continue;

            foreach (var methodKey in methods.Children.Keys)
            {
                if (methodKey is YamlScalarNode { Value: { } method } && HttpMethods.Contains(method))
                    result.Add((method.ToUpperInvariant(), path));
            }
        }

        return result;
    }

    private static string FindOpenApiSpecPath()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "specs", "openapi.yaml");
            if (File.Exists(candidate))
                return candidate;
            dir = dir.Parent;
        }

        throw new FileNotFoundException("Could not locate specs/openapi.yaml from test base directory.", "specs/openapi.yaml");
    }
}
