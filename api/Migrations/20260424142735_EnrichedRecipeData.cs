using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecipeApi.Migrations
{
    /// <inheritdoc />
    public partial class EnrichedRecipeData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_healthy_choice",
                table: "recipes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_vegetarian",
                table: "recipes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql(@"
DROP VIEW IF EXISTS vw_discovery_recipes;
CREATE VIEW vw_discovery_recipes AS
SELECT
    r.id,
    r.name,
    r.category,
    r.description,
    r.ingredients,
    r.image_count,
    r.difficulty,
    r.total_time,
    r.last_cooked_date,
    r.created_at,
    COALESCE(v.vote_count, 0) as vote_count
FROM recipes r
LEFT JOIN (
    SELECT recipe_id, COUNT(*) as vote_count
    FROM recipe_votes
    GROUP BY recipe_id
) v ON r.id = v.recipe_id
WHERE r.is_discoverable = TRUE;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_healthy_choice",
                table: "recipes");

            migrationBuilder.DropColumn(
                name: "is_vegetarian",
                table: "recipes");
        }
    }
}
