using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Models;

namespace RecipeApi.Data;

public class RecipeDbContext(DbContextOptions<RecipeDbContext> options) : DbContext(options)
{
    public DbSet<FamilyMember> FamilyMembers => Set<FamilyMember>();
    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<RecipeImport> RecipeImports => Set<RecipeImport>();

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
    }
}
