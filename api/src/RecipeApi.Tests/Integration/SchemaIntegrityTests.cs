using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public class SchemaIntegrityTests
{
    private readonly string _schemaContent;

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
    public async Task RecipeImportReport_Model_UsesCascadeAndNullableMemberReferences()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var entity = db.Model.FindEntityType(typeof(RecipeImportReport));

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

    private string GetTableDefinition(string tableName)
    {
        // Simple regex to extract the CREATE TABLE block for a specific table
        var pattern = $@"CREATE TABLE IF NOT EXISTS {tableName} \((.*?)\);";
        var match = Regex.Match(_schemaContent, pattern, RegexOptions.Singleline | RegexOptions.IgnoreCase);
        return match.Success ? match.Groups[1].Value : string.Empty;
    }
}
