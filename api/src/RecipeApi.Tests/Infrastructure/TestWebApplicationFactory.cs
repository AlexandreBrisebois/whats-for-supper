using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Middleware;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
using RecipeApi.Tests.Infrastructure;

namespace RecipeApi.Tests.Infrastructure;

/// <summary>
/// Builds a real <see cref="WebApplication"/> backed by <see cref="TestServer"/>,
/// wiring up the same services and middleware as Program.cs but using an
/// in-memory EF Core database and in-memory storage implementations.
///
/// Use <see cref="CreateAsync"/> to start the server, then <see cref="CreateClient"/>
/// to get an HttpClient wired to it.  Implements <see cref="IAsyncDisposable"/> —
/// wrap in <c>await using</c> or use xUnit's <see cref="IAsyncLifetime"/> interface.
/// </summary>
public sealed class TestWebApplicationFactory : IAsyncDisposable
{
    /// <summary>Fixed secret used by <see cref="CreateWithAuthAsync"/> and auth-aware test clients.</summary>
    public const string TestSecret = "test-hearth-secret";

    public Guid DefaultFamilyMemberId { get; private set; }
    public Mock<IWorkflowOrchestrator> WorkflowOrchestratorMock { get; private set; } = null!;

    private WebApplication? _app;
    private readonly string _dbName = $"TestDb_{Guid.NewGuid():N}";
    private readonly string _dataRoot = Path.Combine(Path.GetTempPath(), $"wfs-test-{Guid.NewGuid():N}");
    private readonly bool _enableAuth;
    private readonly IChatClient? _chatClient;
    private readonly IClock? _clock;
    private readonly Action<WebApplication>? _configureApplication;
    private readonly Dictionary<string, string?> _configurationOverrides = [];

    private ISearchTelemetry? _telemetry;
    private TestWebApplicationFactory(
        bool enableAuth = false,
        Dictionary<string, string?>? configurationOverrides = null,
        IChatClient? chatClient = null,
        IClock? clock = null,
        Action<WebApplication>? configureApplication = null)
    {
        _enableAuth = enableAuth;
        _chatClient = chatClient;
        _clock = clock;
        _configureApplication = configureApplication;
        if (configurationOverrides is not null)
        {
            _configurationOverrides = configurationOverrides;
        }
    }

    /// <summary>Factory with auth disabled — for business-logic tests.</summary>
    public static async Task<TestWebApplicationFactory> CreateAsync(ISearchTelemetry? telemetry = null)
    {
        var factory = new TestWebApplicationFactory(enableAuth: false) { _telemetry = telemetry };
        await factory.StartAsync();
        return factory;
    }

    public static async Task<TestWebApplicationFactory> CreateAsync(Dictionary<string, string?> configurationOverrides)
    {
        var factory = new TestWebApplicationFactory(enableAuth: false, configurationOverrides);
        await factory.StartAsync();
        return factory;
    }

    public static async Task<TestWebApplicationFactory> CreateAsync(IChatClient chatClient)
    {
        var factory = new TestWebApplicationFactory(enableAuth: false, chatClient: chatClient);
        await factory.StartAsync();
        return factory;
    }

    /// <summary>Factory with a deterministic application clock for calendar-sensitive integration tests.</summary>
    public static async Task<TestWebApplicationFactory> CreateAsync(IClock clock)
    {
        var factory = new TestWebApplicationFactory(enableAuth: false, clock: clock);
        await factory.StartAsync();
        return factory;
    }

    /// <summary>
    /// Factory with full HearthSecret auth enforcement enabled — for auth contract tests.
    /// Use <see cref="CreateAuthenticatedClient"/> to get a pre-credentialed client,
    /// or <see cref="CreateClient"/> for an unauthenticated one.
    /// </summary>
    public static async Task<TestWebApplicationFactory> CreateWithAuthAsync(
        IClock? clock = null,
        Dictionary<string, string?>? configurationOverrides = null,
        Action<WebApplication>? configureApplication = null)
    {
        var factory = new TestWebApplicationFactory(enableAuth: true, configurationOverrides, clock: clock, configureApplication: configureApplication);
        await factory.StartAsync();
        return factory;
    }

