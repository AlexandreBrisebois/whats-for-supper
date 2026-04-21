using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecipeApi.Migrations
{
    /// <inheritdoc />
    public partial class AddRecipeNameAndTotalTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "name",
                table: "recipes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "total_time",
                table: "recipes",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "name",
                table: "recipes");

            migrationBuilder.DropColumn(
                name: "total_time",
                table: "recipes");
        }
    }
}
