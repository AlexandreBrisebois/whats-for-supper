using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecipeApi.Migrations
{
    /// <inheritdoc />
    public partial class FixRecipeMatchesViewFormula : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP VIEW vw_recipe_matches;");

            migrationBuilder.Sql(@"
CREATE VIEW vw_recipe_matches AS
SELECT
    recipe_id,
    COUNT(*) as like_count
FROM recipe_votes
WHERE vote = CAST(1 AS smallint)
GROUP BY recipe_id
HAVING COUNT(*) >= CEIL((SELECT (COUNT(*) + 1.0) / 2.0 FROM family_members));
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP VIEW vw_recipe_matches;");

            migrationBuilder.Sql(@"
CREATE VIEW vw_recipe_matches AS
SELECT
    recipe_id,
    COUNT(*) as like_count
FROM recipe_votes
WHERE vote = CAST(1 AS smallint)
GROUP BY recipe_id
HAVING COUNT(*) >= CEIL((SELECT COUNT(*) * 0.5 FROM family_members));
            ");
        }
    }
}
