using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Application;

/// <summary>
/// One row of the drone list (REQ-002): a drone with its derived availability. The API returns the
/// projection as it is, so the members carry the JSON names of the API contract (design D5).
/// </summary>
public record DroneListItem(int Id, string Name, string? Description, Availability Availability);

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
            .Select(d => new DroneListItem(
                d.Id,
                d.Name,
                d.Description,
                db.Loans.Any(l => l.DroneId == d.Id && l.Status == LoanStatus.Active)
                    ? Availability.Loaned
                    : Availability.Available))
            .ToListAsync(ct);
}
