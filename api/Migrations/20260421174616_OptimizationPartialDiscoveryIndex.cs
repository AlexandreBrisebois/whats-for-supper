using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecipeApi.Migrations
{
    /// <inheritdoc />
    public partial class OptimizationPartialDiscoveryIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_recipes_category",
                table: "recipes");

            migrationBuilder.DropIndex(
                name: "idx_recipes_is_discoverable",
                table: "recipes");

            migrationBuilder.CreateIndex(
                name: "idx_recipes_discovery_lookup",
                table: "recipes",
                columns: new[] { "category", "id" },
                filter: "is_discoverable = TRUE");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_recipes_discovery_lookup",
                table: "recipes");

            migrationBuilder.CreateIndex(
                name: "idx_recipes_category",
                table: "recipes",
                column: "category");

            migrationBuilder.CreateIndex(
                name: "idx_recipes_is_discoverable",
                table: "recipes",
                column: "is_discoverable");
        }
    }
}
