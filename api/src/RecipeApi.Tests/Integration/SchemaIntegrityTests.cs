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
    public void RetiredHealthStorageAndDiscoveryProjections_AreAbsent()
    {
        Assert.DoesNotContain("health_events", _schemaContent, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("health_recipe_profiles", _schemaContent, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("health_week_summaries", _schemaContent, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("is_healthy_choice", _schemaContent, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("dietary_profile", _schemaContent, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("balance_summary", _schemaContent, StringComparison.OrdinalIgnoreCase);

        var discoveryView = GetViewDefinition("vw_discovery_recipes");
        Assert.DoesNotContain("is_healthy_choice", discoveryView, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("dietary_profile", discoveryView, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RetiredHealthStorage_HasNoEfModelMapping()
    {
        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var designTimeModel = db.GetService<IDesignTimeModel>().Model;
        var mappedStores = designTimeModel.GetEntityTypes()
            .SelectMany(entity => new[] { entity.GetTableName(), entity.GetViewName() })
            .Where(name => name is not null)
            .ToArray();

        Assert.DoesNotContain(mappedStores, name => name!.StartsWith("health_", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(designTimeModel.FindEntityType(typeof(Recipe))!.GetProperties(), property =>
            property.GetColumnName() is "is_healthy_choice" or "dietary_profile");
        Assert.DoesNotContain(designTimeModel.FindEntityType(typeof(WeeklyPlan))!.GetProperties(), property =>
            property.GetColumnName() == "balance_summary");
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
    public void FeatureFlagOverrides_Compatibility_WaitsForFamilyMembers()
    {
        var compatibilityTable = GetCompatibilityTableDefinition("feature_flag_overrides");
        var familyMembersGuard = _compatibilityContent.IndexOf(
            "IF to_regclass('public.family_members') IS NOT NULL THEN",
            StringComparison.OrdinalIgnoreCase);
        var featureFlagTable = _compatibilityContent.IndexOf(
            "CREATE TABLE IF NOT EXISTS feature_flag_overrides",
            StringComparison.OrdinalIgnoreCase);

        Assert.True(familyMembersGuard >= 0, "The feature-flag compatibility transition must guard its family_members dependency.");
        Assert.True(familyMembersGuard < featureFlagTable);
        Assert.Contains("REFERENCES family_members(id) ON DELETE CASCADE", compatibilityTable, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void FeatureFlagOverrides_Compatibility_RemovesOnlyGraduatedOverrides()
    {
        Assert.Contains("DELETE FROM feature_flag_overrides", _compatibilityContent, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("flag_key = 'planner-hold-to-move'", _compatibilityContent, StringComparison.Ordinal);
        Assert.Contains("flag_key = 'preview-pdf-recipe-import'", _compatibilityContent, StringComparison.Ordinal);
        Assert.Contains("flag_key = 'single-page-recipe-steps'", _compatibilityContent, StringComparison.Ordinal);
        Assert.DoesNotContain("TRUNCATE", _compatibilityContent, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task MaintenanceCommandTerminalRetentionIndex_IsAlignedAcrossSchemaCompatibilityAndEf()
    {
        Assert.Contains("idx_maintenance_commands_terminal_completed", _schemaContent, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("idx_maintenance_commands_terminal_completed", _compatibilityContent, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("WHERE status IN ('completed', 'skipped')", _schemaContent, StringComparison.OrdinalIgnoreCase);

        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var index = db.GetService<IDesignTimeModel>().Model
            .FindEntityType(typeof(MaintenanceCommand))!
            .GetIndexes()
            .Single(candidate => candidate.GetDatabaseName() == "idx_maintenance_commands_terminal_completed");

        Assert.Equal([nameof(MaintenanceCommand.CompletedAt), nameof(MaintenanceCommand.Id)], index.Properties.Select(property => property.Name));
        Assert.Equal("status IN ('completed', 'skipped')", index.GetFilter());
    }

    [Fact]
    public void FamilyMembers_Schema_And_Compatibility_ConstrainNullableCookingView()
    {
        var table = GetTableDefinition("family_members");
        Assert.Contains("cooking_view_mode text", table, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("cooking_view_mode IN ('step-by-step', 'all-steps')", table, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("ADD COLUMN IF NOT EXISTS cooking_view_mode text", _compatibilityContent, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("family_members_cooking_view_mode_check", _compatibilityContent, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GroceryExtra_NameConstraint_IsAlignedAndAvoidsUnsupportedBetweenSyntax()
    {
        var schemaTable = GetTableDefinition("grocery_extra_occurrences");
        var compatibilityTable = GetCompatibilityTableDefinition("grocery_extra_occurrences");

        Assert.DoesNotContain("BETWEEN", schemaTable, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("BETWEEN", compatibilityTable, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("char_length(btrim(name)) >= 1", schemaTable, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("char_length(btrim(name)) <= 200", schemaTable, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("char_length(btrim(name)) >= 1", compatibilityTable, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("char_length(btrim(name)) <= 200", compatibilityTable, StringComparison.OrdinalIgnoreCase);

        await using var factory = await TestWebApplicationFactory.CreateAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        var constraint = db.GetService<IDesignTimeModel>().Model
            .FindEntityType(typeof(GroceryExtraOccurrence))!
            .GetCheckConstraints()
            .Single(check => check.Name == "grocery_extra_occurrences_name");

        Assert.DoesNotContain("BETWEEN", constraint.Sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("char_length(btrim(name)) >= 1", constraint.Sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("char_length(btrim(name)) <= 200", constraint.Sql, StringComparison.OrdinalIgnoreCase);
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
        // Schema tables may be declared with or without the idempotent IF NOT EXISTS clause.
        var pattern = $@"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?{Regex.Escape(tableName)}\s*\((.*?)\)\s*;";
        var match = Regex.Match(_schemaContent, pattern, RegexOptions.Singleline | RegexOptions.IgnoreCase);
        return match.Success ? match.Groups[1].Value : string.Empty;
    }

    private string GetCompatibilityTableDefinition(string tableName)
    {
        var pattern = $@"CREATE TABLE IF NOT EXISTS {tableName} \((.*?)\);";
        var match = Regex.Match(_compatibilityContent, pattern, RegexOptions.Singleline | RegexOptions.IgnoreCase);
        return match.Success ? match.Value : string.Empty;
    }

    private string GetViewDefinition(string viewName)
    {
        var pattern = $@"CREATE OR REPLACE VIEW {viewName} AS(.*?);";
        var match = Regex.Match(_schemaContent, pattern, RegexOptions.Singleline | RegexOptions.IgnoreCase);
        return match.Success ? match.Groups[1].Value : string.Empty;
    }
}
