using Microsoft.EntityFrameworkCore;
using Serilog;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Middleware;
using RecipeApi.Services;
using RecipeApi.Services.Agents;
using RecipeApi.Services.Processors;
using RecipeApi.Workflow;
using OpenAI;
using Microsoft.Extensions.AI;
using System.ClientModel;
using System.ClientModel.Primitives;
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
    builder.Services.AddControllers(options =>
        {
            options.Filters.Add<SuccessWrappingFilter>();
        })
        .AddNewtonsoftJson(options =>
        {
            options.SerializerSettings.ReferenceLoopHandling =
                Newtonsoft.Json.ReferenceLoopHandling.Ignore;
            options.SerializerSettings.ContractResolver =
                new Newtonsoft.Json.Serialization.CamelCasePropertyNamesContractResolver();
        });

    builder.Services.AddOpenApi();

    // ── Application services ─────────────────────────────────────────────────
    builder.Services.AddSingleton<DataRootResolver>();
    builder.Services.AddSingleton<RecipesRootResolver>();
    builder.Services.AddSingleton<WorkflowRootResolver>();
    builder.Services.AddScoped<IWorkflowOrchestrator, WorkflowOrchestrator>();
    builder.Services.AddScoped<RecipeImportBulkService>();

    builder.Services.AddScoped<FamilyService>();
    builder.Services.AddScoped<IValidationService, ValidationService>();
    builder.Services.AddScoped<ImageService>();
    builder.Services.AddScoped<ManagementService>();
    builder.Services.AddSingleton<ManagementTaskStore>();
    builder.Services.AddHostedService<ManagementWorker>();
    builder.Services.AddScoped<RecipeHeroAgent>();
    builder.Services.AddScoped<RecipeAgent>();
    builder.Services.AddScoped<SyncRecipeProcessor>();

    builder.Services.AddScoped<IWorkflowProcessor>(sp => new RecipeAgent(
        sp.GetRequiredService<IChatClient>(),
        sp.GetRequiredService<RecipesRootResolver>(),
        sp.GetRequiredService<IConfiguration>(),
        sp.GetRequiredService<ILogger<RecipeAgent>>(),
        "ExtractRecipe"));

    builder.Services.AddScoped<IWorkflowProcessor>(sp => new RecipeAgent(
        sp.GetRequiredService<IChatClient>(),
        sp.GetRequiredService<RecipesRootResolver>(),
        sp.GetRequiredService<IConfiguration>(),
        sp.GetRequiredService<ILogger<RecipeAgent>>(),
        "GenerateDescription"));

    builder.Services.AddScoped<IWorkflowProcessor, RecipeHeroAgent>();
    builder.Services.AddScoped<IWorkflowProcessor, SyncRecipeProcessor>();
    builder.Services.AddScoped<RecipeService>();
    // builder.Services.AddScoped<RecipeImportService>();

    builder.Services.AddScoped<DiscoveryService>();
    builder.Services.AddScoped<ScheduleService>();
    // builder.Services.AddHostedService<RecipeImportWorker>();

    builder.Services.AddHostedService<WorkflowWorker>();


    // ── AI / Agent Framework ─────────────────────────────────────────────────
    var agentSettings = builder.Configuration.GetSection("AgentSettings");
    var endpoint = agentSettings["Endpoint"] ?? "http://localhost:11434/v1";
    var modelId = agentSettings["ModelId"] ?? "gemma4:e4b";
    Log.Information("AI Agent configured at {Endpoint} with model {ModelId}", endpoint, modelId);

    builder.Services.AddChatClient(new OpenAIClient(
        new ApiKeyCredential("ollama"), // API key is required but ignored by Ollama
        new OpenAIClientOptions
        {
            Endpoint = new Uri(endpoint),
            NetworkTimeout = TimeSpan.FromMinutes(5),
            RetryPolicy = new ClientRetryPolicy(maxRetries: 0)
        })
        .GetChatClient(modelId)
        .AsIChatClient());

    // ── Database ─────────────────────────────────────────────────────────────
    // Resolve the connection string lazily (at first DbContext creation) so that
    // integration-test factories can replace this registration before it is used.
    builder.Services.AddDbContext<RecipeDbContext>((serviceProvider, options) =>
    {
        var configuration = serviceProvider.GetRequiredService<IConfiguration>();
        var postgresEnv = Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING");
        var defaultConn = configuration.GetConnectionString("DefaultConnection");

        var raw = !string.IsNullOrWhiteSpace(postgresEnv) ? postgresEnv
                : !string.IsNullOrWhiteSpace(defaultConn) ? defaultConn
                : null;

        if (raw == null)
        {
            throw new InvalidOperationException(
                "Database connection string not configured. " +
                "Please set the 'POSTGRES_CONNECTION_STRING' environment variable " +
                "or define 'ConnectionStrings:DefaultConnection' in appsettings.json.");
        }

        var masked = ConnectionStringHelper.MaskPassword(raw);
        Log.Information("Using database connection: {ConnectionString}", masked);

        // Npgsql requires ADO.NET keyword=value format; convert postgres:// URI if needed.
        var connectionString = ConnectionStringHelper.NormalizeForNpgsql(raw);
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

    // ── Initialize data directories ─────────────────────────────────────────
    var recipesResolver = app.Services.GetRequiredService<RecipesRootResolver>();
    var recipesDir = recipesResolver.Root;
    Directory.CreateDirectory(recipesDir);
    Log.Information("Ensured recipes directory exists at {RecipesDir}", recipesDir);

    var workflowResolver = app.Services.GetRequiredService<WorkflowRootResolver>();
    var workflowsDir = workflowResolver.Root;
    Directory.CreateDirectory(workflowsDir);
    Log.Information("Ensured workflows directory exists at {WorkflowsDir}", workflowsDir);

    var recipeImportPath = Path.Combine(workflowsDir, "recipe-import.yaml");
    if (!File.Exists(recipeImportPath))
    {
        var recipeImportContent = """
id: recipe-import
parameters:
  - recipeId
tasks:
  - id: extract_recipe
    processor: ExtractRecipe
    payload:
      recipeId: "{{ recipeId }}"
  - id: generate_hero
    processor: GenerateHero
    depends_on:
      - extract_recipe
    payload:
      recipeId: "{{ recipeId }}"
  - id: sync_recipe
    processor: SyncRecipe
    depends_on:
      - generate_hero
    payload:
      recipeId: "{{ recipeId }}"
""";
        await File.WriteAllTextAsync(recipeImportPath, recipeImportContent);
        Log.Information("Created workflow file at {WorkflowPath}", recipeImportPath);
    }

    var recipeDescriptionRegenPath = Path.Combine(workflowsDir, "recipe-description-regeneration.yaml");
    if (!File.Exists(recipeDescriptionRegenPath))
    {
        var content = """
id: recipe-description-regeneration
parameters:
  - recipeId
tasks:
  - id: generate_description
    processor: GenerateDescription
    payload:
      recipeId: "{{ recipeId }}"
  - id: sync_recipe
    processor: SyncRecipe
    depends_on:
      - generate_description
    payload:
      recipeId: "{{ recipeId }}"
""";
        await File.WriteAllTextAsync(recipeDescriptionRegenPath, content);
        Log.Information("Created workflow file at {WorkflowPath}", recipeDescriptionRegenPath);
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

// Exposes the compiler-generated Program class to the test assembly.
public partial class Program { }
