using Microsoft.EntityFrameworkCore;
using Serilog;
using RecipeApi.Data;
using RecipeApi.Middleware;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using OpenAI;
using Microsoft.Extensions.AI;
using System.ClientModel;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

// Bootstrap logger for startup errors before full Serilog is configured.
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // ── Serilog ──────────────────────────────────────────────────────────────
    builder.Host.UseSerilog((ctx, services, config) =>
        config.ReadFrom.Configuration(ctx.Configuration)
              .ReadFrom.Services(services)
              .Enrich.FromLogContext()
              .WriteTo.OpenTelemetry(options =>
              {
                  options.Endpoint = ctx.Configuration["OpenTelemetry:Endpoint"] ?? "http://localhost:4317";
                  options.ResourceAttributes = new Dictionary<string, object>
                  {
                      ["service.name"] = "RecipeApi"
                  };
              }));

    // ── OpenTelemetry ────────────────────────────────────────────────────────
    builder.Services.AddOpenTelemetry()
        .ConfigureResource(resource => resource.AddService("RecipeApi"))
        .WithLogging(logging =>
        {
            logging.AddConsoleExporter();
        })
        .WithTracing(tracing =>
        {
            tracing.AddAspNetCoreInstrumentation()
                   .AddHttpClientInstrumentation();
            // tracing.AddConsoleExporter(); // Too noisy for production stdout
        })
        .WithMetrics(metrics =>
        {
            metrics.AddAspNetCoreInstrumentation()
                   .AddHttpClientInstrumentation();
            // metrics.AddConsoleExporter(); // Too noisy for production stdout
        });

    // ── Controllers / JSON ───────────────────────────────────────────────────
    builder.Services.AddControllers()
        .AddNewtonsoftJson(options =>
        {
            options.SerializerSettings.ReferenceLoopHandling =
                Newtonsoft.Json.ReferenceLoopHandling.Ignore;
        });

    builder.Services.AddOpenApi();

    // ── Application services ─────────────────────────────────────────────────
    builder.Services.AddScoped<FamilyService>();
    builder.Services.AddScoped<ValidationService>();
    builder.Services.AddScoped<ImageService>();
    builder.Services.AddScoped<SeedService>();
    builder.Services.AddSingleton<ManagementTaskStore>();
    builder.Services.AddHostedService<ManagementWorker>();
    builder.Services.AddScoped<RecipeExtractionAgent>();
    builder.Services.AddScoped<RecipeHeroAgent>();
    builder.Services.AddHostedService<RecipeImportWorker>();

    // ── AI / Agent Framework ─────────────────────────────────────────────────
    var agentSettings = builder.Configuration.GetSection("AgentSettings");
    var endpoint = agentSettings["Endpoint"] ?? "http://localhost:11434/v1";
    var modelId = agentSettings["ModelId"] ?? "gemma4:e4b";

    builder.Services.AddChatClient(new OpenAIClient(
        new ApiKeyCredential("ollama"), // API key is required but ignored by Ollama
        new OpenAIClientOptions { Endpoint = new Uri(endpoint) })
        .GetChatClient(modelId)
        .AsIChatClient());

    // ── Database ─────────────────────────────────────────────────────────────
    // Resolve the connection string lazily (at first DbContext creation) so that
    // integration-test factories can replace this registration before it is used.
    builder.Services.AddDbContext<RecipeDbContext>((serviceProvider, options) =>
    {
        var configuration = serviceProvider.GetRequiredService<IConfiguration>();
        var raw =
            Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING")
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "Database connection string not configured. " +
                "Set POSTGRES_CONNECTION_STRING env var or ConnectionStrings:DefaultConnection in appsettings.");

        // Npgsql requires ADO.NET keyword=value format; convert postgres:// URI if needed.
        var connectionString = raw.StartsWith("postgres://") || raw.StartsWith("postgresql://")
            ? NpgsqlConnectionStringFromUri(raw)
            : raw;

        options.UseNpgsql(connectionString);
    });

    // ── CORS ─────────────────────────────────────────────────────────────────
    var allowedOrigins =
        builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

    builder.Services.AddCors(options =>
        options.AddDefaultPolicy(policy =>
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()));

    // ── Build ─────────────────────────────────────────────────────────────────
    var app = builder.Build();

    // ── Ensure schema exists on startup ──────────────────────────────────────
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        Log.Information("Applying database migrations...");
        await db.Database.MigrateAsync();
        Log.Information("Database ready.");
    }

    // ── Middleware pipeline ───────────────────────────────────────────────────
    if (app.Environment.IsDevelopment())
    {
        app.MapOpenApi();
    }

    app.UseMiddleware<ErrorHandlingMiddleware>();
    app.UseSerilogRequestLogging(opts =>
    {
        opts.MessageTemplate =
            "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
    });

    app.UseCors();
    app.UseAuthorization();
    app.MapControllers();

    await app.RunAsync();
}
catch (Exception ex) when (ex is not OperationCanceledException && ex.GetType().Name != "StopTheHostException")
{
    Log.Fatal(ex, "Application terminated unexpectedly");
    return 1;
}
finally
{
    await Log.CloseAndFlushAsync();
}

return 0;

static string NpgsqlConnectionStringFromUri(string uri)
{
    var u = new Uri(uri);
    var userInfo = u.UserInfo.Split(':', 2);
    var user = Uri.UnescapeDataString(userInfo[0]);
    var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
    var db = u.AbsolutePath.TrimStart('/');
    var port = u.Port > 0 ? u.Port : 5432;
    return $"Host={u.Host};Port={port};Database={db};Username={user};Password={password}";
}

// Exposes the compiler-generated Program class to the test assembly.
public partial class Program { }
