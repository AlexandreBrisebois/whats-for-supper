using System.Text.Json.Nodes;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace RecipeApi.Infrastructure;

/// <summary>The manual, bounded form reader owns validation; publish its exact approved wire shape.</summary>
public static class PdfCaptureOpenApi
{
    public static void AddServices(IServiceCollection services) =>
        services.AddOpenApi(options => options.AddOperationTransformer(TransformAsync));

    public static Task TransformAsync(OpenApiOperation operation, OpenApiOperationTransformerContext context, CancellationToken ct)
    {
        if (context.Description.RelativePath != "api/recipes/capture-pdf") return Task.CompletedTask;
        operation.OperationId = "capturePdfRecipe";
        operation.Summary = "Capture one recipe from a PDF (preview)";
        operation.RequestBody = new OpenApiRequestBody
        {
            Required = true,
            Content = new Dictionary<string, IOpenApiMediaType>
            {
                ["multipart/form-data"] = new OpenApiMediaType()
                {
                    Schema = new OpenApiSchema
                    {
                        Type = JsonSchemaType.Object, Required = new HashSet<string> { "file" }, AdditionalPropertiesAllowed = false,
                        Properties = new Dictionary<string, IOpenApiSchema>
                        {
                            ["file"] = new OpenApiSchema { Type = JsonSchemaType.String, Format = "binary", Description = "Exactly one .pdf with application/pdf MIME type, 1–20,971,520 bytes; document validity is checked asynchronously." },
                            ["rating"] = new OpenApiSchema { Type = JsonSchemaType.Integer, Minimum = "0", Maximum = "3", Default = JsonValue.Create(0) },
                            ["notes"] = new OpenApiSchema { Type = JsonSchemaType.String, Description = "Optional text; trimmed, with blank text stored as null." }
                        }
                    },
                    Encoding = new Dictionary<string, OpenApiEncoding> { ["file"] = new() { ContentType = "application/pdf" } }
                }
            }
        };
        var error = Object(new Dictionary<string, IOpenApiSchema>
        {
            ["status"] = new OpenApiSchema { Type = JsonSchemaType.Integer },
            ["message"] = new OpenApiSchema { Type = JsonSchemaType.String }
        }, "status", "message");
        operation.Responses = new OpenApiResponses
        {
            ["202"] = JsonResponse("Pending recipe persisted before conversion", Object(new Dictionary<string, IOpenApiSchema>
            {
                ["data"] = Object(new Dictionary<string, IOpenApiSchema> { ["id"] = new OpenApiSchema { Type = JsonSchemaType.String, Format = "uuid" } }, "id")
            }, "data")),
            ["400"] = JsonResponse("Missing/extra file, missing or invalid member, malformed multipart or invalid metadata", error),
            ["401"] = new OpenApiResponse { Description = "Household authentication required (existing authentication response)" },
            ["409"] = JsonResponse("PDF preview disabled; no pending recipe or workflow created", error),
            ["413"] = JsonResponse("File exceeds 20,971,520 bytes; no pending recipe or workflow created", error),
            ["415"] = JsonResponse("Unsupported transport type: requires .pdf extension and application/pdf MIME type", error)
        };
        return Task.CompletedTask;
    }

    private static OpenApiSchema Object(Dictionary<string, IOpenApiSchema> properties, params string[] required) =>
        new() { Type = JsonSchemaType.Object, Properties = properties, Required = new HashSet<string>(required) };
    private static OpenApiResponse JsonResponse(string description, OpenApiSchema schema) => new()
    {
        Description = description,
        Content = new Dictionary<string, IOpenApiMediaType> { ["application/json"] = new OpenApiMediaType() { Schema = schema } }
    };
}
