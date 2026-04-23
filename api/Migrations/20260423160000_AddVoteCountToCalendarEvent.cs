using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecipeApi.Migrations
{
    /// <inheritdoc />
    public partial class AddVoteCountToCalendarEvent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "vote_count",
                table: "calendar_events",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "idx_calendar_events_vote_count",
                table: "calendar_events",
                column: "vote_count");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_calendar_events_vote_count",
                table: "calendar_events");

            migrationBuilder.DropColumn(
                name: "vote_count",
                table: "calendar_events");
        }
    }
}
