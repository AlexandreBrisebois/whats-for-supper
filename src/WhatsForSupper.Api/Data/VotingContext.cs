using Microsoft.EntityFrameworkCore;
using WhatsForSupper.Api.Models;

namespace WhatsForSupper.Api.Data;

public class VotingContext : DbContext
{
    public VotingContext(DbContextOptions<VotingContext> options) : base(options)
    {
    }

    public DbSet<SupperOption> SupperOptions { get; set; }
    public DbSet<Vote> Votes { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure SupperOption
        modelBuilder.Entity<SupperOption>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.CreatedBy).IsRequired().HasMaxLength(50);
            entity.Property(e => e.CreatedAt).IsRequired();
        });

        // Configure Vote
        modelBuilder.Entity<Vote>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FamilyMember).IsRequired().HasMaxLength(50);
            entity.Property(e => e.VotedAt).IsRequired();

            // Configure relationship
            entity.HasOne(e => e.SupperOption)
                  .WithMany(e => e.Votes)
                  .HasForeignKey(e => e.SupperOptionId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Ensure one vote per family member per option
            entity.HasIndex(e => new { e.SupperOptionId, e.FamilyMember })
                  .IsUnique();
        });

        // Seed some initial data
        modelBuilder.Entity<SupperOption>().HasData(
            new SupperOption { Id = 1, Name = "Pizza", Description = "Delicious homemade pizza", CreatedBy = "Admin", CreatedAt = DateTime.UtcNow },
            new SupperOption { Id = 2, Name = "Pasta", Description = "Spaghetti with marinara sauce", CreatedBy = "Admin", CreatedAt = DateTime.UtcNow },
            new SupperOption { Id = 3, Name = "Tacos", Description = "Mexican-style tacos with fresh ingredients", CreatedBy = "Admin", CreatedAt = DateTime.UtcNow }
        );
    }
}