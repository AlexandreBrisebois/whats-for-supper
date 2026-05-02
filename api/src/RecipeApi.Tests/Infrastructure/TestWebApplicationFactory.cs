using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
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
    public Guid DefaultFamilyMemberId { get; private set; }

    private WebApplication? _app;
    private readonly string _dbName = $"TestDb_{Guid.NewGuid():N}";
    private readonly string _dataRoot = Path.Combine(Path.GetTempPath(), $"wfs-test-{Guid.NewGuid():N}");

    public static async Task<TestWebApplicationFactory> CreateAsync()
    {
        var factory = new TestWebApplicationFactory();
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
        // AddApplicationPart is required because WebApplication.CreateBuilder()
        // in the test assembly only scans RecipeApi.Tests.dll by default.
        builder.Services
            .AddControllers(options =>
            {
                options.Filters.Add<SuccessWrappingFilter>();
            })
            .AddApplicationPart(typeof(RecipeApi.Controllers.HealthController).Assembly)
            .AddJsonOptions(opts =>
            {
                opts.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
                opts.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
                opts.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
            });

        builder.Services.AddScoped<FamilyService>();
        builder.Services.AddScoped<IValidationService, ValidationService>();
        builder.Services.AddScoped<ImageService>();
        builder.Services.AddScoped<RecipeService>();
        builder.Services.AddScoped<RecipeImportService>();
        builder.Services.AddScoped<RecipeImportBulkService>();
        builder.Services.AddScoped<SettingsService>();
        builder.Services.AddScoped<ManagementService>();

        // Mock IWorkflowOrchestrator — returns a new WorkflowInstance per TriggerAsync call
        var mockOrchestrator = new Mock<IWorkflowOrchestrator>();
        mockOrchestrator
            .Setup(o => o.TriggerAsync(It.IsAny<string>(), It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync(() => new WorkflowInstance
            {
                Id = Guid.NewGuid(),
                WorkflowId = "recipe-import",
                Status = WorkflowStatus.Processing,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            });
        builder.Services.AddScoped<IWorkflowOrchestrator>(_ => mockOrchestrator.Object);

        builder.Services.AddSingleton<DataRootResolver>();
        builder.Services.AddSingleton<RecipesRootResolver>();
        builder.Services.AddSingleton<WorkflowRootResolver>();
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
        _app.MapControllers();

        await _app.StartAsync();
    }

    /// <summary>Returns an HttpClient connected to the test server.</summary>
    public HttpClient CreateClient() =>
        _app?.GetTestClient()
        ?? throw new InvalidOperationException("Factory not started — call CreateAsync() first.");

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
