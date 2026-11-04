using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Application;

public record ActiveLoanRow(int Id, string Group, string Drone, int Batteries, int Propellers, DateOnly LoanDate);

public record LoanHistoryRow(int Id, string Group, string Drone, int Batteries, int Propellers, DateOnly LoanDate, DateOnly ReturnDate);

public static class LoanQueries
{
    /// <summary>
    /// REQ-007: all active loans as one projection query (no N+1, no tracking).
    /// Accessory quantities are 0 when the loan has no item of that type.
    /// Fixed order by loan date, then Id (design D10).
    /// </summary>
    public static Task<List<ActiveLoanRow>> GetActiveLoansAsync(this AppDbContext db, CancellationToken ct = default) =>
        (from loan in db.Loans.AsNoTracking()
         where loan.Status == LoanStatus.Active
         join drone in db.Drones on loan.DroneId equals drone.Id
         join studentGroup in db.StudentGroups on loan.StudentGroupId equals studentGroup.Id
         orderby loan.LoanDate, loan.Id
         select new ActiveLoanRow(
             loan.Id,
             studentGroup.Name,
             drone.Name,
             db.LoanItems.Where(i => i.LoanId == loan.Id && i.Type == LoanItemType.Battery)
                 .Sum(i => (int?)i.Quantity) ?? 0,
             db.LoanItems.Where(i => i.LoanId == loan.Id && i.Type == LoanItemType.Propeller)
                 .Sum(i => (int?)i.Quantity) ?? 0,
             loan.LoanDate))
        .ToListAsync(ct);

    /// <summary>
    /// REQ-010: returned loans only, one no-tracking projection query.
    /// Latest return first, then Id descending as tiebreaker (design D10).
    /// </summary>
    public static Task<List<LoanHistoryRow>> GetLoanHistoryAsync(this AppDbContext db, CancellationToken ct = default) =>
        (from loan in db.Loans.AsNoTracking()
         where loan.Status == LoanStatus.Returned
         join drone in db.Drones on loan.DroneId equals drone.Id
         join studentGroup in db.StudentGroups on loan.StudentGroupId equals studentGroup.Id
         orderby loan.ReturnDate descending, loan.Id descending
         select new LoanHistoryRow(
             loan.Id,
             studentGroup.Name,
             drone.Name,
             db.LoanItems.Where(i => i.LoanId == loan.Id && i.Type == LoanItemType.Battery)
                 .Sum(i => (int?)i.Quantity) ?? 0,
             db.LoanItems.Where(i => i.LoanId == loan.Id && i.Type == LoanItemType.Propeller)
                 .Sum(i => (int?)i.Quantity) ?? 0,
             loan.LoanDate,
             loan.ReturnDate!.Value))
        .ToListAsync(ct);
}
