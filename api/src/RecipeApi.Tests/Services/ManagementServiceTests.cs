using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Infrastructure;
using RecipeApi.Models;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

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

    public async Task InitializeAsync()
    {
        _factory = await TestWebApplicationFactory.CreateAsync();
        _scope = _factory.Services.CreateScope();
        _db = _scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        _service = _scope.ServiceProvider.GetRequiredService<ManagementService>();
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
}
