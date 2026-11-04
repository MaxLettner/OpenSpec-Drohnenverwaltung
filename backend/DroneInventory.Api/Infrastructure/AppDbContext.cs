using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Infrastructure;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<StudentGroup> StudentGroups => Set<StudentGroup>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<StudentGroup>(group =>
        {
            // REQ-003: unique name, ignoring case (NOCASE collation makes the unique index case-insensitive).
            group.Property(g => g.Name).IsRequired().HasMaxLength(StudentGroup.NameMaxLength).UseCollation("NOCASE");
            group.HasIndex(g => g.Name).IsUnique();
        });
    }
}
