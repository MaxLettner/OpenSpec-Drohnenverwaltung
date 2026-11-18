using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Application;

/// <summary>An active loan in the student group details (manage-drones-and-groups design D3).</summary>
public record StudentGroupActiveLoan(
    int Id,
    int DroneId,
    string Drone,
    DateOnly LoanDate,
    int DaysOut,
    int Batteries,
    int Propellers);

/// <summary>A returned loan in the student group details (design D3).</summary>
public record StudentGroupRecentLoan(
    int Id,
    int DroneId,
    string Drone,
    DateOnly LoanDate,
    DateOnly ReturnDate,
    int Batteries,
    int Propellers);

/// <summary>The details of one student group (student-group spec "Show student group details").</summary>
public record StudentGroupDetails(
    int Id,
    string Name,
    IReadOnlyList<StudentGroupActiveLoan> ActiveLoans,
    IReadOnlyList<StudentGroupRecentLoan> RecentLoans);

public static class StudentGroupDetailsQuery
{
    /// <summary>
    /// REQ-003, REQ-007, REQ-010: the group with all its active loans, oldest loan date first, and
    /// its latest returned loans like the drone details. Null when the group does not exist.
    /// </summary>
    public static async Task<StudentGroupDetails?> GetStudentGroupDetailsAsync(
        this AppDbContext db, int id, DateOnly today, CancellationToken ct = default)
    {
        var studentGroup = await db.StudentGroups.AsNoTracking().SingleOrDefaultAsync(g => g.Id == id, ct);
        if (studentGroup is null)
        {
            return null;
        }

        var loans = await (
            from loan in db.Loans.AsNoTracking()
            where loan.StudentGroupId == id
            join drone in db.Drones on loan.DroneId equals drone.Id
            select new
            {
                loan.Id,
                loan.Status,
                DroneId = drone.Id,
                Drone = drone.Name,
                loan.LoanDate,
                loan.ReturnDate,
                Batteries = db.LoanItems.Where(i => i.LoanId == loan.Id && i.Type == LoanItemType.Battery)
                    .Sum(i => (int?)i.Quantity) ?? 0,
                Propellers = db.LoanItems.Where(i => i.LoanId == loan.Id && i.Type == LoanItemType.Propeller)
                    .Sum(i => (int?)i.Quantity) ?? 0,
            }).ToListAsync(ct);

        var active = loans
            .Where(l => l.Status == LoanStatus.Active)
            .OrderBy(l => l.LoanDate)
            .ThenBy(l => l.Id)
            .Select(l => new StudentGroupActiveLoan(
                l.Id, l.DroneId, l.Drone, l.LoanDate, today.DayNumber - l.LoanDate.DayNumber, l.Batteries, l.Propellers))
            .ToList();
        var recent = loans
            .Where(l => l.Status == LoanStatus.Returned)
            .OrderByDescending(l => l.ReturnDate)
            .ThenByDescending(l => l.Id)
            .Take(DroneDetailsQuery.RecentLoanCount)
            .Select(l => new StudentGroupRecentLoan(
                l.Id, l.DroneId, l.Drone, l.LoanDate, l.ReturnDate!.Value, l.Batteries, l.Propellers))
            .ToList();

        return new StudentGroupDetails(studentGroup.Id, studentGroup.Name, active, recent);
    }
}
