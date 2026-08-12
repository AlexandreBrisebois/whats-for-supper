using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Configuration;

using Microsoft.Extensions.DependencyInjection;
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
    private readonly Dictionary<string, string?> _configurationOverrides = [];

    private ISearchTelemetry? _telemetry;
    private TestWebApplicationFactory(
        bool enableAuth = false,
        Dictionary<string, string?>? configurationOverrides = null,
        IChatClient? chatClient = null)
    {
        _enableAuth = enableAuth;
        _chatClient = chatClient;
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

    /// <summary>
    /// Factory with full HearthSecret auth enforcement enabled — for auth contract tests.
    /// Use <see cref="CreateAuthenticatedClient"/> to get a pre-credentialed client,
    /// or <see cref="CreateClient"/> for an unauthenticated one.
    /// </summary>
    public static async Task<TestWebApplicationFactory> CreateWithAuthAsync()
    {
        var factory = new TestWebApplicationFactory(enableAuth: true);
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
        
        builder.Services.AddSingleton<IPromptRepository, EmbeddedPromptRepository>();

        builder.Services.AddSingleton<AisleMapper>();
        builder.Services.AddSingleton<SseConnectionManager>();
        builder.Services.AddScoped<IScheduleEventPublisher, SseEventPublisher>();
        builder.Services.AddScoped<IHealthEventPublisher, DbHealthEventPublisher>();
        builder.Services.AddScoped<HealthComputationService>();
        builder.Services.AddScoped<GroceryRecomputeService>();
        builder.Services.AddScoped<IngredientCategoryService>();
        builder.Services.AddScoped<ScheduleService>();
        builder.Services.AddScoped<DiscoveryService>();
        builder.Services.AddScoped<FamilyService>();
        builder.Services.AddScoped<IValidationService, ValidationService>();
        builder.Services.AddScoped<ImageService>();
        builder.Services.AddScoped<RecipeService>();
        builder.Services.AddScoped<RecipePurgeService>();
        builder.Services.AddScoped<CaptureFailureService>();
        builder.Services.AddScoped<RecipeSearchService>();
        builder.Services.AddScoped<AgentSearchTranslationService>();
        builder.Services.AddSingleton<InventoryCaptureService>();
        
        var mockEmbedding = new Mock<IEmbeddingProvider>();
        mockEmbedding.Setup(e => e.GenerateAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new float[1536]);
        builder.Services.AddSingleton<IEmbeddingProvider>(mockEmbedding.Object);

        // Stub IChatClient so AgentSearchTranslationService and InventoryCaptureService can be resolved in tests.
        // The default stub inspects the prompt and returns shape-correct payloads for each test path.
        builder.Services.AddSingleton<IChatClient>(_chatClient ?? new StubChatClient(null));
        builder.Services.AddScoped<RecipeImportService>();
        builder.Services.AddScoped<RecipeImportReportService>();
        builder.Services.AddScoped<RecipeImportBulkService>();
        builder.Services.AddScoped<SettingsService>();
        builder.Services.AddSingleton<IClock, SystemClock>();
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
                        TaskName = "mock",
                        ProcessorName = "Mock",
                        Status = RecipeApi.Models.TaskStatus.Pending,
                        ScheduledAt = scheduledAt,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    });
                    db.SaveChanges();
                }

                return instance;
            });
        WorkflowOrchestratorMock = orchestratorMock;
        builder.Services.AddSingleton<IWorkflowOrchestrator>(orchestratorMock.Object);

        builder.Services.AddSingleton<DataRootResolver>();
        builder.Services.AddSingleton<RecipesRootResolver>();
        builder.Services.AddSingleton<WorkflowRootResolver>();
        builder.Services.AddSingleton<IStorageProvider, LocalStorageProvider>();
        builder.Services.AddSingleton<IRecipeStore, InMemoryRecipeStore>();

        builder.Services.AddDbContext<RecipeDbContext>(opts =>
            opts.UseInMemoryDatabase(_dbName)
                .ConfigureWarnings(warnings => warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning)));

        // ── Test server ──────────────────────────────────────────────────────
        builder.WebHost.UseTestServer();

        _app = builder.Build();

        // ── Schema ───────────────────────────────────────────────────────────
        using (var scope = _app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            await db.Database.EnsureCreatedAsync();

            // Seed a default family member for tests that need a valid identity
            var member = new RecipeApi.Models.FamilyMember
            {
                Name = "CI Test User"
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
        _app.MapControllers();

        await _app.StartAsync();
    }

    /// <summary>Returns an unauthenticated HttpClient connected to the test server.</summary>
    public HttpClient CreateClient() =>
        _app?.GetTestClient()
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
