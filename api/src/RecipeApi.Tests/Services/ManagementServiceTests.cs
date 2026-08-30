using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;
using TaskStatus = RecipeApi.Models.TaskStatus;

namespace RecipeApi.Tests.Services;

/// <summary>
/// Unit tests for <see cref="ManagementService"/> backup/restore behaviour.
/// </summary>
public class ManagementServiceTests : IAsyncLifetime
{
    private TestWebApplicationFactory _factory = null!;
    private IServiceScope _scope = null!;
    private RecipeDbContext _db = null!;
    private ManagementService _service = null!;
    private IRecipeStore _recipeStore = null!;

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        _service = _scope.ServiceProvider.GetRequiredService<ManagementService>();
        _recipeStore = _scope.ServiceProvider.GetRequiredService<IRecipeStore>();
    }

    public async Task DisposeAsync()
    {
        _scope.Dispose();
        await _factory.DisposeAsync();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string DataRoot => _scope.ServiceProvider
        .GetRequiredService<DataRootResolver>().Root;

    private string CsvPath => Path.Combine(DataRoot, "ingredient-categories.csv");
    private string ImportReportsPath => Path.Combine(DataRoot, "recipe-import-reports.json");
    private string ReportsRoot => Path.Combine(DataRoot, "reports");
    private string DemoRoot => Path.Combine(DataRoot, "demo");

    // ── Backup step 5 ─────────────────────────────────────────────────────────

    [Fact]
    public async Task BackupAsync_WithNoIngredientCategories_WritesCsvWithHeaderOnly()
    {
        // Act
        await _service.BackupAsync();

        // Assert
        Assert.True(File.Exists(CsvPath), "ingredient-categories.csv should be created even when empty");
        var lines = await File.ReadAllLinesAsync(CsvPath);
        Assert.Single(lines);
        Assert.Equal("normalized_key,grocery_section,confidence,source,created_at", lines[0]);
    }

    [Fact]
    public async Task BackupRestoreRoundTrip_PreservesDuplicateOnlyAndMixedRecipeImportReports()
    {
        var recipeId = Guid.NewGuid();
        var duplicateRecipeId = Guid.NewGuid();
        var memberId = _factory.DefaultFamilyMemberId;
        var createdAt = DateTimeOffset.UtcNow.AddDays(-2);
        var updatedAt = DateTimeOffset.UtcNow.AddDays(-1);
        var reimportedAt = DateTimeOffset.UtcNow.AddHours(-2);

        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Reported Soup",
            AddedBy = memberId,
            ImageCount = 1,
            IsReady = true,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt
        });
        _db.Recipes.Add(new Recipe
        {
            Id = duplicateRecipeId,
            Name = "Duplicate Soup",
            AddedBy = memberId,
            IsReady = true,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt
        });
        _db.RecipeImportReports.Add(new RecipeImportReport
        {
            RecipeId = recipeId,
            Reasons = ["ingredients", "duplicate"],
            Note = "The quantities and method need review.",
            Status = RecipeImportReportStatus.ReadyToReview,
            ReportedBy = memberId,
            UpdatedBy = memberId,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt,
            LastWorkflowInstanceId = Guid.NewGuid(),
            LastAttemptAt = updatedAt.AddMinutes(-10),
            ReimportedAt = reimportedAt
        });
        _db.RecipeImportReports.Add(new RecipeImportReport
        {
            RecipeId = duplicateRecipeId,
            Reasons = ["duplicate"],
            Note = "Same recipe as Reported Soup.",
            Status = RecipeImportReportStatus.Reported,
            ReportedBy = memberId,
            UpdatedBy = memberId,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt
        });
        await _db.SaveChangesAsync();

        await _service.BackupAsync();

        _db.RecipeImportReports.RemoveRange(_db.RecipeImportReports);
        await _db.SaveChangesAsync();
        await _service.RestoreAsync();

        var restored = await _db.RecipeImportReports.SingleAsync(report => report.RecipeId == recipeId);
        Assert.Equal(recipeId, restored.RecipeId);
        Assert.Equal(["ingredients", "duplicate"], restored.Reasons);
        Assert.Equal("The quantities and method need review.", restored.Note);
        Assert.Equal(RecipeImportReportStatus.ReadyToReview, restored.Status);
        Assert.Equal(memberId, restored.ReportedBy);
        Assert.Equal(memberId, restored.UpdatedBy);
        Assert.Equal(createdAt, restored.CreatedAt);
        Assert.Equal(updatedAt, restored.UpdatedAt);
        Assert.Equal(reimportedAt, restored.ReimportedAt);

        var duplicateOnly = await _db.RecipeImportReports.SingleAsync(report => report.RecipeId == duplicateRecipeId);
        Assert.Equal(["duplicate"], duplicateOnly.Reasons);
        Assert.Equal("Same recipe as Reported Soup.", duplicateOnly.Note);
        Assert.Equal(RecipeImportReportStatus.Reported, duplicateOnly.Status);
    }

    [Fact]
    public async Task BackupAsync_AfterReportsAreResolved_OverwritesArtifactWithEmptyArray()
    {
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Resolved Soup",
            AddedBy = _factory.DefaultFamilyMemberId,
            ImageCount = 1,
            IsReady = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        _db.RecipeImportReports.Add(new RecipeImportReport
        {
            RecipeId = recipeId,
            Reasons = ["ingredients"],
            Status = RecipeImportReportStatus.Reported
        });
        await _db.SaveChangesAsync();
        await _service.BackupAsync();

        _db.RecipeImportReports.RemoveRange(_db.RecipeImportReports);
        await _db.SaveChangesAsync();
        await _service.BackupAsync();

        Assert.True(File.Exists(ImportReportsPath));
        using var document = JsonDocument.Parse(await File.ReadAllTextAsync(ImportReportsPath));
        Assert.Equal(JsonValueKind.Array, document.RootElement.ValueKind);
        Assert.Equal(0, document.RootElement.GetArrayLength());
    }

    [Fact]
    public async Task RestoreAsync_NormalizesInterruptedRecipeImportReportToReported()
    {
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Interrupted Soup",
            AddedBy = _factory.DefaultFamilyMemberId,
            ImageCount = 1,
            IsReady = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        _db.RecipeImportReports.Add(new RecipeImportReport
        {
            RecipeId = recipeId,
            Reasons = ["steps"],
            Status = RecipeImportReportStatus.Reimporting,
            LastWorkflowInstanceId = Guid.NewGuid(),
            LastAttemptAt = DateTimeOffset.UtcNow,
            ReimportedAt = DateTimeOffset.UtcNow.AddDays(-1),
            LastError = "Interrupted workflow"
        });
        await _db.SaveChangesAsync();

        await _service.BackupAsync();
        _db.RecipeImportReports.RemoveRange(_db.RecipeImportReports);
        await _db.SaveChangesAsync();
        await _service.RestoreAsync();

        var restored = await _db.RecipeImportReports.SingleAsync();
        Assert.Equal(RecipeImportReportStatus.Reported, restored.Status);
        Assert.Null(restored.LastWorkflowInstanceId);
        Assert.Null(restored.LastAttemptAt);
        Assert.Null(restored.ReimportedAt);
        Assert.Null(restored.LastError);
    }

    [Fact]
    public async Task CaptureDemoStateAsync_Writes_Core_Snapshot_And_Excludes_Dynamic_State()
    {
        var member = new FamilyMember { Name = "Demo Cook" };
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Snapshot Soup",
            AddedBy = member.Id,
            Description = "A stable demo recipe",
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _db.FamilyMembers.Add(member);
        _db.Recipes.Add(recipe);
        _db.RecipeSearchDocuments.Add(new RecipeSearchDocument
        {
            RecipeId = recipe.Id,
            DocumentText = "snapshot soup",
            SearchMetadata = "{}",
            EmbeddingJson = "[0.1,0.2]",
            EmbeddingModel = "test",
            IndexStatus = "ready",
            LastIndexedAt = DateTimeOffset.UtcNow
        });
        _db.RecipeVotes.Add(new RecipeVote
        {
            RecipeId = recipe.Id,
            FamilyMemberId = member.Id,
            Vote = VoteType.Like
        });
        _db.WeeklyPlans.Add(new WeeklyPlan { WeekStartDate = DateOnly.FromDateTime(DateTime.UtcNow) });
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipe.Id,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = CalendarEventStatus.Planned
        });
        await _db.SaveChangesAsync();

        await _service.CaptureDemoStateAsync(CancellationToken.None);

        Assert.True(File.Exists(Path.Combine(DemoRoot, "manifest.json")));
        Assert.True(File.Exists(Path.Combine(DemoRoot, "family-members.json")));
        Assert.True(File.Exists(Path.Combine(DemoRoot, "recipes.json")));
        Assert.True(File.Exists(Path.Combine(DemoRoot, "recipe-search-documents.json")));
        Assert.False(File.Exists(Path.Combine(DemoRoot, "recipe-votes.json")));
        Assert.False(File.Exists(Path.Combine(DemoRoot, "weekly-plans.json")));
        Assert.False(File.Exists(Path.Combine(DemoRoot, "calendar-events.json")));
    }

    [Fact]
    public async Task RestoreDemoStateAsync_Restores_Core_State_And_Clears_Dynamic_State()
    {
        var member = new FamilyMember { Name = "Demo Cook" };
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            Name = "Snapshot Soup",
            AddedBy = member.Id,
            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.FamilyMembers.Add(member);
        _db.Recipes.Add(recipe);
        _db.RecipeSearchDocuments.Add(new RecipeSearchDocument
        {
            RecipeId = recipe.Id,
            DocumentText = "snapshot soup",
            SearchMetadata = "{}",
            EmbeddingJson = "[0.1,0.2]",
            EmbeddingModel = "test",
            IndexStatus = "ready"
        });
        _db.RecipeImportReports.Add(new RecipeImportReport
        {
            RecipeId = recipe.Id,
            Reasons = ["ingredients"],
            Status = RecipeImportReportStatus.Reported
        });
        await _db.SaveChangesAsync();
        await _service.CaptureDemoStateAsync(CancellationToken.None);

        var intruder = new FamilyMember { Name = "Temporary Visitor" };
        _db.FamilyMembers.Add(intruder);
        recipe.Name = "Mutated Soup";
        _db.RecipeSearchDocuments.RemoveRange(_db.RecipeSearchDocuments);
        _db.RecipeVotes.Add(new RecipeVote
        {
            RecipeId = recipe.Id,
            FamilyMemberId = member.Id,
            Vote = VoteType.Dislike
        });
        _db.WeeklyPlans.Add(new WeeklyPlan { WeekStartDate = DateOnly.FromDateTime(DateTime.UtcNow) });
        _db.CalendarEvents.Add(new CalendarEvent
        {
            Id = Guid.NewGuid(),
            RecipeId = recipe.Id,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Status = CalendarEventStatus.Planned
        });
        await _db.SaveChangesAsync();

        await _service.RestoreDemoStateAsync(CancellationToken.None);

        Assert.Contains(_db.FamilyMembers, m => m.Id == member.Id && m.Name == "Demo Cook");
        Assert.DoesNotContain(_db.FamilyMembers, m => m.Id == intruder.Id);
        Assert.Contains(_db.Recipes, r => r.Id == recipe.Id && r.Name == "Snapshot Soup");
        Assert.Contains(_db.RecipeSearchDocuments, d => d.RecipeId == recipe.Id && d.IndexStatus == "ready");
        Assert.Empty(_db.RecipeVotes);
        Assert.Empty(_db.WeeklyPlans);
        Assert.Empty(_db.CalendarEvents);
        Assert.Empty(_db.RecipeImportReports);
    }

    [Fact]
    public async Task RestoreDemoStateAsync_When_Snapshot_Missing_Does_Not_Clear_Active_Data()
    {
        var member = new FamilyMember { Name = "Keep Me" };
        _db.FamilyMembers.Add(member);
        await _db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.RestoreDemoStateAsync(CancellationToken.None));

        Assert.Contains(_db.FamilyMembers, m => m.Id == member.Id);
    }

    [Fact]
    public async Task BackupAsync_WithIngredientCategories_ExportsAllRows()
    {
        // Arrange
        var createdAt = new DateTimeOffset(2026, 1, 15, 10, 0, 0, TimeSpan.Zero);
        _db.IngredientCategories.AddRange(
            new IngredientCategory
            {
                NormalizedKey = "chicken breast",
                GrocerySection = "Meat",
                Confidence = 0.99,
                Source = "llm",
                CreatedAt = createdAt,
                UpdatedAt = createdAt
            },
            new IngredientCategory
            {
                NormalizedKey = "tomato sauce",
                GrocerySection = "Pantry",
                Confidence = 0.95,
                Source = "llm",
                CreatedAt = createdAt,
                UpdatedAt = createdAt
            }
        );
        await _db.SaveChangesAsync();

        // Act
        await _service.BackupAsync();

        // Assert
        Assert.True(File.Exists(CsvPath));
        var lines = await File.ReadAllLinesAsync(CsvPath);
        // Header + 2 data rows
        Assert.Equal(3, lines.Length);
        Assert.Equal("normalized_key,grocery_section,confidence,source,created_at", lines[0]);

        // Verify both rows are present (order may vary)
        var dataLines = lines.Skip(1).ToArray();
        Assert.Contains(dataLines, l => l.StartsWith("chicken breast,Meat,0.99,llm,"));
        Assert.Contains(dataLines, l => l.StartsWith("tomato sauce,Pantry,0.95,llm,"));
    }

    [Fact]
    public async Task BackupAsync_CsvColumns_MatchExpectedFormat()
    {
        // Arrange
        var createdAt = new DateTimeOffset(2026, 1, 15, 10, 0, 0, TimeSpan.Zero);
        _db.IngredientCategories.Add(new IngredientCategory
        {
            NormalizedKey = "salmon fillet",
            GrocerySection = "Seafood",
            Confidence = 0.97,
            Source = "llm",
            CreatedAt = createdAt,
            UpdatedAt = createdAt
        });
        await _db.SaveChangesAsync();

        // Act
        await _service.BackupAsync();

        // Assert
        var lines = await File.ReadAllLinesAsync(CsvPath);
        Assert.Equal(2, lines.Length);
        // Columns: normalized_key,grocery_section,confidence,source,created_at
        var parts = lines[1].Split(',');
        Assert.Equal(5, parts.Length);
        Assert.Equal("salmon fillet", parts[0]);
        Assert.Equal("Seafood", parts[1]);
        Assert.Equal("0.97", parts[2]);
        Assert.Equal("llm", parts[3]);
        Assert.Equal("2026-01-15T10:00:00Z", parts[4]);
    }

    [Fact]
    public async Task BackupAsync_FieldWithComma_IsQuotedCorrectly()
    {
        // Arrange — a normalized_key that contains a comma
        var createdAt = DateTimeOffset.UtcNow;
        _db.IngredientCategories.Add(new IngredientCategory
        {
            NormalizedKey = "salt, pepper",
            GrocerySection = "Pantry",
            Confidence = 1.0,
            Source = "manual",
            CreatedAt = createdAt,
            UpdatedAt = createdAt
        });
        await _db.SaveChangesAsync();

        // Act
        await _service.BackupAsync();

        // Assert
        var lines = await File.ReadAllLinesAsync(CsvPath);
        Assert.Equal(2, lines.Length);
        // The key field should be quoted
        Assert.StartsWith("\"salt, pepper\"", lines[1]);
    }

    [Fact]
    public async Task BackupAsync_OverwritesPreviousCsv_OnSecondCall()
    {
        // Arrange — first backup with one row
        var createdAt = DateTimeOffset.UtcNow;
        _db.IngredientCategories.Add(new IngredientCategory
        {
            NormalizedKey = "olive oil",
            GrocerySection = "Pantry",
            Confidence = 1.0,
            Source = "manual",
            CreatedAt = createdAt,
            UpdatedAt = createdAt
        });
        await _db.SaveChangesAsync();
        await _service.BackupAsync();

        // Add a second row and backup again
        _db.IngredientCategories.Add(new IngredientCategory
        {
            NormalizedKey = "butter",
            GrocerySection = "Dairy & Eggs",
            Confidence = 1.0,
            Source = "manual",
            CreatedAt = createdAt,
            UpdatedAt = createdAt
        });
        await _db.SaveChangesAsync();

        // Act
        await _service.BackupAsync();

        // Assert — second backup should have both rows
        var lines = await File.ReadAllLinesAsync(CsvPath);
        Assert.Equal(3, lines.Length); // header + 2 rows
    }

    [Fact]
    public async Task PruneWorkflowsAsync_RemovesOnlyOldTerminalWorkflowHistory()
    {
        // Arrange
        var now = DateTimeOffset.UtcNow;
        var oldCompleted = Workflow("old-completed", WorkflowStatus.Completed, now.AddDays(-8));
        var oldFailed = Workflow("old-failed", WorkflowStatus.Failed, now.AddDays(-9));
        var recentCompleted = Workflow("recent-completed", WorkflowStatus.Completed, now.AddDays(-2));
        var oldProcessing = Workflow("old-processing", WorkflowStatus.Processing, now.AddDays(-10));
        _db.WorkflowInstances.AddRange(oldCompleted, oldFailed, recentCompleted, oldProcessing);
        await _db.SaveChangesAsync();

        // Act
        var result = await _service.PruneWorkflowsAsync(7);

        // Assert
        Assert.Equal(2, result.PrunedInstances);
        Assert.Equal(2, result.PrunedTasks);

        var remainingWorkflowIds = await _db.WorkflowInstances
            .Select(w => w.WorkflowId)
            .ToListAsync();
        Assert.DoesNotContain("old-completed", remainingWorkflowIds);
        Assert.DoesNotContain("old-failed", remainingWorkflowIds);
        Assert.Contains("recent-completed", remainingWorkflowIds);
        Assert.Contains("old-processing", remainingWorkflowIds);
    }

    [Fact]
    public async Task GenerateDreamingReportAsync_WritesMarkdownWithFailuresAndStuckWorkflows()
    {
        // Arrange
        var now = DateTimeOffset.UtcNow;
        _db.WorkflowInstances.Add(Workflow(
            "failed-import",
            WorkflowStatus.Failed,
            now.AddHours(-2),
            taskStatus: TaskStatus.Failed,
            errorMessage: "Extraction failed"));
        _db.WorkflowInstances.Add(Workflow(
            "stuck-import",
            WorkflowStatus.Processing,
            now.AddHours(-2),
            taskStatus: TaskStatus.Processing));
        _db.WorkflowInstances.Add(Workflow(
            "db-backup",
            WorkflowStatus.Completed,
            now.AddMinutes(-10)));
        await _db.SaveChangesAsync();

        // Act
        var result = await _service.GenerateDreamingReportAsync(new WorkflowPruneResult(3, 4));

        // Assert
        Assert.True(File.Exists(result.Path));
        Assert.StartsWith(ReportsRoot, result.Path);
        Assert.Equal(1, result.FailedWorkflows);
        Assert.Equal(1, result.StuckWorkflows);

        var markdown = await File.ReadAllTextAsync(result.Path);
        Assert.Contains("# Dreaming Report", markdown);
        Assert.Contains("Pruned workflow instances: 3", markdown);
        Assert.Contains("Pruned workflow tasks: 4", markdown);
        Assert.Contains("db-backup", markdown);
        Assert.Contains("failed-import", markdown);
        Assert.Contains("Extraction failed", markdown);
        Assert.Contains("Keep an eye on these", markdown);
        Assert.Contains("stuck-import", markdown);
    }

    // ── Restore step 8 ────────────────────────────────────────────────────────

    [Fact]
    public async Task RestoreAsync_WithValidCsv_UpsertsRows()
    {
        // Arrange — write a CSV with two rows
        var csv = """
            normalized_key,grocery_section,confidence,source,created_at
            chicken breast,Meat,0.99,llm,2026-01-15T10:00:00Z
            tomato sauce,Pantry,0.95,llm,2026-01-15T10:00:00Z
            """;
        await File.WriteAllTextAsync(CsvPath, csv.Trim());

        // Act
        await _service.RestoreAsync();

        // Assert
        var categories = await _db.IngredientCategories.ToListAsync();
        Assert.Equal(2, categories.Count);
        Assert.Contains(categories, c => c.NormalizedKey == "chicken breast" && c.GrocerySection == "Meat");
        Assert.Contains(categories, c => c.NormalizedKey == "tomato sauce" && c.GrocerySection == "Pantry");
    }

    private static WorkflowInstance Workflow(
        string workflowId,
        WorkflowStatus status,
        DateTimeOffset updatedAt,
        TaskStatus taskStatus = TaskStatus.Completed,
        string? errorMessage = null)
    {
        var instance = new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = workflowId,
            Status = status,
            CreatedAt = updatedAt.AddMinutes(-5),
            UpdatedAt = updatedAt
        };

        instance.Tasks.Add(new WorkflowTask
        {
            TaskId = Guid.NewGuid(),
            InstanceId = instance.Id,
            TaskName = "task",
            ProcessorName = "Processor",
            Status = taskStatus,
            ErrorMessage = errorMessage,
            CreatedAt = updatedAt.AddMinutes(-5),
            UpdatedAt = updatedAt
        });

        return instance;
    }

    [Fact]
    public async Task RestoreAsync_WithAbsentCsv_DoesNotFail()
    {
        // Arrange — ensure the CSV does not exist
        if (File.Exists(CsvPath)) File.Delete(CsvPath);

        // Act — should not throw
        await _service.RestoreAsync();

        // Assert — no rows added
        var categories = await _db.IngredientCategories.ToListAsync();
        Assert.Empty(categories);
    }

    [Fact]
    public async Task RestoreAsync_WithMalformedRow_SkipsMalformedAndUpsertsValid()
    {
        // Arrange — one malformed row (missing fields), one valid row
        var csv = """
            normalized_key,grocery_section,confidence,source,created_at
            MALFORMED_ROW_ONLY_ONE_FIELD
            salmon fillet,Seafood,0.97,llm,2026-01-15T10:00:00Z
            """;
        await File.WriteAllTextAsync(CsvPath, csv.Trim());

        // Act
        await _service.RestoreAsync();

        // Assert — only the valid row is upserted
        var categories = await _db.IngredientCategories.ToListAsync();
        Assert.Single(categories);
        Assert.Equal("salmon fillet", categories[0].NormalizedKey);
        Assert.Equal("Seafood", categories[0].GrocerySection);
    }

    [Fact]
    public async Task RestoreAsync_WithExistingRow_UpdatesExistingRow()
    {
        // Arrange — seed an existing row in the DB
        var existing = new IngredientCategory
        {
            NormalizedKey = "chicken breast",
            GrocerySection = "Uncategorized",
            Confidence = 0.5,
            Source = "manual",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _db.IngredientCategories.Add(existing);
        await _db.SaveChangesAsync();

        // Write a CSV that updates the same key with new values
        var csv = """
            normalized_key,grocery_section,confidence,source,created_at
            chicken breast,Meat,0.99,llm,2026-01-15T10:00:00Z
            """;
        await File.WriteAllTextAsync(CsvPath, csv.Trim());

        // Act
        await _service.RestoreAsync();

        // Assert — the existing row is updated, not duplicated
        var categories = await _db.IngredientCategories.ToListAsync();
        Assert.Single(categories);
        Assert.Equal("Meat", categories[0].GrocerySection);
        Assert.Equal(0.99, categories[0].Confidence);
        Assert.Equal("llm", categories[0].Source);
    }

    [Fact]
    public async Task BackupAsync_WritesCuisineTypeAndMealTypes_ToRecipeInfo()
    {
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Metadata Soup",
            AddedBy = _factory.DefaultFamilyMemberId,
            ImageCount = 1,
            IsReady = true,
            Category = "Supper",
            CuisineType = "French-Canadian",
            MealTypes = ["Supper", "Sides"],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await _db.SaveChangesAsync();

        await _service.BackupAsync();

        var info = await _recipeStore.ReadInfoAsync(recipeId);
        Assert.NotNull(info);
        Assert.Equal("French-Canadian", info!.CuisineType);
        Assert.NotNull(info.MealTypes);
        Assert.Equal(["Supper", "Sides"], info.MealTypes!);
    }

    [Fact]
    public async Task RestoreAsync_WithLegacyDietaryProfile_FallsBackCuisineAndMealTypes()
    {
        var recipeId = Guid.NewGuid();
        var memberId = _factory.DefaultFamilyMemberId;
        var info = new RecipeInfo
        {
            Id = recipeId,
            Name = "Legacy Recipe",
            AddedBy = memberId,
            ImageCount = 1,
            IsSynthesized = false,
            CreatedAt = DateTimeOffset.UtcNow,
            DietaryProfile = new RecipeDietaryProfile(
                PrimaryFoodGroup: "ProteinFoods",
                SecondaryFoodGroups: [],
                ProteinSource: "Poultry",
                CuisineType: "Greek",
                MealTypes: ["Dinner", "Sides"],
                PrimaryMealType: "Dinner",
                WholeGrainConfident: false,
                Confidence: 0.8,
                Source: "llm",
                FopFlags: null)
        };

        await _recipeStore.WriteInfoAsync(info);
        await _service.RestoreAsync();

        var restored = await _db.Recipes.FindAsync(recipeId);
        Assert.NotNull(restored);
        Assert.Equal("Greek", restored!.CuisineType);
        Assert.NotNull(restored.MealTypes);
        Assert.Equal(["Supper", "Sides"], restored.MealTypes!);
    }
}
