using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Middleware;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;

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

    private WebApplication? _app;
    private readonly string _dbName = $"TestDb_{Guid.NewGuid():N}";
    private readonly string _dataRoot = Path.Combine(Path.GetTempPath(), $"wfs-test-{Guid.NewGuid():N}");
    private readonly bool _enableAuth;

    private TestWebApplicationFactory(bool enableAuth = false) => _enableAuth = enableAuth;

    /// <summary>Factory with auth disabled — for business-logic tests.</summary>
    public static async Task<TestWebApplicationFactory> CreateAsync()
    {
        var factory = new TestWebApplicationFactory(enableAuth: false);
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

        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Serilog:MinimumLevel:Default"]          = "Warning",
            ["Logging:LogLevel:Default"]              = "Warning",
            ["Logging:LogLevel:Microsoft.AspNetCore"] = "Warning",
            ["DataRoot"]                              = _dataRoot,
        });

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

        builder.Services.AddSingleton<AisleMapper>();
        builder.Services.AddSingleton<SseConnectionManager>();
        builder.Services.AddScoped<IScheduleEventPublisher, SseEventPublisher>();
        builder.Services.AddScoped<GroceryRecomputeService>();
        builder.Services.AddScoped<IngredientCategoryService>();
        builder.Services.AddScoped<ScheduleService>();
        builder.Services.AddScoped<DiscoveryService>();
        builder.Services.AddScoped<FamilyService>();
        builder.Services.AddScoped<IValidationService, ValidationService>();
        builder.Services.AddScoped<ImageService>();
        builder.Services.AddScoped<RecipeService>();
        builder.Services.AddScoped<RecipeSearchService>();
        builder.Services.AddScoped<RecipeImportService>();
        builder.Services.AddScoped<RecipeImportBulkService>();
        builder.Services.AddScoped<SettingsService>();
        builder.Services.AddScoped<ManagementService>();

        builder.Services.AddScoped<IWorkflowOrchestrator>(sp =>
        {
            var mock = new Mock<IWorkflowOrchestrator>();
            mock.Setup(o => o.TriggerAsync(It.IsAny<string>(), It.IsAny<Dictionary<string, string>>()))
                .ReturnsAsync((string workflowId, Dictionary<string, string> parameters) =>
                {
                    var instance = new WorkflowInstance
                    {
                        Id = Guid.NewGuid(),
                        WorkflowId = workflowId,
                        Status = WorkflowStatus.Processing,
                        Parameters = System.Text.Json.JsonSerializer.Serialize(parameters),
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };
                    var db = sp.GetRequiredService<RecipeDbContext>();
                    db.WorkflowInstances.Add(instance);
                    db.SaveChanges(); // Sync save is fine for mock
                    return instance;
                });
            return mock.Object;
        });

        builder.Services.AddSingleton<DataRootResolver>();
        builder.Services.AddSingleton<RecipesRootResolver>();
        builder.Services.AddSingleton<WorkflowRootResolver>();
        builder.Services.AddSingleton<IStorageProvider, LocalStorageProvider>();
        builder.Services.AddSingleton<IRecipeStore, InMemoryRecipeStore>();

        builder.Services.AddDbContext<RecipeDbContext>(opts =>
            opts.UseInMemoryDatabase(_dbName));

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
