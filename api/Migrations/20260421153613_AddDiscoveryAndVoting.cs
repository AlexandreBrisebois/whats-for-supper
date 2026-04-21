using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecipeApi.Migrations
{
    /// <inheritdoc />
    public partial class AddDiscoveryAndVoting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "category",
                table: "recipes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "difficulty",
                table: "recipes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_discoverable",
                table: "recipes",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "recipe_votes",
                columns: table => new
                {
                    recipe_id = table.Column<Guid>(type: "uuid", nullable: false),
                    family_member_id = table.Column<Guid>(type: "uuid", nullable: false),
                    vote = table.Column<short>(type: "smallint", nullable: false),
                    voted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recipe_votes", x => new { x.recipe_id, x.family_member_id });
                    table.CheckConstraint("CK_recipe_votes_vote", "vote >= 1 AND vote <= 2");
                    table.ForeignKey(
                        name: "FK_recipe_votes_family_members_family_member_id",
                        column: x => x.family_member_id,
                        principalTable: "family_members",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_recipe_votes_recipes_recipe_id",
                        column: x => x.recipe_id,
                        principalTable: "recipes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_recipes_category",
                table: "recipes",
                column: "category");

            migrationBuilder.CreateIndex(
                name: "idx_recipes_is_discoverable",
                table: "recipes",
                column: "is_discoverable");

            migrationBuilder.CreateIndex(
                name: "idx_recipe_votes_family_member_id",
                table: "recipe_votes",
                column: "family_member_id");

            migrationBuilder.CreateIndex(
                name: "idx_recipe_votes_recipe_id",
                table: "recipe_votes",
                column: "recipe_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "recipe_votes");

            migrationBuilder.DropIndex(
                name: "idx_recipes_category",
                table: "recipes");

            migrationBuilder.DropIndex(
                name: "idx_recipes_is_discoverable",
                table: "recipes");

            migrationBuilder.DropColumn(
                name: "category",
                table: "recipes");

            migrationBuilder.DropColumn(
                name: "difficulty",
                table: "recipes");

            migrationBuilder.DropColumn(
                name: "is_discoverable",
                table: "recipes");
        }
    }
}
