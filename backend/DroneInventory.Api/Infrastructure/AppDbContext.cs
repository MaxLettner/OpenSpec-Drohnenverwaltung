using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Infrastructure;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<StudentGroup> StudentGroups => Set<StudentGroup>();

    public DbSet<Drone> Drones => Set<Drone>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<StudentGroup>(group =>
        {
            // REQ-003: unique name, ignoring case (NOCASE collation makes the unique index case-insensitive).
            group.Property(g => g.Name).IsRequired().HasMaxLength(StudentGroup.NameMaxLength).UseCollation("NOCASE");
            group.HasIndex(g => g.Name).IsUnique();
        });

        modelBuilder.Entity<Drone>(drone =>
        {
            // REQ-001: unique name, ignoring case. No status/availability column: availability is derived from loans.
            drone.Property(d => d.Name).IsRequired().HasMaxLength(Drone.NameMaxLength).UseCollation("NOCASE");
            drone.Property(d => d.Description).HasMaxLength(Drone.DescriptionMaxLength);
            drone.HasIndex(d => d.Name).IsUnique();
        });
    }
}
