using Microsoft.AspNetCore.StaticFiles;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations
builder.AddServiceDefaults();

// Get API base URL from configuration
var apiBaseUrl = builder.Configuration["API_BASE_URL"] ?? "http://localhost:5474";

var app = builder.Build();

// Configure static files with proper MIME types
var provider = new FileExtensionContentTypeProvider();
provider.Mappings[".js"] = "application/javascript";
provider.Mappings[".mjs"] = "application/javascript";
provider.Mappings[".json"] = "application/json";

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = provider,
    OnPrepareResponse = ctx =>
    {
        // Add security headers
        ctx.Context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    }
});

// Health endpoint
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// API configuration endpoint - provides API URL to frontend
app.MapGet("/api/config", () => Results.Ok(new { apiBaseUrl }));

// Fallback to index.html for SPA routing
app.MapFallbackToFile("index.html");

app.Run();
