using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecipeApi.Migrations
{
    /// <inheritdoc />
    public partial class OptimizeDiscoveryView : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "last_cooked_date",
                table: "recipes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql(@"
CREATE VIEW vw_discovery_recipes AS
SELECT 
    r.id,
    r.name,
    r.category,
    r.description,
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
WHERE r.is_discoverable = TRUE
ORDER BY vote_count DESC, last_cooked_date DESC NULLS FIRST;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP VIEW vw_discovery_recipes;");

            migrationBuilder.DropColumn(
                name: "last_cooked_date",
                table: "recipes");
        }
    }
}
