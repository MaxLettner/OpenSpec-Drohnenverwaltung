using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Infrastructure;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<StudentGroup> StudentGroups => Set<StudentGroup>();

    public DbSet<Drone> Drones => Set<Drone>();

    public DbSet<Loan> Loans => Set<Loan>();

    public DbSet<LoanItem> LoanItems => Set<LoanItem>();

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

        modelBuilder.Entity<Loan>(loan =>
        {
            loan.Property(l => l.Status).HasConversion<string>().HasMaxLength(20);
            loan.HasOne<Drone>().WithMany().HasForeignKey(l => l.DroneId).OnDelete(DeleteBehavior.Restrict);
            loan.HasOne<StudentGroup>().WithMany().HasForeignKey(l => l.StudentGroupId).OnDelete(DeleteBehavior.Restrict);
            loan.HasMany(l => l.Items).WithOne().HasForeignKey(i => i.LoanId).OnDelete(DeleteBehavior.Restrict);
            // REQ-005: at most one active loan per drone, enforced by the database (partial unique index).
            loan.HasIndex(l => l.DroneId).IsUnique().HasFilter("\"Status\" = 'Active'");
        });

        modelBuilder.Entity<LoanItem>(item =>
        {
            item.Property(i => i.Type).HasConversion<string>().HasMaxLength(20);
            // REQ-006: at most one item per type per loan; quantity is never negative.
            item.HasIndex(i => new { i.LoanId, i.Type }).IsUnique();
            item.ToTable(t => t.HasCheckConstraint("CK_LoanItems_Quantity", "\"Quantity\" >= 0"));
        });
    }
}