    private async Task StartAsync()
    {
        var builder = WebApplication.CreateBuilder();

        // ── Override config ──────────────────────────────────────────────────
        Directory.CreateDirectory(_dataRoot);

        var configuration = new Dictionary<string, string?>
        {
            ["Serilog:MinimumLevel:Default"]          = "Warning",
            ["Logging:LogLevel:Default"]              = "Warning",
            ["Logging:LogLevel:Microsoft.AspNetCore"] = "Warning",
            ["DataRoot"]                              = _dataRoot,
        };
        foreach (var (key, value) in _configurationOverrides)
        {
            configuration[key] = value;
        }

        builder.Configuration.AddInMemoryCollection(configuration);

        // ── Services (mirrors Program.cs, minus Npgsql) ──────────────────────
        // Auth is omitted by default so business-logic tests are not coupled to
        // credential plumbing. Pass enableAuth: true (via CreateWithAuthAsync) to
        // get the full HearthSecret stack for auth contract tests.
        // AddApplicationPart is required because WebApplication.CreateBuilder()
        // in the test assembly only scans RecipeApi.Tests.dll by default.
        if (_enableAuth)
        {
            builder.Services
                .AddAuthentication(HearthAuthenticationOptions.DefaultScheme)
                .AddScheme<HearthAuthenticationOptions, HearthAuthenticationHandler>(
                    HearthAuthenticationOptions.DefaultScheme,
                    opts => opts.Secret = TestSecret);
            builder.Services.AddAuthorization();
        }

        builder.Services
            .AddControllers(options =>
            {
                options.Filters.Add<SuccessWrappingFilter>();
                if (_enableAuth)
                {
                    var policy = new AuthorizationPolicyBuilder()
                        .RequireAuthenticatedUser()
                        .Build();
                    options.Filters.Add(new AuthorizeFilter(policy));
                }
            })
            .AddApplicationPart(typeof(RecipeApi.Controllers.HealthController).Assembly)
            .AddJsonOptions(opts =>
            {
                opts.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
                opts.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
                opts.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
            });

        PdfCaptureOpenApi.AddServices(builder.Services);
        builder.Services.AddSingleton<IPromptRepository, EmbeddedPromptRepository>();

        builder.Services.AddSingleton<AisleMapper>();
        builder.Services.AddSingleton<SseConnectionManager>();
        builder.Services.AddScoped<IScheduleEventPublisher, SseEventPublisher>();
        builder.Services.AddSingleton<GroceryCheckCoordinator>();
        builder.Services.AddScoped<GroceryRecomputeService>();
        builder.Services.AddScoped<GroceryExtraService>();
        builder.Services.AddScoped<GroceryExtraRolloverService>();
        builder.Services.AddScoped<IngredientCategoryService>();
        builder.Services.AddScoped<ScheduleService>();
        builder.Services.AddSingleton<VotingSession>();
        builder.Services.AddScoped<DiscoveryService>();
        builder.Services.AddSingleton<HistoricalInterestOptions>();
        builder.Services.AddScoped<HistoricalInterestService>();
        builder.Services.AddScoped<FamilyService>();
        builder.Services.AddScoped<GoToService>();
        builder.Services.AddScoped<IValidationService, ValidationService>();
        builder.Services.AddScoped<ImageService>();
        builder.Services.AddScoped<RecipeService>();
        builder.Services.AddScoped<PdfCaptureService>();
        builder.Services.AddSingleton<FeatureFlagRegistry>();
        builder.Services.AddScoped<FeatureFlagService>();
        builder.Services.AddScoped<RecipePurgeService>();
        builder.Services.AddScoped<CaptureFailureService>();
        builder.Services.AddScoped<RecipeSearchService>();
        if (_configurationOverrides.GetValueOrDefault("Tests:PostgresConnectionString") is not null)
        {
            builder.Services.AddScoped<RecipeLexicalSearchRepository>();
            builder.Services.AddScoped<RecipeSemanticSearchRepository>();
        }
        builder.Services.AddSingleton(sp => new RecipeSearchFilterOptions(
            builder.Configuration,
            sp.GetRequiredService<ILogger<RecipeSearchFilterOptions>>()));
        builder.Services.AddSingleton<RecipeSearchContinuationStore>();

        var mockEmbedding = new Mock<IEmbeddingProvider>();
        mockEmbedding.Setup(e => e.GenerateAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new float[1536]);
        builder.Services.AddSingleton<IEmbeddingProvider>(mockEmbedding.Object);

        // The default stub inspects prompts and returns shape-correct payloads for each test path.
        builder.Services.AddSingleton<IChatClient>(_chatClient ?? new StubChatClient(null));
        builder.Services.AddScoped<RecipeImportService>();
        builder.Services.AddScoped<RecipeImportReportService>();
        builder.Services.AddScoped<RecipeImportBulkService>();
        builder.Services.AddScoped<SettingsService>();
        builder.Services.AddSingleton<IClock>(_clock ?? new SystemClock());
        builder.Services.AddSingleton<DeploymentCalendar>();
        builder.Services.AddSingleton<CronScheduleCalculator>();
        builder.Services.AddSingleton<DemoModeOptions>();
        builder.Services.AddScoped<ManagementService>();
        builder.Services.AddScoped<SearchIndexWorkflow>();
        if (_telemetry is not null)
            builder.Services.AddSingleton<ISearchTelemetry>(_telemetry);
        else
            builder.Services.AddSingleton<ISearchTelemetry, LoggingSearchTelemetry>();

        var orchestratorMock = new Mock<IWorkflowOrchestrator>();
        orchestratorMock.Setup(o => o.TriggerAsync(
                It.IsAny<string>(),
                It.IsAny<Dictionary<string, string>>(),
                It.IsAny<DateTimeOffset?>()))
            .ReturnsAsync((string workflowId, Dictionary<string, string> parameters, DateTimeOffset? scheduledAt) =>
            {
                var instance = new WorkflowInstance
                {
                    Id = Guid.NewGuid(),
                    WorkflowId = workflowId,
                    Status = WorkflowStatus.Processing,
                    Parameters = JsonSerializer.Serialize(parameters),
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };

                // Use a scope to access the DB from the singleton orchestrator mock
                using (var scope = _app!.Services.CreateScope())
                {
                    var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                    db.WorkflowInstances.Add(instance);
                    db.WorkflowTasks.Add(new WorkflowTask
                    {
                        TaskId = Guid.NewGuid(),
                        InstanceId = instance.Id,
                        TaskName = _configurationOverrides.GetValueOrDefault("Tests:PdfWorkflow") == "true" && workflowId == "recipe-import" ? "convert_pdf" : "mock",
                        ProcessorName = _configurationOverrides.GetValueOrDefault("Tests:PdfWorkflow") == "true" && workflowId == "recipe-import" ? "ConvertPdf" : "Mock",
                        Payload = JsonSerializer.Serialize(parameters),
                        Status = RecipeApi.Models.TaskStatus.Pending,
                        ScheduledAt = scheduledAt,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    });
                    db.SaveChanges();
                }

                return instance;
            });
        orchestratorMock.Setup(o => o.InitializeUrlCaptureAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Guid id, CancellationToken ct) =>
            {
                using var scope = _app!.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var instance = db.WorkflowInstances.Include(w => w.Tasks).Single(w => w.Id == id);
                if (instance.Status != WorkflowStatus.Paused) return instance;
                db.WorkflowTasks.RemoveRange(instance.Tasks);
                instance.Tasks.Clear();
                instance.Tasks.Add(new WorkflowTask
                {
                    TaskId = Guid.NewGuid(), InstanceId = id, TaskName = "mock", ProcessorName = "Mock",
                    Payload = instance.Parameters, Status = RecipeApi.Models.TaskStatus.Pending,
                    CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
                });
                db.WorkflowTasks.AddRange(instance.Tasks);
                instance.Status = WorkflowStatus.Processing;
                db.SaveChanges();
                return instance;
            });
        WorkflowOrchestratorMock = orchestratorMock;
        builder.Services.AddSingleton<IWorkflowOrchestrator>(orchestratorMock.Object);
        if (_configurationOverrides.GetValueOrDefault("Tests:RealWorkflowOrchestrator") == "true")
        {
            builder.Services.AddScoped<WorkflowRepository>();
            builder.Services.AddScoped<IWorkflowOrchestrator, WorkflowOrchestrator>();
        }

