using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using YamlDotNet.RepresentationModel;

namespace RecipeApi.Tests.Contracts;

/// <summary>
/// Complements <c>OpenApiEndpointParityTests</c> by verifying ASP.NET Core's
/// <see cref="EndpointDataSource"/> route templates, path parameter names/order,
/// and <see cref="ProducesResponseTypeAttribute"/> / OpenAPI transformer status-code
/// metadata against <c>specs/openapi.yaml</c> in-process.
/// </summary>
public class OpenApiDocumentParityTests
{
    private static readonly HashSet<string> HttpVerbs = new(StringComparer.OrdinalIgnoreCase)
    {
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
    };

    [Fact]
    public async Task EndpointDataSourceRoutesPathParametersAndStatusMetadataMatchOpenApiSpec()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        var endpointDataSource = factory.Services.GetRequiredService<EndpointDataSource>();
        var specOperations = ReadSpecOperations(FindOpenApiSpecPath());

        using var client = factory.CreateClient();
        using var openApiResponse = await client.GetAsync("/openapi/v1.json");
        openApiResponse.EnsureSuccessStatusCode();
        using var generatedDoc = JsonDocument.Parse(await openApiResponse.Content.ReadAsStringAsync());
        var generatedOperations = ReadGeneratedOperations(generatedDoc.RootElement);

        var controllerEndpoints = new Dictionary<(string Method, string Path), EndpointContract>();

        foreach (var routeEndpoint in endpointDataSource.Endpoints.OfType<RouteEndpoint>())
        {
            if (routeEndpoint.Metadata.GetMetadata<ControllerActionDescriptor>() is null)
            {
                continue;
            }

            var rawTemplate = routeEndpoint.RoutePattern.RawText
                ?? throw new InvalidOperationException("Controller endpoint has null RoutePattern.RawText.");
            var normalizedPath = NormalizeRouteTemplate(rawTemplate);
            var pathParameters = routeEndpoint.RoutePattern.Parameters
                .Select(static p => p.Name)
                .ToArray();
            var declaredStatusCodes = routeEndpoint.Metadata
                .OfType<ProducesResponseTypeAttribute>()
                .Select(static attr => attr.StatusCode.ToString(CultureInfo.InvariantCulture))
                .ToHashSet(StringComparer.Ordinal);

            var httpMethods = routeEndpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? [];
            foreach (var verb in httpMethods.Where(HttpVerbs.Contains))
            {
                var key = (verb.ToUpperInvariant(), normalizedPath);
                controllerEndpoints[key] = new EndpointContract(pathParameters, declaredStatusCodes);
            }
        }

        Assert.True(controllerEndpoints.Count >= 90, $"Expected at least 90 controller operations, found {controllerEndpoints.Count}.");

        var onlyInRouting = controllerEndpoints.Keys
            .Except(specOperations.Keys)
            .OrderBy(static k => k.Path, StringComparer.Ordinal)
            .ThenBy(static k => k.Method, StringComparer.Ordinal)
            .Select(static k => $"{k.Method} {k.Path}")
            .ToArray();

        var onlyInSpec = specOperations.Keys
            .Except(controllerEndpoints.Keys)
            .OrderBy(static k => k.Path, StringComparer.Ordinal)
            .ThenBy(static k => k.Method, StringComparer.Ordinal)
            .Select(static k => $"{k.Method} {k.Path}")
            .ToArray();

        Assert.True(
            onlyInRouting.Length == 0 && onlyInSpec.Length == 0,
            $"EndpointDataSource vs specs/openapi.yaml route/verb mismatch.\n" +
            $"In EndpointDataSource only: [{string.Join(", ", onlyInRouting)}]\n" +
            $"In specs/openapi.yaml only: [{string.Join(", ", onlyInSpec)}]");

        var pathParamMismatches = new List<string>();
        var statusMismatches = new List<string>();
        var endpointsWithExplicitStatusMetadata = 0;

