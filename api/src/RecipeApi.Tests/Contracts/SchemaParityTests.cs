using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using RecipeApi.Data;
using Xunit;

namespace RecipeApi.Tests.Contracts;

/// <summary>
/// Verifies in-memory parity between EF Core's relational <see cref="IModel"/>
/// on <see cref="RecipeDbContext"/> and <c>api/database/schema.sql</c> without
/// requiring a live PostgreSQL connection.
/// </summary>
public class SchemaParityTests
{
    /// <summary>
    /// Columns intentionally present in <c>schema.sql</c> without an EF Core scalar property:
    /// - <c>recipe_search_documents.embedding</c>: PostgreSQL <c>GENERATED ALWAYS AS (...) STORED</c>
    ///   <c>vector(1536)</c> column queried via raw SQL in <c>RecipeSemanticSearchRepository</c>.
    /// - <c>maintenance_commands.child_launch_intent_id</c>: SQL-level nullable retention column.
    /// </summary>
    private static readonly HashSet<(string Table, string Column)> SqlOnlyColumns =
    [
        ("recipe_search_documents", "embedding"),
        ("maintenance_commands", "child_launch_intent_id"),
    ];

    [Fact]
    public void MappedTablesAndColumnsMatchSchemaSql()
    {
        using var context = CreateNpgsqlModelContext();
        var model = context.Model;
        var sqlText = File.ReadAllText(FindSchemaSqlPath());
        var sqlTables = ParseCreateTables(sqlText);

        Assert.True(sqlTables.Count >= 30, $"Expected at least 30 CREATE TABLE statements in schema.sql, found {sqlTables.Count}.");

        var efTables = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
        foreach (var entityType in model.GetEntityTypes())
        {
            if (entityType.IsOwned() || entityType.GetViewName() is not null
                || entityType.GetTableName() is not { Length: > 0 } tableName)
            {
                continue;
            }

            var storeObject = StoreObjectIdentifier.Table(tableName, entityType.GetSchema());
            if (!efTables.TryGetValue(tableName, out var columns))
            {
                columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                efTables[tableName] = columns;
            }

            foreach (var property in entityType.GetProperties())
            {
                if (property.GetColumnName(storeObject) is { Length: > 0 } columnName)
                {
                    columns.Add(columnName);
                }
            }
        }

        var inEfNotSqlTables = efTables.Keys
            .Except(sqlTables.Keys, StringComparer.OrdinalIgnoreCase)
            .OrderBy(static t => t, StringComparer.Ordinal)
            .ToArray();

        var inSqlNotEfTables = sqlTables.Keys
            .Except(efTables.Keys, StringComparer.OrdinalIgnoreCase)
            .OrderBy(static t => t, StringComparer.Ordinal)
            .ToArray();

        Assert.True(
            inEfNotSqlTables.Length == 0 && inSqlNotEfTables.Length == 0,
            $"Table parity mismatch between RecipeDbContext and api/database/schema.sql.\n" +
            $"Mapped in RecipeDbContext but missing from schema.sql: [{string.Join(", ", inEfNotSqlTables)}]\n" +
            $"Present in schema.sql but unmapped in RecipeDbContext: [{string.Join(", ", inSqlNotEfTables)}]");

        var missingInSql = new List<string>();
        var unexpectedSqlOnly = new List<string>();

        foreach (var (tableName, efColumns) in efTables.OrderBy(static kv => kv.Key, StringComparer.Ordinal))
        {
            var sqlColumns = sqlTables[tableName];

            foreach (var efCol in efColumns.OrderBy(static c => c, StringComparer.Ordinal))
            {
                if (!sqlColumns.Contains(efCol))
                {
                    missingInSql.Add($"{tableName}.{efCol}");
                }
            }

            foreach (var sqlCol in sqlColumns.OrderBy(static c => c, StringComparer.Ordinal))
            {
                if (!efColumns.Contains(sqlCol)
                    && !SqlOnlyColumns.Contains((tableName.ToLowerInvariant(), sqlCol.ToLowerInvariant())))
                {
                    unexpectedSqlOnly.Add($"{tableName}.{sqlCol}");
                }
            }
        }

        Assert.True(
            missingInSql.Count == 0 && unexpectedSqlOnly.Count == 0,
            $"Column parity mismatch between RecipeDbContext and api/database/schema.sql.\n" +
            $"Mapped in RecipeDbContext but missing from schema.sql: [{string.Join(", ", missingInSql)}]\n" +
            $"Present in schema.sql without EF mapping: [{string.Join(", ", unexpectedSqlOnly)}]");

        foreach (var (table, column) in SqlOnlyColumns)
        {
            Assert.True(
                sqlTables.TryGetValue(table, out var cols) && cols.Contains(column),
                $"SqlOnlyColumns allowlist entry '{table}.{column}' no longer exists in schema.sql.");
            Assert.False(
                efTables.TryGetValue(table, out var efCols) && efCols.Contains(column),
                $"SqlOnlyColumns allowlist entry '{table}.{column}' is now mapped in RecipeDbContext; remove it from SqlOnlyColumns.");
        }
    }

