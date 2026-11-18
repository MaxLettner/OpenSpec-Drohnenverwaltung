using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Application;

/// <summary>
/// One row of the drone list (REQ-002): a drone with its derived availability and the Id of its
/// active loan, null when it is available (add-home-dashboard design D2). The API returns the
/// projection as it is, so the members carry the JSON names of the API contract (design D5).
/// </summary>
public record DroneListItem(int Id, string Name, string? Description, Availability Availability, int? ActiveLoanId);

public static class DroneQueries
{
    /// <summary>
    /// REQ-002: all drones with the availability derived from the active loan, in one no-tracking query
    /// (design D2). Fixed order by name, ignoring case (design D10).
    /// </summary>
    public static Task<List<DroneListItem>> GetDronesAsync(this AppDbContext db, CancellationToken ct = default) =>
        db.Drones
            .AsNoTracking()
            .Where(d => !d.Retired)
            .OrderBy(d => d.Name)
            .Select(d => new
            {
                d.Id,
                d.Name,
                d.Description,
                // At most one active loan per drone (REQ-005), so the first one is the one.
                ActiveLoanId = db.Loans
                    .Where(l => l.DroneId == d.Id && l.Status == LoanStatus.Active)
                    .Select(l => (int?)l.Id)
                    .FirstOrDefault(),
            })
            .Select(d => new DroneListItem(
                d.Id,
                d.Name,
                d.Description,
                d.ActiveLoanId != null ? Availability.Loaned : Availability.Available,
                d.ActiveLoanId))
            .ToListAsync(ct);
}

/// <summary>The active loan in the drone details (add-home-dashboard design D3).</summary>
public record DroneActiveLoan(
    int Id,
    string Group,
    DateOnly LoanDate,
    int DaysOut,
    int Batteries,
    int Propellers,
    int StudentGroupId);

/// <summary>A returned loan in the drone details (design D3).</summary>
public record DroneRecentLoan(
    int Id,
    string Group,
    DateOnly LoanDate,
    DateOnly ReturnDate,
    int Batteries,
    int Propellers,
    int StudentGroupId);

/// <summary>The details of one drone, retired or not (drone spec "Show drone details", design D3).</summary>
public record DroneDetails(
    int Id,
    string Name,
    string? Description,
    Availability Availability,
    bool Retired,
    DroneActiveLoan? ActiveLoan,
    IReadOnlyList<DroneRecentLoan> RecentLoans);

public static class DroneDetailsQuery
{
    /// <summary>How many returned loans the details show.</summary>
    public const int RecentLoanCount = 5;

    /// <summary>
    /// REQ-002, REQ-007, REQ-010: the drone with its active loan and its latest returned loans,
    /// latest return first, then Id descending. Null when the drone does not exist.
    /// </summary>
    public static async Task<DroneDetails?> GetDroneDetailsAsync(
        this AppDbContext db, int id, DateOnly today, CancellationToken ct = default)
    {
        var drone = await db.Drones.AsNoTracking().SingleOrDefaultAsync(d => d.Id == id, ct);
        if (drone is null)
        {
            return null;
        }

        var loans = await (
            from loan in db.Loans.AsNoTracking()
            where loan.DroneId == id
            join studentGroup in db.StudentGroups on loan.StudentGroupId equals studentGroup.Id
            select new
            {
                loan.Id,
                loan.Status,
                Group = studentGroup.Name,
                StudentGroupId = studentGroup.Id,
                loan.LoanDate,
                loan.ReturnDate,
                Batteries = db.LoanItems.Where(i => i.LoanId == loan.Id && i.Type == LoanItemType.Battery)
                    .Sum(i => (int?)i.Quantity) ?? 0,
                Propellers = db.LoanItems.Where(i => i.LoanId == loan.Id && i.Type == LoanItemType.Propeller)
                    .Sum(i => (int?)i.Quantity) ?? 0,
            }).ToListAsync(ct);

        var active = loans.SingleOrDefault(l => l.Status == LoanStatus.Active);
        var recent = loans
            .Where(l => l.Status == LoanStatus.Returned)
            .OrderByDescending(l => l.ReturnDate)
            .ThenByDescending(l => l.Id)
            .Take(RecentLoanCount)
            .Select(l => new DroneRecentLoan(
                l.Id, l.Group, l.LoanDate, l.ReturnDate!.Value, l.Batteries, l.Propellers, l.StudentGroupId))
            .ToList();

        return new DroneDetails(
            drone.Id,
            drone.Name,
            drone.Description,
            active is null ? Availability.Available : Availability.Loaned,
            drone.Retired,
            active is null
                ? null
                : new DroneActiveLoan(
                    active.Id,
                    active.Group,
                    active.LoanDate,
                    today.DayNumber - active.LoanDate.DayNumber,
                    active.Batteries,
                    active.Propellers,
                    active.StudentGroupId),
            recent);
    }
}