        builder.Services.AddSingleton<DataRootResolver>();
        builder.Services.AddSingleton<RecipesRootResolver>();
        builder.Services.AddScoped<RecoverySnapshotService>();
        builder.Services.AddScoped<RecoveryBoundary>();
        builder.Services.AddSingleton<WorkflowRootResolver>();
        builder.Services.AddSingleton<IStorageProvider, LocalStorageProvider>();
        if (_configurationOverrides.GetValueOrDefault("Tests:LocalRecipeStore") == "true")
            builder.Services.AddSingleton<IRecipeStore, LocalRecipeStore>();
        else
            builder.Services.AddSingleton<IRecipeStore, InMemoryRecipeStore>();

        builder.Services.AddDbContext<RecipeDbContext>(opts =>
        {
            var postgres = _configurationOverrides.GetValueOrDefault("Tests:PostgresConnectionString");
            if (postgres is not null) opts.UseNpgsql(postgres);
            else opts.UseInMemoryDatabase(_dbName)
                .ConfigureWarnings(warnings => warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning));
        });

        // ── Test server ──────────────────────────────────────────────────────
        if (_configurationOverrides.GetValueOrDefault("Tests:HttpUrl") is { } httpUrl)
        {
            builder.WebHost.UseKestrel().UseUrls(httpUrl);
        }
        else builder.WebHost.UseTestServer();

        _app = builder.Build();
        _ = _app.Services.GetRequiredService<DeploymentCalendar>();

        // ── Schema ───────────────────────────────────────────────────────────
        using (var scope = _app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            await db.Database.EnsureCreatedAsync();

            // Seed with the same supplied clock as application creation owners.
            var seededAt = scope.ServiceProvider.GetRequiredService<IClock>().UtcNow;
            var member = new RecipeApi.Models.FamilyMember
            {
                Name = "CI Test User",
                CreatedAt = seededAt,
                UpdatedAt = seededAt
            };
            db.FamilyMembers.Add(member);
            await db.SaveChangesAsync();
            DefaultFamilyMemberId = member.Id;
        }

        // ── Middleware & routing (mirrors Program.cs) ─────────────────────────
        _app.UseMiddleware<ErrorHandlingMiddleware>();
        if (_enableAuth)
        {
            _app.UseAuthentication();
            _app.UseAuthorization();
        }
        _app.UseMiddleware<RecoveryBoundaryMiddleware>();
        _app.MapControllers();
        _configureApplication?.Invoke(_app);
        _app.MapOpenApi();

        await _app.StartAsync();
    }

    public string HttpAddress => _app!.Services.GetRequiredService<IServer>()
        .Features.Get<IServerAddressesFeature>()!.Addresses.Single();

    /// <summary>Returns an unauthenticated HttpClient connected to the test server.</summary>
    public HttpClient CreateClient() =>
        _configurationOverrides.GetValueOrDefault("Tests:HttpUrl") is not null
        ? new HttpClient { BaseAddress = new Uri(HttpAddress) }
        : _app?.GetTestClient()
        ?? throw new InvalidOperationException("Factory not started — call CreateAsync() first.");

    /// <summary>
    /// Returns an HttpClient pre-credentialed with <see cref="TestSecret"/> via
    /// <c>X-Hearth-Secret</c>. Only meaningful when the factory was created via
    /// <see cref="CreateWithAuthAsync"/>.
    /// </summary>
    public HttpClient CreateAuthenticatedClient()
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add("X-Hearth-Secret", TestSecret);
        return client;
    }

    /// <summary>Convenience accessor for the service provider.</summary>
    public IServiceProvider Services =>
        _app?.Services
        ?? throw new InvalidOperationException("Factory not started — call CreateAsync() first.");

    public async ValueTask DisposeAsync()
    {
        if (_app is not null)
            await _app.DisposeAsync();

        if (Directory.Exists(_dataRoot))
            Directory.Delete(_dataRoot, recursive: true);
    }
}
