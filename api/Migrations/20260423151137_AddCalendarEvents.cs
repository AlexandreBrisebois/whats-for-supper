using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecipeApi.Migrations
{
    /// <inheritdoc />
    public partial class AddCalendarEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "calendar_events",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    RecipeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_calendar_events", x => x.Id);
                    table.CheckConstraint("CK_calendar_events_status", "status >= 0 AND status <= 3");
                    table.ForeignKey(
                        name: "FK_calendar_events_recipes_RecipeId",
                        column: x => x.RecipeId,
                        principalTable: "recipes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_calendar_events_date",
                table: "calendar_events",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_calendar_events_RecipeId",
                table: "calendar_events",
                column: "RecipeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "calendar_events");
        }
    }
}