        foreach (var (key, endpointContract) in controllerEndpoints.OrderBy(static kv => kv.Key.Path, StringComparer.Ordinal))
        {
            var specOp = specOperations[key];
            if (!endpointContract.PathParameters.SequenceEqual(specOp.TemplateParameters, StringComparer.Ordinal))
            {
                pathParamMismatches.Add(
                    $"{key.Method} {key.Path}: EndpointDataSource=[{string.Join(", ", endpointContract.PathParameters)}] vs spec template=[{string.Join(", ", specOp.TemplateParameters)}]");
            }

            if (generatedOperations.TryGetValue(key, out var generatedOp)
                && generatedOp.PathParameters.Count > 0
                && !endpointContract.PathParameters.ToHashSet(StringComparer.Ordinal).SetEquals(generatedOp.PathParameters))
            {
                pathParamMismatches.Add(
                    $"{key.Method} {key.Path}: EndpointDataSource=[{string.Join(", ", endpointContract.PathParameters)}] vs /openapi/v1.json=[{string.Join(", ", generatedOp.PathParameters)}]");
            }

            if (endpointContract.DeclaredStatusCodes.Count > 0)
            {
                endpointsWithExplicitStatusMetadata++;
                foreach (var code in endpointContract.DeclaredStatusCodes.OrderBy(static c => c, StringComparer.Ordinal))
                {
                    if (!specOp.ResponseCodes.Contains(code))
                    {
                        statusMismatches.Add(
                            $"{key.Method} {key.Path}: [ProducesResponseType({code})] missing from specs/openapi.yaml responses [{string.Join(", ", specOp.ResponseCodes)}]");
                    }

                    if (generatedOperations.TryGetValue(key, out var genForStatus)
                        && !genForStatus.ResponseCodes.Contains(code))
                    {
                        statusMismatches.Add(
                            $"{key.Method} {key.Path}: [ProducesResponseType({code})] missing from /openapi/v1.json responses [{string.Join(", ", genForStatus.ResponseCodes)}]");
                    }
                }
            }
        }

        // Verify custom OpenApiOperationTransformer (PdfCaptureOpenApi) response codes stay aligned with specs/openapi.yaml.
        var pdfKey = ("POST", "/api/recipes/capture-pdf");
        Assert.True(generatedOperations.TryGetValue(pdfKey, out var pdfGenerated));
        foreach (var transformedCode in pdfGenerated!.ResponseCodes.OrderBy(static c => c, StringComparer.Ordinal))
        {
            if (!specOperations[pdfKey].ResponseCodes.Contains(transformedCode))
            {
                statusMismatches.Add($"POST /api/recipes/capture-pdf: transformed OpenAPI status {transformedCode} missing from specs/openapi.yaml");
            }
        }

