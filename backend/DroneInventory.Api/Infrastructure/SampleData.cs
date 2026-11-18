using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Infrastructure;

/// <summary>
/// The fixed sample data of a fresh development database (sample-data spec, design D1/D2).
/// 10 drones with 3 active loans leave 7 available, so the loan form shows its drone search box;
/// the 5 groups show as a list. The Ids are fixed, so the data is the same on every machine.
/// </summary>
public static class SampleData
{
    // Methods, not fields: EF tracks the entities it saves, so every call needs new instances.
    private static IEnumerable<Drone> Drones() =>
    [
        new() { Id = 1, Name = "TELLO-01", Description = "SSID: TELLO-3C41A0" },
        new() { Id = 2, Name = "TELLO-02", Description = "SSID: TELLO-1A2B3C" },
        new() { Id = 3, Name = "TELLO-03", Description = "SSID: TELLO-7F02D4, spare propeller guards in the box" },
        new() { Id = 4, Name = "TELLO-04" },
        new() { Id = 5, Name = "TELLO-05", Description = "SSID: TELLO-55E9B1" },
        new() { Id = 6, Name = "MAVIC-01", Description = "DJI Mavic 3 Classic, case with three batteries" },
        new() { Id = 7, Name = "MINI-01", Description = "DJI Mini 4 Pro, 249 g" },
        new() { Id = 8, Name = "MINI-02", Description = "DJI Mini 4 Pro, gimbal cover missing" },
        new() { Id = 9, Name = "ANAFI-01", Description = "Parrot Anafi, charge the controller before lending" },
        new() { Id = 10, Name = "AVATA-01", Description = "DJI Avata 2 with goggles; keep the goggles cable in the case" },
    ];

    private static IEnumerable<StudentGroup> Groups() =>
    [
        new() { Id = 1, Name = "Group 1" },
        new() { Id = 2, Name = "Group 2" },
        new() { Id = 3, Name = "Group 3" },
        new() { Id = 4, Name = "Group 4" },
        new() { Id = 5, Name = "Group 5" },
    ];

    /// <summary>
    /// Writes the sample data when the database holds no drone, no student group and no loan;
    /// otherwise leaves it as it is. Returns whether it wrote anything.
    /// </summary>
    public static async Task<bool> SeedIfEmptyAsync(AppDbContext db, CancellationToken ct = default)
    {
        if (await db.Drones.AnyAsync(ct) || await db.StudentGroups.AnyAsync(ct) || await db.Loans.AnyAsync(ct))
        {
            return false;
        }

        db.Drones.AddRange(Drones());
        db.StudentGroups.AddRange(Groups());
        db.Loans.AddRange(Loans());
        await db.SaveChangesAsync(ct);
        return true;
    }

    // Written as entities with their own dates, not through LoanService, because returned loans
    // lie in the past. Each drone has at most one active loan (REQ-005).
    private static IEnumerable<Loan> Loans() =>
    [
        // Active
        Active(1, drone: 2, group: 1, new(2026, 11, 10), batteries: 2, propellers: 4),
        Active(2, drone: 6, group: 3, new(2026, 11, 12), batteries: 3),
        Active(3, drone: 8, group: 2, new(2026, 11, 16)),
        // Returned
        Returned(4, drone: 1, group: 2, new(2026, 10, 5), new(2026, 10, 7), batteries: 2, propellers: 4),
        Returned(5, drone: 2, group: 4, new(2026, 10, 12), new(2026, 10, 12), batteries: 1, propellers: 0),
        Returned(6, drone: 10, group: 5, new(2026, 10, 20), new(2026, 10, 27), batteries: 2),
        Returned(7, drone: 6, group: 1, new(2026, 11, 2), new(2026, 11, 5), batteries: 3, propellers: 8),
    ];

    private static Loan Active(int id, int drone, int group, DateOnly loanDate, int? batteries = null, int? propellers = null) =>
        new()
        {
            Id = id,
            DroneId = drone,
            StudentGroupId = group,
            Status = LoanStatus.Active,
            LoanDate = loanDate,
            Items = Items(batteries, propellers),
        };

    private static Loan Returned(
        int id, int drone, int group, DateOnly loanDate, DateOnly returnDate, int? batteries = null, int? propellers = null)
    {
        var loan = Active(id, drone, group, loanDate, batteries, propellers);
        loan.Status = LoanStatus.Returned;
        loan.ReturnDate = returnDate;
        return loan;
    }

    // An accessory without a quantity gets no item, like a loan without that accessory (REQ-006).
    private static List<LoanItem> Items(int? batteries, int? propellers)
    {
        var items = new List<LoanItem>();
        if (batteries is { } b)
        {
            items.Add(new LoanItem { Type = LoanItemType.Battery, Quantity = b });
        }

        if (propellers is { } p)
        {
            items.Add(new LoanItem { Type = LoanItemType.Propeller, Quantity = p });
        }

        return items;
    }
}
