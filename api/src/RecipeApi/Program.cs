using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Serilog;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Middleware;
using RecipeApi.Services;
using RecipeApi.Services.Ai;
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
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;

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
            options.ModelBinderProviders.Insert(0, new FamilyMemberIdModelBinderProvider());

            // Enforce HearthSecret authentication globally
            var policy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
            options.Filters.Add(new AuthorizeFilter(policy));
        })
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
            options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
            options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        });

    builder.Services.AddOpenApi();
    builder.Services.AddHttpClient("", client =>
    {
        client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        client.DefaultRequestHeaders.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8");
        client.DefaultRequestHeaders.Add("Accept-Language", "en-US,en;q=0.9");
    });

    // ── Application services ─────────────────────────────────────────────────

    builder.Services.AddSingleton<AisleMapper>();
    builder.Services.AddSingleton<SseConnectionManager>();
    builder.Services.AddScoped<IScheduleEventPublisher, SseEventPublisher>();
    builder.Services.AddSingleton<DataRootResolver>();
    builder.Services.AddSingleton<RecipesRootResolver>();
    builder.Services.AddSingleton<WorkflowRootResolver>();
    builder.Services.AddSingleton<IStorageProvider, LocalStorageProvider>();
    builder.Services.AddSingleton<IRecipeStore, LocalRecipeStore>();
    builder.Services.AddSingleton<IPromptRepository, EmbeddedPromptRepository>();
    builder.Services.AddScoped<RecipeRepository>();
    builder.Services.AddScoped<WorkflowRepository>();
    builder.Services.AddScoped<IWorkflowOrchestrator, WorkflowOrchestrator>();
    builder.Services.AddScoped<ManagementService>();
    builder.Services.AddScoped<RecipeImportBulkService>();
    builder.Services.AddScoped<RecipeService>();
    builder.Services.AddScoped<RecipePurgeService>();
    builder.Services.AddScoped<CaptureFailureService>();
    builder.Services.AddScoped<RecipeSearchService>();
    builder.Services.AddScoped<AgentSearchTranslationService>();
    builder.Services.AddSingleton<InventoryCaptureService>();
    builder.Services.AddScoped<RecipeImportService>();
    builder.Services.AddScoped<DiscoveryService>();
    builder.Services.AddScoped<ScheduleService>();
    builder.Services.AddScoped<GroceryRecomputeService>();
    builder.Services.AddScoped<IngredientCategoryService>();
    builder.Services.AddScoped<SettingsService>();
    builder.Services.AddScoped<GoToService>();
    builder.Services.AddSingleton<IClock, SystemClock>();
    builder.Services.AddSingleton<CronScheduleCalculator>();
    builder.Services.AddSingleton<DemoModeOptions>();

    builder.Services.AddSingleton<AiExceptionHandler>();
    builder.Services.AddScoped<FamilyService>();
    builder.Services.AddScoped<IValidationService, ValidationService>();
    builder.Services.AddScoped<ImageService>();
    builder.Services.AddScoped<SearchIndexWorkflow>();
    builder.Services.AddScoped<RecipeShareService>();
    builder.Services.AddScoped<RecipeShareImportService>();
    builder.Services.AddScoped<DreamingWorkflowSeeder>();
    builder.Services.AddScoped<DemoWorkflowSeeder>();
    builder.Services.AddSingleton<ISearchTelemetry, LoggingSearchTelemetry>();

    // ── Workflow Processors Registration ─────────────────────────────────────
    // Each IWorkflowProcessor handles a specific task type in YAML workflows.
    // Some are registered multiple times with different names to handle multiple tasks.
    if (new DemoModeOptions(builder.Configuration).Enabled)
    {
        foreach (var processorName in new[]
        {
            "ExtractRecipe",
            "GenerateDescription",
            "SynthesizeRecipe",
            "WebAcquisition",
            "CategorizeIngredients",
            "ClassifyDietaryProfile"
        })
        {
            builder.Services.AddScoped<IWorkflowProcessor>(sp => new DemoModeBypassProcessor(
                processorName,
                sp.GetRequiredService<DemoModeOptions>()));
        }
    }

    builder.Services.AddScoped<IWorkflowProcessor>(sp => new WebAcquisitionAgent(
        sp.GetRequiredService<IChatClient>(),
        sp.GetRequiredService<RecipeRepository>(),
        sp.GetRequiredService<IPromptRepository>(),
        sp.GetRequiredService<HttpClient>(),
        sp.GetRequiredService<ILogger<WebAcquisitionAgent>>()));

    builder.Services.AddScoped<IWorkflowProcessor>(sp => new RecipeAgent(
        sp.GetRequiredService<IChatClient>(),
        sp.GetRequiredService<RecipeRepository>(),
        sp.GetRequiredService<IPromptRepository>(),
        sp.GetRequiredService<IConfiguration>(),
        sp.GetRequiredService<ILogger<RecipeAgent>>(),
        sp.GetRequiredService<RecipeDbContext>(),
        "ExtractRecipe"));

    builder.Services.AddScoped<IWorkflowProcessor>(sp => new RecipeAgent(
        sp.GetRequiredService<IChatClient>(),
        sp.GetRequiredService<RecipeRepository>(),
        sp.GetRequiredService<IPromptRepository>(),
        sp.GetRequiredService<IConfiguration>(),
        sp.GetRequiredService<ILogger<RecipeAgent>>(),
        sp.GetRequiredService<RecipeDbContext>(),
        "GenerateDescription"));

    builder.Services.AddScoped<IWorkflowProcessor>(sp => new RecipeAgent(
        sp.GetRequiredService<IChatClient>(),
        sp.GetRequiredService<RecipeRepository>(),
        sp.GetRequiredService<IPromptRepository>(),
        sp.GetRequiredService<IConfiguration>(),
        sp.GetRequiredService<ILogger<RecipeAgent>>(),
        sp.GetRequiredService<RecipeDbContext>(),
        "SynthesizeRecipe"));

    builder.Services.AddScoped<IWorkflowProcessor, RecipeHeroAgent>();
    builder.Services.AddScoped<IWorkflowProcessor, SyncRecipeProcessor>();
    builder.Services.AddScoped<IWorkflowProcessor, CategorizeIngredientsProcessor>();
    builder.Services.AddScoped<IWorkflowProcessor, ClassifyDietaryProfileProcessor>();
    builder.Services.AddScoped<IWorkflowProcessor, RecipeReadyProcessor>();
    builder.Services.AddScoped<IWorkflowProcessor>(sp => sp.GetRequiredService<SearchIndexWorkflow>());
    builder.Services.AddScoped<IWorkflowProcessor, WorkflowProcessor>();
    builder.Services.AddScoped<IWorkflowProcessor>(sp => new ManagementProcessor(
       sp.GetRequiredService<ManagementService>(),
       sp.GetRequiredService<RecipeDbContext>(),
       "BackupDatabase"));
    builder.Services.AddScoped<IWorkflowProcessor>(sp => new ManagementProcessor(
       sp.GetRequiredService<ManagementService>(),
       sp.GetRequiredService<RecipeDbContext>(),
       "RestoreDatabase"));
    builder.Services.AddScoped<IWorkflowProcessor>(sp => new ManagementProcessor(
       sp.GetRequiredService<ManagementService>(),
       sp.GetRequiredService<RecipeDbContext>(),
       "DisasterRecovery"));
    builder.Services.AddScoped<IWorkflowProcessor>(sp => new ManagementProcessor(
       sp.GetRequiredService<ManagementService>(),
       sp.GetRequiredService<RecipeDbContext>(),
       "PruneWorkflows"));
    builder.Services.AddScoped<IWorkflowProcessor>(sp => new ManagementProcessor(
       sp.GetRequiredService<ManagementService>(),
       sp.GetRequiredService<RecipeDbContext>(),
       "ProcessMaintenanceCommands"));
    builder.Services.AddScoped<IWorkflowProcessor>(sp => new ManagementProcessor(
       sp.GetRequiredService<ManagementService>(),
       sp.GetRequiredService<RecipeDbContext>(),
       "GenerateDreamingReport"));
    builder.Services.AddScoped<IWorkflowProcessor>(sp => new ManagementProcessor(
       sp.GetRequiredService<ManagementService>(),
       sp.GetRequiredService<RecipeDbContext>(),
       "CaptureDemoState"));
    builder.Services.AddScoped<IWorkflowProcessor>(sp => new ManagementProcessor(
       sp.GetRequiredService<ManagementService>(),
       sp.GetRequiredService<RecipeDbContext>(),
       "RestoreDemoState"));

    builder.Services.AddHostedService<DreamingWorkflowSeederHostedService>();
    builder.Services.AddHostedService<DemoWorkflowSeederHostedService>();
    builder.Services.AddHostedService<WorkflowWorker>();
    builder.Services.Configure<WorkflowRetryOptions>(builder.Configuration.GetSection("WorkflowRetry"));

    // ── AI / Agent Framework ─────────────────────────────────────────────────
    // ── AI Configuration ─────────────────────────────────────────────────────
    var modelId = builder.Configuration["GEMINI_MODEL_ID"];
    if (string.IsNullOrWhiteSpace(modelId))
    {
        modelId = "gemini-3-flash-preview";
    }

    var endpoint = builder.Configuration["GEMINI_ENDPOINT"];
    if (string.IsNullOrWhiteSpace(endpoint))
    {
        endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/";
    }

    var apiKey = builder.Configuration["GEMINI_API_KEY"];
    if (string.IsNullOrWhiteSpace(apiKey))
    {
        apiKey = "none";
        Log.Warning("GEMINI_API_KEY is not set. AI features will fail.");
    }

    Log.Information("─── AI CONFIGURATION ───");
    Log.Information("Endpoint:       {Endpoint}", endpoint);
    Log.Information("Model ID:       {Model}", modelId);
    Log.Information("────────────────────────");

    builder.Services.AddChatClient(new OpenAIClient(
        new ApiKeyCredential(apiKey),
        new OpenAIClientOptions
        {
            Endpoint = new Uri(endpoint),
            NetworkTimeout = TimeSpan.FromMinutes(5),
            RetryPolicy = new ClientRetryPolicy(maxRetries: 3)
        })
        .GetChatClient(modelId)
        .AsIChatClient())
        .Use(inner => new DemoModeChatClient(inner, new DemoModeOptions(builder.Configuration)));

    builder.Services.AddScoped<IEmbeddingProvider, GeminiEmbeddingProvider>();

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
    // Support a single comma-separated string (CORS_ALLOWED_ORIGINS=http://a,http://b)
    var rawAllowedOrigins = builder.Configuration["Cors:AllowedOrigins"] ?? "";
    var allowedOrigins = rawAllowedOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    builder.Services.AddCors(options =>
        options.AddDefaultPolicy(policy =>
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod();

            if (allowedOrigins.Any() && !allowedOrigins.Contains("*"))
            {
                policy.AllowCredentials();
            }
        }));

    // ── Authentication ───────────────────────────────────────────────────────
    var hearthSecret = builder.Configuration["HEARTH_SECRET"];
    if (string.IsNullOrWhiteSpace(hearthSecret))
    {
        Log.Warning("HEARTH_SECRET is not set. API protection will be degraded or disabled.");
    }

    builder.Services.AddAuthentication(HearthAuthenticationOptions.DefaultScheme)
        .AddScheme<HearthAuthenticationOptions, HearthAuthenticationHandler>(
            HearthAuthenticationOptions.DefaultScheme,
            options =>
            {
                options.Secret = hearthSecret ?? "";
            });

    builder.Services.AddAuthorization();

    // ── Forwarded Headers ─────────────────────────────────────────────────────
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        // Trust all networks/proxies in containerized environment behind Traefik
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
    });

    // ── Build ─────────────────────────────────────────────────────────────────
    var app = builder.Build();

    Log.Information("DataRoot: {DataRoot}", app.Services.GetRequiredService<DataRootResolver>().Root.ToString());
    Log.Information("RecipesRoot: {RecipesRoot}", app.Services.GetRequiredService<RecipesRootResolver>().Root.ToString());
    Log.Information("WorkflowRoot: {WorkflowRoot}", app.Services.GetRequiredService<WorkflowRootResolver>().Root.ToString());

    // ── Initialize data directories ─────────────────────────────────────────
    var recipesResolver = app.Services.GetRequiredService<RecipesRootResolver>();
    var recipesDir = recipesResolver.Root;
    Directory.CreateDirectory(recipesDir);
    Log.Information("Ensured recipes directory exists at {RecipesDir}", recipesDir);

    var workflowResolver = app.Services.GetRequiredService<WorkflowRootResolver>();
    var workflowsDir = workflowResolver.Root;
    WorkflowSeeder.SeedCoreWorkflows(workflowsDir, Log.Logger);

    // ── Middleware pipeline ───────────────────────────────────────────────────
    app.UseForwardedHeaders();

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
    app.UseAuthentication();
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