        Assert.True(
            endpointsWithExplicitStatusMetadata >= 15,
            $"Expected at least 15 endpoints with explicit ProducesResponseType metadata, found {endpointsWithExplicitStatusMetadata}.");
        Assert.True(
            pathParamMismatches.Count == 0,
            $"Path parameter mismatches:\n{string.Join("\n", pathParamMismatches)}");
        Assert.True(
            statusMismatches.Count == 0,
            $"Status code metadata mismatches:\n{string.Join("\n", statusMismatches)}");
    }

    private static string NormalizeRouteTemplate(string rawTemplate)
    {
        var stripped = Regex.Replace(rawTemplate.TrimStart('/'), @"\{([^}:?=]+)(?:[:?=][^}]*)?\}", "{$1}");
        return "/" + stripped;
    }

    private static Dictionary<(string Method, string Path), SpecOperation> ReadSpecOperations(string specPath)
    {
        using var reader = File.OpenText(specPath);
        var yaml = new YamlStream();
        yaml.Load(reader);

        var result = new Dictionary<(string Method, string Path), SpecOperation>();
        if (yaml.Documents.Count == 0 || yaml.Documents[0].RootNode is not YamlMappingNode root)
        {
            return result;
        }

        if (!root.Children.TryGetValue(new YamlScalarNode("paths"), out var pathsNode)
            || pathsNode is not YamlMappingNode paths)
        {
            return result;
        }

        foreach (var (pathKey, pathValue) in paths.Children)
        {
            if (pathKey is not YamlScalarNode { Value: { } path } || pathValue is not YamlMappingNode pathItem)
            {
                continue;
            }

            var templateParams = Regex.Matches(path, @"\{([^}]+)\}")
                .Select(static m => m.Groups[1].Value)
                .ToArray();

            foreach (var (methodKey, methodValue) in pathItem.Children)
            {
                if (methodKey is not YamlScalarNode { Value: { } verb }
                    || !HttpVerbs.Contains(verb)
                    || methodValue is not YamlMappingNode operation)
                {
                    continue;
                }

                var responseCodes = new HashSet<string>(StringComparer.Ordinal);
                if (operation.Children.TryGetValue(new YamlScalarNode("responses"), out var responsesNode)
                    && responsesNode is YamlMappingNode responses)
                {
                    foreach (var codeNode in responses.Children.Keys.OfType<YamlScalarNode>())
                    {
                        if (!string.IsNullOrWhiteSpace(codeNode.Value))
                        {
                            responseCodes.Add(codeNode.Value);
                        }
                    }
                }

                result[(verb.ToUpperInvariant(), path)] = new SpecOperation(templateParams, responseCodes);
            }
        }

        return result;
    }

    private static Dictionary<(string Method, string Path), GeneratedOperation> ReadGeneratedOperations(JsonElement root)
    {
        var result = new Dictionary<(string Method, string Path), GeneratedOperation>();
        if (!root.TryGetProperty("paths", out var paths) || paths.ValueKind != JsonValueKind.Object)
        {
            return result;
        }

        foreach (var pathEntry in paths.EnumerateObject())
        {
            if (pathEntry.Value.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            foreach (var methodEntry in pathEntry.Value.EnumerateObject())
            {
                if (!HttpVerbs.Contains(methodEntry.Name) || methodEntry.Value.ValueKind != JsonValueKind.Object)
                {
                    continue;
                }

                var pathParams = new HashSet<string>(StringComparer.Ordinal);
                if (methodEntry.Value.TryGetProperty("parameters", out var parameters)
                    && parameters.ValueKind == JsonValueKind.Array)
                {
                    foreach (var param in parameters.EnumerateArray())
                    {
                        if (param.TryGetProperty("in", out var location)
                            && location.GetString() == "path"
                            && param.TryGetProperty("name", out var name)
                            && name.GetString() is { } paramName)
                        {
                            pathParams.Add(paramName);
                        }
                    }
                }

                var responseCodes = new HashSet<string>(StringComparer.Ordinal);
                if (methodEntry.Value.TryGetProperty("responses", out var responses)
                    && responses.ValueKind == JsonValueKind.Object)
                {
                    foreach (var resp in responses.EnumerateObject())
                    {
                        responseCodes.Add(resp.Name);
                    }
                }

                result[(methodEntry.Name.ToUpperInvariant(), pathEntry.Name)] = new GeneratedOperation(pathParams, responseCodes);
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
            {
                return candidate;
            }

            dir = dir.Parent;
        }

        throw new FileNotFoundException("Could not locate specs/openapi.yaml from test base directory.", "specs/openapi.yaml");
    }

    private sealed record EndpointContract(string[] PathParameters, HashSet<string> DeclaredStatusCodes);

    private sealed record SpecOperation(string[] TemplateParameters, HashSet<string> ResponseCodes);

    private sealed record GeneratedOperation(HashSet<string> PathParameters, HashSet<string> ResponseCodes);
}
