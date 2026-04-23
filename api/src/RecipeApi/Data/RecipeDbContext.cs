using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Models;

namespace RecipeApi.Data;

public class RecipeDbContext(DbContextOptions<RecipeDbContext> options) : DbContext(options)
{
    public DbSet<FamilyMember> FamilyMembers => Set<FamilyMember>();
    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<RecipeImport> RecipeImports => Set<RecipeImport>();
    public DbSet<RecipeVote> RecipeVotes => Set<RecipeVote>();
    public DbSet<RecipeMatch> RecipeMatches => Set<RecipeMatch>();
    public DbSet<DiscoveryRecipe> DiscoveryRecipes => Set<DiscoveryRecipe>();
    public DbSet<CalendarEvent> CalendarEvents => Set<CalendarEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<FamilyMember>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CreatedAt)
                  .HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt)
                  .HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<Recipe>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Rating)
                  .HasConversion<short>();
            entity.ToTable("recipes", t =>
                t.HasCheckConstraint("CK_recipes_rating", "rating >= 0 AND rating <= 3"));
            entity.Property(e => e.ImageCount)
                  .HasDefaultValue(0);
            entity.Property(e => e.RawMetadata)
                  .HasColumnType("jsonb");
            entity.Property(e => e.Ingredients)
                  .HasColumnType("jsonb");
            entity.Property(e => e.CreatedAt)
                  .HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt)
                  .HasDefaultValueSql("NOW()");
            entity.HasOne(e => e.AddedByMember)
                  .WithMany(m => m.Recipes)
                  .HasForeignKey(e => e.AddedBy)
                  .OnDelete(DeleteBehavior.SetNull);

            // Indexes
            entity.HasIndex(e => e.CreatedAt)
                  .IsDescending(true)
                  .HasDatabaseName("idx_recipes_created_at_desc");
            entity.HasIndex(e => e.AddedBy)
                  .HasDatabaseName("idx_recipes_added_by")
                  .HasFilter("added_by IS NOT NULL");

            entity.HasIndex(e => new { e.Category, e.Id })
                  .HasFilter("is_discoverable = TRUE")
                  .HasDatabaseName("idx_recipes_discovery_lookup");
        });

        modelBuilder.Entity<RecipeVote>(entity =>
        {
            entity.HasKey(e => new { e.RecipeId, e.FamilyMemberId });

            entity.Property(e => e.Vote)
                  .HasConversion<short>();

            entity.ToTable("recipe_votes", t =>
                t.HasCheckConstraint("CK_recipe_votes_vote", "vote >= 1 AND vote <= 2"));

            entity.HasOne(e => e.Recipe)
                  .WithMany()
                  .HasForeignKey(e => e.RecipeId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.FamilyMember)
                  .WithMany()
                  .HasForeignKey(e => e.FamilyMemberId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.Property(e => e.VotedAt)
                  .HasDefaultValueSql("NOW()");

            entity.HasIndex(e => e.RecipeId)
                  .HasDatabaseName("idx_recipe_votes_recipe_id");
            entity.HasIndex(e => e.FamilyMemberId)
                  .HasDatabaseName("idx_recipe_votes_family_member_id");
        });

        modelBuilder.Entity<RecipeImport>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status)
                  .HasConversion<short>();
            entity.Property(e => e.CreatedAt)
                  .HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt)
                  .HasDefaultValueSql("NOW()");
            entity.HasOne(e => e.Recipe)
                  .WithMany()
                  .HasForeignKey(e => e.RecipeId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.RecipeId)
                  .HasDatabaseName("idx_recipe_imports_recipe_id");
            entity.HasIndex(e => e.Status)
                  .HasDatabaseName("idx_recipe_imports_status");
        });

        modelBuilder.Entity<RecipeMatch>(entity =>
        {
            entity.HasKey(v => v.RecipeId);
            entity.ToView("vw_recipe_matches");
            entity.Property(v => v.RecipeId).HasColumnName("recipe_id");
            entity.Property(v => v.LikeCount).HasColumnName("like_count");
        });

        modelBuilder.Entity<DiscoveryRecipe>(entity =>
        {
            entity.ToView("vw_discovery_recipes");
        });

        modelBuilder.Entity<CalendarEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
            entity.Property(e => e.Status).HasColumnName("status").HasConversion<short>();
            entity.ToTable("calendar_events", t =>
                t.HasCheckConstraint("CK_calendar_events_status", "status >= 0 AND status <= 3"));
            entity.HasOne(e => e.Recipe)
                  .WithMany()
                  .HasForeignKey(e => e.RecipeId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.Date).HasDatabaseName("idx_calendar_events_date");
        });
    }
}
