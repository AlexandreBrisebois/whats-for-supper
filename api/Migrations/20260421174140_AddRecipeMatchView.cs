using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecipeApi.Migrations
{
    /// <inheritdoc />
    public partial class AddRecipeMatchView : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE VIEW vw_recipe_matches AS
SELECT 
    recipe_id,
    COUNT(*) as like_count
FROM recipe_votes
WHERE vote = 1 -- Like
GROUP BY recipe_id
HAVING COUNT(*) >= (SELECT COUNT(*) * 0.5 FROM family_members);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP VIEW vw_recipe_matches;");
        }
    }
}
