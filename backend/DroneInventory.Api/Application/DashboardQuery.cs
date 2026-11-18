using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Application;

public record DroneCounts(int Total, int Available, int Loaned);

public record LoanCounts(int Active, int Returned);

public record AccessoriesOut(int Batteries, int Propellers);

public record LongActiveLoan(int Id, string Group, string Drone, DateOnly LoanDate, int DaysOut);

public record WeekCount(DateOnly WeekStart, int Count);

/// <summary>The figures of the Home page (dashboard spec, add-home-dashboard design D1).</summary>
public record Dashboard(
    DroneCounts Drones,
    int StudentGroups,
    LoanCounts Loans,
    AccessoriesOut AccessoriesOut,
    IReadOnlyList<LongActiveLoan> LongestActiveLoans,
    IReadOnlyList<WeekCount> LoansPerWeek);

public static class DashboardQuery
{
    public const int LongestActiveLoanCount = 5;
    public const int WeekCount = 8;

    /// <summary>
    /// REQ-002, REQ-006, REQ-007, REQ-010: live figures computed from the current data for
    /// <paramref name="today"/> (UTC, like the loan dates). Weeks run Monday to Sunday.
    /// </summary>
    public static async Task<Dashboard> GetDashboardAsync(this AppDbContext db, DateOnly today, CancellationToken ct = default)
    {
        var droneCount = await db.Drones.CountAsync(d => !d.Retired, ct);
        var activeCount = await db.Loans.CountAsync(l => l.Status == LoanStatus.Active, ct);
        var returnedCount = await db.Loans.CountAsync(l => l.Status == LoanStatus.Returned, ct);
        var groupCount = await db.StudentGroups.CountAsync(g => !g.Retired, ct);

        var activeItems = db.LoanItems.Where(i => db.Loans.Any(l => l.Id == i.LoanId && l.Status == LoanStatus.Active));
        var batteries = await activeItems.Where(i => i.Type == LoanItemType.Battery).SumAsync(i => (int?)i.Quantity, ct) ?? 0;
        var propellers = await activeItems.Where(i => i.Type == LoanItemType.Propeller).SumAsync(i => (int?)i.Quantity, ct) ?? 0;

        var longest = await (
            from loan in db.Loans.AsNoTracking()
            where loan.Status == LoanStatus.Active
            join drone in db.Drones on loan.DroneId equals drone.Id
            join studentGroup in db.StudentGroups on loan.StudentGroupId equals studentGroup.Id
            orderby loan.LoanDate, loan.Id
            select new { loan.Id, Group = studentGroup.Name, Drone = drone.Name, loan.LoanDate })
            .Take(LongestActiveLoanCount)
            .ToListAsync(ct);

        var currentWeek = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
        var firstWeek = currentWeek.AddDays(-7 * (WeekCount - 1));
        var loanDates = await db.Loans
            .Where(l => l.LoanDate >= firstWeek && l.LoanDate <= today)
            .Select(l => l.LoanDate)
            .ToListAsync(ct);

        return new Dashboard(
            new DroneCounts(droneCount, droneCount - activeCount, activeCount),
            groupCount,
            new LoanCounts(activeCount, returnedCount),
            new AccessoriesOut(batteries, propellers),
            [.. longest.Select(l => new LongActiveLoan(l.Id, l.Group, l.Drone, l.LoanDate, today.DayNumber - l.LoanDate.DayNumber))],
            [.. Enumerable.Range(0, WeekCount).Select(n =>
            {
                var start = firstWeek.AddDays(7 * n);
                return new WeekCount(start, loanDates.Count(d => d >= start && d < start.AddDays(7)));
            })]);
    }
}
