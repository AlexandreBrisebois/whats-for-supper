using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Services.Processors;
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

    [Fact]
    public async Task Retained_pending_pdf_restores_metadata_without_becoming_ready()
    {
        var id = Guid.NewGuid();
        await _recipeStore.SaveSourcePdfAsync(id, new MemoryStream([1, 2, 3]));
        await _recipeStore.WriteInfoAsync(new RecipeInfo
        {
            Id = id, AddedBy = _factory.DefaultFamilyMemberId, Rating = RecipeRating.Love,
            Notes = "less salt", FinishedDishImageIndex = -1, ImageCount = 0
        });
        await _service.RestoreAsync();
        var restored = await _db.Recipes.SingleAsync(r => r.Id == id);
        Assert.False(restored.IsReady);
        Assert.False(restored.IsDiscoverable);
        Assert.Null(restored.Name);
        Assert.Equal(-1, restored.FinishedDishIndex);
        Assert.Equal("less salt", restored.Notes);
        await using var source = await _recipeStore.ReadSourcePdfAsync(id);
        Assert.Equal(1, source!.ReadByte());
    }

    [Fact]
    public async Task Demo_coordination_does_not_enable_independent_recovery_status()
    {
        var root = _scope.ServiceProvider.GetRequiredService<RecipesRootResolver>().BaseRoot;
        Directory.CreateDirectory(root);
        await File.WriteAllTextAsync(Path.Combine(root, ".demo-coordination"), "2");
        Assert.True(_scope.ServiceProvider.GetRequiredService<RecoveryBoundary>().Enabled);
        var status = await _scope.ServiceProvider.GetRequiredService<RecoverySnapshotService>().StatusAsync(CancellationToken.None);
        Assert.Equal("disabled", status.State);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string DataRoot => _scope.ServiceProvider
        .GetRequiredService<DataRootResolver>().Root;

    private string CsvPath => Path.Combine(DataRoot, "ingredient-categories.csv");
    private string ImportReportsPath => Path.Combine(DataRoot, "recipe-import-reports.json");
    private string GroceryExtrasPath => Path.Combine(DataRoot, "grocery-extras.json");
    private string ReportsRoot => Path.Combine(DataRoot, "reports");

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
    public async Task GroceryExtras_BackupWritesExplicitEmptyVersionedArtifact()
    {
        await _service.BackupAsync();

        using var document = JsonDocument.Parse(await File.ReadAllTextAsync(GroceryExtrasPath));
        Assert.Equal(1, document.RootElement.GetProperty("version").GetInt32());
        Assert.Empty(document.RootElement.GetProperty("occurrences").EnumerateArray());
    }

    [Fact]
    public async Task GroceryExtras_BackupAndRepeatedMergeRestorePreserveIdentityAndLineage()
    {
        var first = GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new DateOnly(2026, 10, 12),
            "Toilet paper", "toilet paper", "Grocery", DateTimeOffset.UtcNow.AddDays(-7));
        var second = GroceryExtraOccurrence.Create(Guid.NewGuid(), first.LineageId, new DateOnly(2026, 10, 19),
            "Bathroom tissue", "bathroom tissue", "Pantry", DateTimeOffset.UtcNow, first.Id);
        second.Version = 3;
        second.Checked = true;
        _db.GroceryExtraOccurrences.AddRange(first, second);
        await _db.SaveChangesAsync();
        await _service.BackupAsync();
        _db.GroceryExtraOccurrences.RemoveRange(first, second);
        await _db.SaveChangesAsync();

        await _service.RestoreAsync();
        await _service.RestoreAsync();

        var restored = await _db.GroceryExtraOccurrences.AsNoTracking().OrderBy(row => row.WeekStartDate).ToListAsync();
        Assert.Equal(2, restored.Count);
        Assert.Equal(first.Id, restored[0].Id);
        Assert.Equal(first.Id, restored[1].PredecessorId);
        Assert.Equal("Bathroom tissue", restored[1].Name);
        Assert.Equal("Pantry", restored[1].GrocerySection);
        Assert.True(restored[1].Checked);
        Assert.Equal(3, restored[1].Version);
    }

    [Fact]
    public async Task GroceryExtras_LegacyArtifactAbsencePreservesDestinationRows()
    {
        var row = GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new DateOnly(2026, 10, 19),
            "Coffee", "coffee", "Grocery", DateTimeOffset.UtcNow);
        _db.GroceryExtraOccurrences.Add(row);
        await _db.SaveChangesAsync();
        File.Delete(GroceryExtrasPath);

        await _service.RestoreAsync();

        Assert.Equal(row.Id, (await _db.GroceryExtraOccurrences.AsNoTracking().SingleAsync()).Id);
    }

    [Fact]
    public async Task GroceryExtras_InvalidLineageIsRejectedBeforeMerge()
    {
        var id = Guid.NewGuid();
        await File.WriteAllTextAsync(GroceryExtrasPath, JsonSerializer.Serialize(new
        {
            version = 1,
            occurrences = new[]
            {
                new { id, lineageId = Guid.NewGuid(), predecessorId = Guid.NewGuid(), weekStartDate = "2026-10-19", name = "Coffee", normalizedKey = "coffee", grocerySection = "Grocery", @checked = false, removedAt = (string?)null, version = 1, createdAt = DateTimeOffset.UtcNow, updatedAt = DateTimeOffset.UtcNow }
            }
        }, JsonDefaults.CamelCase));

        var result = await _service.RestoreAsync();

        Assert.Equal(1, result.Errors);
        Assert.Empty(_db.GroceryExtraOccurrences);
    }

    [Fact]
    public async Task GroceryExtras_UnreadableArtifactIsReportedAndDestinationRowsArePreserved()
    {
        var row = GroceryExtraOccurrence.Create(Guid.NewGuid(), Guid.NewGuid(), new DateOnly(2026, 10, 19),
            "Coffee", "coffee", "Grocery", DateTimeOffset.UtcNow);
        _db.GroceryExtraOccurrences.Add(row);
        await _db.SaveChangesAsync();
        await File.WriteAllTextAsync(GroceryExtrasPath, "{not-json");

        var result = await _service.RestoreAsync();

        Assert.Equal(1, result.Errors);
        Assert.Equal(row.Id, (await _db.GroceryExtraOccurrences.AsNoTracking().SingleAsync()).Id);
    }

    [Theory]
    [InlineData("unsupported-envelope")]
    [InlineData("unsupported-section")]
    [InlineData("noncanonical-section")]
    [InlineData("overlong-name")]
    [InlineData("invalid-version")]
    [InlineData("cross-lineage")]
    [InlineData("nonconsecutive")]
    [InlineData("multiple-roots")]
    [InlineData("terminal-successor")]
    public async Task GroceryExtras_InvalidCompleteHistoryIsReportedBeforeAnyMerge(string invalidCase)
    {
        var lineage = Guid.NewGuid();
        var rootId = Guid.NewGuid();
        var childId = Guid.NewGuid();
        var root = new
        {
            id = rootId,
            lineageId = lineage,
            predecessorId = (Guid?)null,
            weekStartDate = "2026-10-12",
            name = invalidCase == "overlong-name" ? new string('x', 201) : "Coffee",
            normalizedKey = "coffee",
            grocerySection = invalidCase switch
            {
                "unsupported-section" => "Garage",
                "noncanonical-section" => "grocery",
                _ => "Grocery"
            },
            @checked = invalidCase == "terminal-successor",
            removedAt = (string?)null,
            version = invalidCase == "invalid-version" ? 0 : 1,
            createdAt = DateTimeOffset.Parse("2026-10-12T12:00:00Z"),
            updatedAt = DateTimeOffset.Parse("2026-10-12T12:00:00Z")
        };
        var child = new
        {
            id = childId,
            lineageId = invalidCase == "cross-lineage" ? Guid.NewGuid() : lineage,
            predecessorId = invalidCase == "multiple-roots" ? (Guid?)null : rootId,
            weekStartDate = invalidCase == "nonconsecutive" ? "2026-10-26" : "2026-10-19",
            name = "Coffee",
            normalizedKey = "coffee",
            grocerySection = "Grocery",
            @checked = false,
            removedAt = (string?)null,
            version = 1,
            createdAt = DateTimeOffset.Parse("2026-10-19T12:00:00Z"),
            updatedAt = DateTimeOffset.Parse("2026-10-19T12:00:00Z")
        };
        await File.WriteAllTextAsync(GroceryExtrasPath, JsonSerializer.Serialize(new
        {
            version = invalidCase == "unsupported-envelope" ? 2 : 1,
            occurrences = new object[] { root, child }
        }, JsonDefaults.CamelCase));

        var result = await _service.RestoreAsync();

        Assert.Equal(1, result.Errors);
        Assert.Empty(_db.GroceryExtraOccurrences);
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
    public async Task RestoreDemoStateAsync_UnsupportedStorage_Does_Not_Clear_Active_Data()
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
    public async Task GenerateDreamingReportAsync_ReportsDreamingAsStuckOnlyAfterTwentyFourHours()
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
            "dreaming",
            WorkflowStatus.Pending,
            now.AddHours(-2),
            taskStatus: TaskStatus.Pending));
        _db.WorkflowInstances.Add(Workflow(
            "dreaming",
            WorkflowStatus.Processing,
            now.AddHours(-25),
            taskStatus: TaskStatus.Processing));
        _db.WorkflowInstances.Add(Workflow(
            "db-backup",
            WorkflowStatus.Completed,
            now.AddMinutes(-10)));
        await _db.SaveChangesAsync();

        // Act
        var result = await _service.GenerateDreamingReportAsync(
            new WorkflowPruneResult(3, 4),
            maintenancePruneResult: new MaintenanceCommandPruneResult(5, 2, now.AddDays(-30)),
            groceryExtraRolloverResult: new GroceryExtraRolloverResult(3, new DateOnly(2026, 10, 19)));

        // Assert
        Assert.True(File.Exists(result.Path));
        Assert.StartsWith(ReportsRoot, result.Path);
        Assert.Equal(1, result.FailedWorkflows);
        Assert.Equal(2, result.StuckWorkflows);

        var markdown = await File.ReadAllTextAsync(result.Path);
        Assert.Contains("# Dreaming Report", markdown);
        Assert.Contains("Pruned workflow instances: 3", markdown);
        Assert.Contains("Pruned workflow tasks: 4", markdown);
        Assert.Contains("Terminal maintenance commands pruned: 5", markdown);
        Assert.Contains("Legacy completion timestamps initialized: 2", markdown);
        Assert.Contains("Grocery-extra rollover: 3 occurrence(s) created through 2026-10-19", markdown);
        Assert.Contains($"Retention cutoff (inclusive): {now.AddDays(-30):O}", markdown);
        Assert.Contains("db-backup", markdown);
        Assert.Contains("failed-import", markdown);
        Assert.Contains("Extraction failed", markdown);
        Assert.Contains("Keep an eye on these", markdown);
        Assert.Contains("stuck-import", markdown);
        Assert.Equal(1, markdown.Split("dreaming (", StringSplitOptions.None).Length - 1);
    }

    [Fact]
    public async Task GenerateDreamingReportAsync_DoesNotDescribeFailedGroceryRolloverAsCompleted()
    {
        var result = await _service.GenerateDreamingReportAsync(
            groceryExtraRolloverResult: new GroceryExtraRolloverResult(
                0, default, Succeeded: false, FailureCode: "DbUpdateException"));

        var markdown = await File.ReadAllTextAsync(result.Path);
        Assert.Contains("Grocery-extra rollover: failed (not completed); code=DbUpdateException", markdown);
        Assert.DoesNotContain("occurrence(s) created", markdown);
    }

    [Fact]
    public async Task GenerateDreamingReportProcessor_PreservesMaintenancePruneAndFailedRolloverResults()
    {
        var now = DateTimeOffset.UtcNow;
        var instance = new WorkflowInstance
        {
            Id = Guid.NewGuid(),
            WorkflowId = "dreaming",
            Status = WorkflowStatus.Processing,
            CreatedAt = now,
            UpdatedAt = now
        };
        instance.Tasks.Add(new WorkflowTask
        {
            TaskId = Guid.NewGuid(), InstanceId = instance.Id, TaskName = "prune-maintenance-commands",
            ProcessorName = "PruneMaintenanceCommands", Status = TaskStatus.Completed,
            Result = JsonSerializer.Serialize(new MaintenanceCommandPruneResult(7, 2, now.AddDays(-30)), JsonDefaults.CamelCase),
            CreatedAt = now, UpdatedAt = now
        });
        instance.Tasks.Add(new WorkflowTask
        {
            TaskId = Guid.NewGuid(), InstanceId = instance.Id, TaskName = "rollover-grocery-extras",
            ProcessorName = "RolloverGroceryExtras", Status = TaskStatus.Completed,
            Result = JsonSerializer.Serialize(new GroceryExtraRolloverResult(0, default, false, "DbUpdateException"), JsonDefaults.CamelCase),
            CreatedAt = now, UpdatedAt = now
        });
        _db.WorkflowInstances.Add(instance);
        await _db.SaveChangesAsync();
        var reportTask = new WorkflowTask { InstanceId = instance.Id };

        var result = Assert.IsType<DreamingReportResult>(await new ManagementProcessor(
            _service, _db, "GenerateDreamingReport").ExecuteAsync(reportTask, CancellationToken.None));

        var markdown = await File.ReadAllTextAsync(result.Path);
        Assert.Contains("Terminal maintenance commands pruned: 7", markdown);
        Assert.Contains("Legacy completion timestamps initialized: 2", markdown);
        Assert.Contains("Grocery-extra rollover: failed (not completed); code=DbUpdateException", markdown);
        Assert.DoesNotContain("Grocery-extra rollover: 0 occurrence(s) created", markdown);
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
    public async Task RestoreAsync_ToleratesRetiredFieldsAndRestoresCurrentRecipeFields()
    {
        var recipeId = Guid.NewGuid();
        var memberId = _factory.DefaultFamilyMemberId;
        var info = JsonSerializer.Deserialize<RecipeInfo>(
            $$"""
            {
              "id": "{{recipeId}}",
              "name": "Legacy Recipe",
              "addedBy": "{{memberId}}",
              "imageCount": 1,
              "createdAt": "2026-09-25T12:00:00Z",
              "category": "Supper",
              "cuisineType": "Greek",
              "mealTypes": ["Supper", "Sides"],
              "isHealthyChoice": true,
              "isVegetarian": true,
              "dietaryProfile": { "primaryFoodGroup": "ProteinFoods" },
              "fopFlags": { "highSodium": true },
              "balanceSummary": { "isBalanced": true }
            }
            """, JsonDefaults.CamelCase);
        Assert.NotNull(info);

        await _recipeStore.WriteInfoAsync(info!);
        await _recipeStore.WriteRecipeJsonAsync(recipeId, """
            { "recipeIngredient": ["orzo", "tomato"], "sourceUrl": "https://example.test/legacy" }
            """);
        await _service.RestoreAsync();

        var restored = await _db.Recipes.FindAsync(recipeId);
        Assert.NotNull(restored);
        Assert.Equal("Greek", restored!.CuisineType);
        Assert.NotNull(restored.MealTypes);
        Assert.Equal(["Supper", "Sides"], restored.MealTypes!);
        Assert.Equal("Legacy Recipe", restored.Name);
        Assert.Equal("Supper", restored.Category);
        Assert.Equal("[\"orzo\", \"tomato\"]", restored.Ingredients);
        Assert.Equal("https://example.test/legacy", restored.SourceUrl);
        Assert.True(restored.IsVegetarian);
    }

    [Fact]
    public async Task BackupAsync_DoesNotEmitRetiredHealthDietaryOrBalanceFields()
    {
        var recipeId = Guid.NewGuid();
        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Current Recipe",
            AddedBy = _factory.DefaultFamilyMemberId,
            ImageCount = 1,
            IsReady = true,
            Category = "Supper",
            CuisineType = "Greek",
            MealTypes = ["Supper"],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            Ingredients = "[\"lentils\"]"
        });
        await _db.SaveChangesAsync();

        await _service.BackupAsync();

        var info = await _recipeStore.ReadInfoAsync(recipeId);
        var output = JsonSerializer.Serialize(info, JsonDefaults.CamelCase);
        Assert.DoesNotContain("dietaryProfile", output, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("fop", output, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("balanceSummary", output, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("isHealthyChoice", output, StringComparison.OrdinalIgnoreCase);

        var recipeJson = await _recipeStore.ReadRecipeJsonAsync(recipeId);
        Assert.NotNull(recipeJson);
        Assert.DoesNotContain("isHealthyChoice", recipeJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("dietaryProfile", recipeJson, StringComparison.OrdinalIgnoreCase);


    }

    [Fact]
    public async Task RestoreAsync_ToleratesLegacyWeeklyPlanBalanceSummaryAndPreservesGroceryState()
    {
        var planId = Guid.NewGuid();
        var weekStart = new DateOnly(2026, 9, 21);
        await File.WriteAllTextAsync(Path.Combine(DataRoot, "weekly-plans.json"), $$"""
            [
              {
                "id": "{{planId}}",
                "weekStartDate": "{{weekStart:yyyy-MM-dd}}",
                "status": 2,
                "groceryState": "{\"Tomatoes\":\"Pantry\"}",
                "groceryItems": "[{\"name\":\"Tomatoes\"}]",
                "balanceSummary": { "isBalanced": true },
                "createdAt": "2026-09-21T12:00:00Z"
              }
            ]
            """);

        var result = await _service.RestoreAsync();

        var restored = await _db.WeeklyPlans.FindAsync(planId);
        Assert.Equal(1, result.WeeklyPlansRestored);
        Assert.NotNull(restored);
        Assert.Equal(weekStart, restored!.WeekStartDate);
        Assert.Equal(WeeklyPlanStatus.Locked, restored.Status);
        Assert.Equal("{\"Tomatoes\":\"Pantry\"}", restored.GroceryState);
        Assert.Equal("[{\"name\":\"Tomatoes\"}]", restored.GroceryItems);
    }

    [Fact]
    public async Task BackupRestoreRoundTrip_PreservesCurrentRecipeAndWeeklyPlanFacts()
    {
        var recipeId = Guid.NewGuid();
        var planId = Guid.NewGuid();
        var weekStart = new DateOnly(2026, 9, 21);
        _db.Recipes.Add(new Recipe
        {
            Id = recipeId,
            Name = "Current Lentil Supper",
            AddedBy = _factory.DefaultFamilyMemberId,
            ImageCount = 1,
            IsReady = true,
            Category = "Supper",
            CuisineType = "French",
            MealTypes = ["Supper", "Weeknight"],
            IsVegetarian = true,
            Ingredients = "[\"lentils\",\"tomato\"]",
            SourceUrl = "https://example.test/lentils",
            CreatedAt = DateTimeOffset.Parse("2026-09-21T12:00:00Z"),
            UpdatedAt = DateTimeOffset.Parse("2026-09-21T12:00:00Z")
        });
        _db.WeeklyPlans.Add(new WeeklyPlan
        {
            Id = planId,
            WeekStartDate = weekStart,
            Status = WeeklyPlanStatus.Locked,
            GroceryState = "{\"Lentils\":\"Pantry\"}",
            GroceryItems = "[{\"name\":\"Lentils\"}]"
        });
        await _db.SaveChangesAsync();

        await _service.BackupAsync();
        _db.Recipes.Remove((await _db.Recipes.FindAsync(recipeId))!);
        _db.WeeklyPlans.Remove((await _db.WeeklyPlans.FindAsync(planId))!);
        await _db.SaveChangesAsync();

        await _service.RestoreAsync();

        var restoredRecipe = await _db.Recipes.FindAsync(recipeId);
        var restoredPlan = await _db.WeeklyPlans.FindAsync(planId);
        Assert.NotNull(restoredRecipe);
        Assert.Equal("Current Lentil Supper", restoredRecipe!.Name);
        Assert.Equal("French", restoredRecipe.CuisineType);
        Assert.NotNull(restoredRecipe.MealTypes);
        Assert.Equal(["Supper", "Weeknight"], restoredRecipe.MealTypes!);
        Assert.True(restoredRecipe.IsVegetarian);
        Assert.Equal("[\"lentils\",\"tomato\"]", restoredRecipe.Ingredients);
        Assert.Equal("https://example.test/lentils", restoredRecipe.SourceUrl);
        Assert.NotNull(restoredPlan);
        Assert.Equal(weekStart, restoredPlan!.WeekStartDate);
        Assert.Equal(WeeklyPlanStatus.Locked, restoredPlan.Status);
        Assert.Equal("{\"Lentils\":\"Pantry\"}", restoredPlan.GroceryState);
        Assert.Equal("[{\"name\":\"Lentils\"}]", restoredPlan.GroceryItems);
    }

    [Fact]
    public async Task RestoreAsync_MalformedCurrentRecipeInfo_RecordsClearError()
    {
        var recipeId = Guid.NewGuid();
        await _recipeStore.WriteInfoAsync(new RecipeInfo { Id = recipeId, Name = null });

        var result = await _service.RestoreAsync();

        Assert.Equal(1, result.Errors);
        Assert.Null(await _db.Recipes.FindAsync(recipeId));
    }
}
