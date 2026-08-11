using System.Text.RegularExpressions;
using RecipeApi.Models;
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

    private string GetTableDefinition(string tableName)
    {
        // Simple regex to extract the CREATE TABLE block for a specific table
        var pattern = $@"CREATE TABLE IF NOT EXISTS {tableName} \((.*?)\);";
        var match = Regex.Match(_schemaContent, pattern, RegexOptions.Singleline | RegexOptions.IgnoreCase);
        return match.Success ? match.Groups[1].Value : string.Empty;
    }
}
