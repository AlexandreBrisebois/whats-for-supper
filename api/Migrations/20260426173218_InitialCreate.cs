using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecipeApi.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "family_members",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_family_members", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "vw_recipe_matches",
                columns: table => new
                {
                    recipe_id = table.Column<Guid>(type: "uuid", nullable: false),
                    like_count = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vw_recipe_matches", x => x.recipe_id);
                });

            migrationBuilder.CreateTable(
                name: "workflow_instances",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkflowId = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<short>(type: "smallint", nullable: false),
                    Parameters = table.Column<string>(type: "jsonb", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workflow_instances", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "recipes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    rating = table.Column<short>(type: "smallint", nullable: false),
                    added_by = table.Column<Guid>(type: "uuid", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    name = table.Column<string>(type: "text", nullable: true),
                    total_time = table.Column<string>(type: "text", nullable: true),
                    image_count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    is_discoverable = table.Column<bool>(type: "boolean", nullable: false),
                    category = table.Column<string>(type: "text", nullable: true),
                    difficulty = table.Column<string>(type: "text", nullable: true),
                    is_vegetarian = table.Column<bool>(type: "boolean", nullable: false),
                    is_healthy_choice = table.Column<bool>(type: "boolean", nullable: false),
                    raw_metadata = table.Column<string>(type: "jsonb", nullable: true),
                    ingredients = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    last_cooked_date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recipes", x => x.id);
                    table.CheckConstraint("CK_recipes_rating", "rating >= 0 AND rating <= 3");
                    table.ForeignKey(
                        name: "FK_recipes_family_members_added_by",
                        column: x => x.added_by,
                        principalTable: "family_members",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "workflow_tasks",
                columns: table => new
                {
                    TaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    InstanceId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProcessorName = table.Column<string>(type: "text", nullable: false),
                    Payload = table.Column<string>(type: "jsonb", nullable: true),
                    Status = table.Column<short>(type: "smallint", nullable: false),
                    DependsOn = table.Column<string[]>(type: "text[]", nullable: false),
                    RetryCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    ScheduledAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    StackTrace = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workflow_tasks", x => x.TaskId);
                    table.ForeignKey(
                        name: "FK_workflow_tasks_workflow_instances_InstanceId",
                        column: x => x.InstanceId,
                        principalTable: "workflow_instances",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "calendar_events",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    recipe_id = table.Column<Guid>(type: "uuid", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<short>(type: "smallint", nullable: false),
                    vote_count = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_calendar_events", x => x.id);
                    table.CheckConstraint("CK_calendar_events_status", "status >= 0 AND status <= 3");
                    table.ForeignKey(
                        name: "FK_calendar_events_recipes_recipe_id",
                        column: x => x.recipe_id,
                        principalTable: "recipes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

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
                name: "idx_calendar_events_date",
                table: "calendar_events",
                column: "date");

            migrationBuilder.CreateIndex(
                name: "IX_calendar_events_recipe_id",
                table: "calendar_events",
                column: "recipe_id");

            migrationBuilder.CreateIndex(
                name: "idx_recipe_votes_family_member_id",
                table: "recipe_votes",
                column: "family_member_id");

            migrationBuilder.CreateIndex(
                name: "idx_recipe_votes_recipe_id",
                table: "recipe_votes",
                column: "recipe_id");

            migrationBuilder.CreateIndex(
                name: "idx_recipes_added_by",
                table: "recipes",
                column: "added_by",
                filter: "added_by IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "idx_recipes_created_at_desc",
                table: "recipes",
                column: "created_at",
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "idx_recipes_discovery_lookup",
                table: "recipes",
                columns: new[] { "category", "id" },
                filter: "is_discoverable = TRUE");

            migrationBuilder.CreateIndex(
                name: "IX_workflow_tasks_InstanceId",
                table: "workflow_tasks",
                column: "InstanceId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "calendar_events");

            migrationBuilder.DropTable(
                name: "recipe_votes");

            migrationBuilder.DropTable(
                name: "vw_recipe_matches");

            migrationBuilder.DropTable(
                name: "workflow_tasks");

            migrationBuilder.DropTable(
                name: "recipes");

            migrationBuilder.DropTable(
                name: "workflow_instances");

            migrationBuilder.DropTable(
                name: "family_members");
        }
    }
}
