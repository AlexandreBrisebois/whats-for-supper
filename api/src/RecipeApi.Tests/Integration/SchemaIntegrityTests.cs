using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class SchemaIntegrityTests
{
    private readonly string _schemaContent;
    private readonly string _compatibilityContent;

    public SchemaIntegrityTests()
    {
        var projectDir = Directory.GetCurrentDirectory();
        // Go up until we find the root directory that contains api/database/schema.sql
        // From bin/Debug/net11.0, we need to go up about 6 levels.
        var root = projectDir;
        for (int i = 0; i < 10; i++)
        {
            if (Directory.Exists(Path.Combine(root, "api/database"))) break;
            root = Directory.GetParent(root)?.FullName ?? root;
        }

        var schemaPath = Path.Combine(root, "api/database/schema.sql");
        if (!File.Exists(schemaPath))
        {
            throw new FileNotFoundException($"Could not find schema.sql at {schemaPath}");
        }
        
        _schemaContent = File.ReadAllText(schemaPath);

        var compatibilityPath = Path.Combine(root, "api/database/compatibility.sql");
        if (!File.Exists(compatibilityPath))
        {
            throw new FileNotFoundException($"Could not find compatibility.sql at {compatibilityPath}");
        }

        _compatibilityContent = File.ReadAllText(compatibilityPath);
    }

    [Fact]
    public void HealthEvents_Schema_Matches_Model()
    {
        var tableDefinition = GetTableDefinition("health_events");
        
        Assert.Contains("event_type", tableDefinition);
        Assert.Contains("error_message", tableDefinition);
        Assert.Contains("updated_at", tableDefinition);
        
        // Negative assertions to explicitly fail on old names (TDD Red phase)
        Assert.DoesNotContain("entity_type", tableDefinition);
        Assert.DoesNotContain("last_error", tableDefinition);
    }

    [Fact]
    public void HealthRecipeProfiles_Schema_Matches_Model()
    {
        var tableDefinition = GetTableDefinition("health_recipe_profiles");
        
        Assert.Contains("is_healthy_choice", tableDefinition);
        Assert.Contains("is_vegetarian", tableDefinition);
        Assert.Contains("primary_food_group", tableDefinition);
        Assert.Contains("version", tableDefinition);
    }

    [Fact]
    public void RecipeImportReports_Schema_Enforces_ActiveRowAndPrivacyConstraints()
    {
        var tableDefinition = GetTableDefinition("recipe_import_reports");

        Assert.Contains("recipe_id uuid PRIMARY KEY", tableDefinition, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("REFERENCES recipes(id) ON DELETE CASCADE", tableDefinition, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("reasons text[]", tableDefinition, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("note varchar(500)", tableDefinition, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("last_error varchar(2000)", tableDefinition, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("reported_by uuid", tableDefinition, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("ON DELETE SET NULL", tableDefinition, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("ready_to_review", tableDefinition, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("cardinality(reasons) > 0", tableDefinition, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void RecipeImportReports_Schema_AllowsExactlyThreeUniqueReasons()
    {
        var tableDefinition = GetTableDefinition("recipe_import_reports");

        Assert.Contains("reasons <@ ARRAY['ingredients', 'steps', 'duplicate']::text[]", tableDefinition, StringComparison.OrdinalIgnoreCase);
        Assert.Single(Regex.Matches(tableDefinition, "array_positions\\(reasons, 'ingredients'", RegexOptions.IgnoreCase).Cast<Match>());
        Assert.Single(Regex.Matches(tableDefinition, "array_positions\\(reasons, 'steps'", RegexOptions.IgnoreCase).Cast<Match>());
        Assert.Single(Regex.Matches(tableDefinition, "array_positions\\(reasons, 'duplicate'", RegexOptions.IgnoreCase).Cast<Match>());
        Assert.DoesNotMatch(@"reasons\s*<@\s*ARRAY\[[^\]]*(?:unknown|other)", tableDefinition);
    }

    [Fact]
    public void RecipeImportReports_Compatibility_ReplacesInstalledTwoReasonConstraint()
    {
        Assert.Contains("pg_get_constraintdef(oid) NOT LIKE '%duplicate%'", _compatibilityContent, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("DROP CONSTRAINT recipe_import_reports_reasons_check", _compatibilityContent, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("reasons <@ ARRAY['ingredients', 'steps', 'duplicate']::text[]", _compatibilityContent, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("array_positions(reasons, 'duplicate'::text)", _compatibilityContent, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RecipeImportReport_Model_UsesCascadeAndNullableMemberReferences()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var designTimeModel = db.GetService<IDesignTimeModel>().Model;
        var entity = designTimeModel.FindEntityType(typeof(RecipeImportReport));

        Assert.NotNull(entity);
        var recipeFk = entity!.GetForeignKeys().Single(fk => fk.PrincipalEntityType.ClrType == typeof(Recipe));
        Assert.Equal(DeleteBehavior.Cascade, recipeFk.DeleteBehavior);

        var memberFks = entity.GetForeignKeys()
            .Where(fk => fk.PrincipalEntityType.ClrType == typeof(FamilyMember))
            .ToList();
        Assert.Equal(2, memberFks.Count);
        Assert.All(memberFks, fk =>
        {
            Assert.False(fk.IsRequired);
            Assert.Equal(DeleteBehavior.SetNull, fk.DeleteBehavior);
        });
    }

    [Fact]
    public async Task RecipeImportReport_Model_AllowsExactlyThreeUniqueReasons()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var designTimeModel = db.GetService<IDesignTimeModel>().Model;
        var entity = designTimeModel.FindEntityType(typeof(RecipeImportReport));

        var constraint = entity!.GetCheckConstraints()
            .Single(check => check.Name == "CK_recipe_import_reports_reasons_allowed_unique");
        var sql = constraint.Sql;

        Assert.Contains("ARRAY['ingredients', 'steps', 'duplicate']", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("CASE WHEN reasons @> ARRAY['ingredients']::text[] THEN 1 ELSE 0 END", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("CASE WHEN reasons @> ARRAY['steps']::text[] THEN 1 ELSE 0 END", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("CASE WHEN reasons @> ARRAY['duplicate']::text[] THEN 1 ELSE 0 END", sql, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("unknown", sql, StringComparison.OrdinalIgnoreCase);
    }

    private string GetTableDefinition(string tableName)
    {
        // Simple regex to extract the CREATE TABLE block for a specific table
        var pattern = $@"CREATE TABLE IF NOT EXISTS {tableName} \((.*?)\);";
        var match = Regex.Match(_schemaContent, pattern, RegexOptions.Singleline | RegexOptions.IgnoreCase);
        return match.Success ? match.Groups[1].Value : string.Empty;
    }
}