    [Fact]
    public void MappedViewsExistInSchemaSql()
    {
        using var context = CreateNpgsqlModelContext();
        var sqlViews = ParseCreateViews(File.ReadAllText(FindSchemaSqlPath()));

        var efViews = context.Model.GetEntityTypes()
            .Where(static e => !e.IsOwned() && e.GetViewName() is not null)
            .Select(static e => e.GetViewName()!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(static v => v, StringComparer.Ordinal)
            .ToArray();

        Assert.NotEmpty(efViews);

        var missingViews = efViews
            .Where(v => !sqlViews.Contains(v))
            .ToArray();

        Assert.True(
            missingViews.Length == 0,
            $"Views mapped in RecipeDbContext but missing from schema.sql: [{string.Join(", ", missingViews)}]");
    }

    [Fact]
    public void ParseCreateTables_HandlesGeneratedColumnsInlineChecksAndTableConstraints()
    {
        const string sampleSql = """
            -- comment before table
            CREATE TABLE IF NOT EXISTS sample_items (
                id uuid PRIMARY KEY,
                kind text NOT NULL CHECK (kind IN ('alpha,beta', 'gamma')),
                computed vector(1536) GENERATED ALWAYS AS (
                    CASE WHEN kind IS NOT NULL THEN NULL ELSE NULL END
                ) STORED,
                "quoted_col" integer DEFAULT 0 NOT NULL,
                PRIMARY KEY (id),
                CONSTRAINT sample_items_kind_check CHECK (char_length(btrim(kind)) >= 1)
            );
            """;

        var parsed = ParseCreateTables(sampleSql);
        Assert.True(parsed.TryGetValue("sample_items", out var columns));
        Assert.Equal(
            ["computed", "id", "kind", "quoted_col"],
            columns!.OrderBy(static c => c, StringComparer.Ordinal).ToArray());
    }

    private static RecipeDbContext CreateNpgsqlModelContext()
    {
        var options = new DbContextOptionsBuilder<RecipeDbContext>()
            .UseNpgsql("Host=localhost;Database=parity_check")
            .Options;
        return new RecipeDbContext(options);
    }

    internal static Dictionary<string, HashSet<string>> ParseCreateTables(string rawSql)
    {
        var stripped = StripCommentsAndFunctions(rawSql);
        var headerRegex = new Regex(
            @"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:""?[a-zA-Z0-9_]+""?\.)?""?([a-zA-Z0-9_]+)""?\s*\(",
            RegexOptions.IgnoreCase);

        var result = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);

        foreach (Match match in headerRegex.Matches(stripped))
        {
            var tableName = match.Groups[1].Value;
            var openParenIndex = match.Index + match.Length - 1;
            var body = ExtractBalancedParenthesesBody(stripped, openParenIndex);
            var columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var entry in SplitTopLevelCommaItems(body))
            {
                var trimmed = entry.Trim();
                if (trimmed.Length == 0 || IsTableConstraintItem(trimmed))
                {
                    continue;
                }

                var colMatch = Regex.Match(trimmed, @"^""?([a-zA-Z_][a-zA-Z0-9_]*)""?(?:\s|$)");
                if (colMatch.Success)
                {
                    columns.Add(colMatch.Groups[1].Value);
                }
            }

            result[tableName] = columns;
        }

        return result;
    }

    private static HashSet<string> ParseCreateViews(string rawSql)
    {
        var stripped = StripCommentsAndFunctions(rawSql);
        var regex = new Regex(
            @"CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:""?[a-zA-Z0-9_]+""?\.)?""?([a-zA-Z0-9_]+)""?\s+AS\b",
            RegexOptions.IgnoreCase);

        return regex.Matches(stripped)
            .Select(static m => m.Groups[1].Value)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    private static string StripCommentsAndFunctions(string rawSql)
    {
        var noLineComments = Regex.Replace(rawSql, @"--[^\r\n]*", string.Empty);
        return Regex.Replace(
            noLineComments,
            @"CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION[\s\S]*?\$\$\s*;",
            string.Empty,
            RegexOptions.IgnoreCase);
    }

    private static string ExtractBalancedParenthesesBody(string text, int openParenIndex)
    {
        var depth = 0;
        var inSingleQuote = false;
        for (var i = openParenIndex; i < text.Length; i++)
        {
            var ch = text[i];
            if (ch == '\'')
            {
                if (inSingleQuote && i + 1 < text.Length && text[i + 1] == '\'')
                {
                    i++;
                }
                else
                {
                    inSingleQuote = !inSingleQuote;
                }

                continue;
            }

            if (inSingleQuote)
            {
                continue;
            }

            if (ch == '(')
            {
                depth++;
            }
            else if (ch == ')' && --depth == 0)
            {
                return text.Substring(openParenIndex + 1, i - openParenIndex - 1);
            }
        }

        throw new InvalidOperationException($"Unclosed CREATE TABLE parenthesis starting at index {openParenIndex}.");
    }

    private static List<string> SplitTopLevelCommaItems(string body)
    {
        var items = new List<string>();
        var depth = 0;
        var inSingleQuote = false;
        var start = 0;
        for (var i = 0; i < body.Length; i++)
        {
            var ch = body[i];
            if (ch == '\'')
            {
                if (inSingleQuote && i + 1 < body.Length && body[i + 1] == '\'')
                {
                    i++;
                }
                else
                {
                    inSingleQuote = !inSingleQuote;
                }

                continue;
            }

            if (inSingleQuote)
            {
                continue;
            }

            if (ch == '(')
            {
                depth++;
            }
            else if (ch == ')')
            {
                depth--;
            }
            else if (ch == ',' && depth == 0)
            {
                items.Add(body.Substring(start, i - start));
                start = i + 1;
            }
        }

        if (start < body.Length)
        {
            items.Add(body[start..]);
        }

        return items;
    }

    private static bool IsTableConstraintItem(string item) =>
        Regex.IsMatch(item, @"^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK)\b", RegexOptions.IgnoreCase);

    private static string FindSchemaSqlPath()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "specs", "openapi.yaml")))
            {
                var candidate = Path.Combine(dir.FullName, "api", "database", "schema.sql");
                if (File.Exists(candidate))
                {
                    return candidate;
                }
            }

            dir = dir.Parent;
        }

        throw new FileNotFoundException("Could not locate api/database/schema.sql from test base directory.", "api/database/schema.sql");
    }
}
