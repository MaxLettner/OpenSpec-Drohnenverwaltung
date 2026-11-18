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
