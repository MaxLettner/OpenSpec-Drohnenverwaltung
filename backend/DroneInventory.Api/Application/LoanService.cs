using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Application;

/// <summary>
/// Outcome of <see cref="LoanService.CreateAsync"/>: the new loan, or why none was created
/// (<see cref="NotFound"/> = unknown drone or group, <see cref="Conflict"/> = drone not available).
/// </summary>
public record CreateLoanResult(Loan? Loan, string? NotFound, string? Conflict)
{
    public static CreateLoanResult Created(Loan loan) => new(loan, null, null);

    public static CreateLoanResult Missing(string message) => new(null, message, null);

    public static CreateLoanResult NotAvailable(int droneId) => new(null, null, $"Drone {droneId} is not available.");
}

/// <summary>Holds the loan rules (design D3). Endpoints only translate HTTP to calls of this service.</summary>
public class LoanService(AppDbContext db, TimeProvider timeProvider)
{
    // REQ-004: loan an existing drone to an existing student group; the LoanDate is today and never caller-supplied.
    // REQ-005: a drone has at most one active loan.
    public async Task<CreateLoanResult> CreateAsync(int droneId, int studentGroupId)
    {
        if (!await db.Drones.AnyAsync(d => d.Id == droneId))
        {
            return CreateLoanResult.Missing($"No drone with Id {droneId} exists.");
        }

        if (!await db.StudentGroups.AnyAsync(g => g.Id == studentGroupId))
        {
            return CreateLoanResult.Missing($"No student group with Id {studentGroupId} exists.");
        }

        // REQ-005 friendly path; the partial unique index below still decides when requests race.
        if (await db.Loans.AnyAsync(l => l.DroneId == droneId && l.Status == LoanStatus.Active))
        {
            return CreateLoanResult.NotAvailable(droneId);
        }

        var loan = new Loan
        {
            DroneId = droneId,
            StudentGroupId = studentGroupId,
            Status = LoanStatus.Active,
            LoanDate = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime),
        };
        db.Loans.Add(loan);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // REQ-005 race path: another request inserted the active loan after the check above.
            db.Entry(loan).State = EntityState.Detached;
            return CreateLoanResult.NotAvailable(droneId);
        }

        return CreateLoanResult.Created(loan);
    }

    // 19 = SQLITE_CONSTRAINT; 2067 = SQLITE_CONSTRAINT_UNIQUE (the partial index on Loans(DroneId)).
    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is SqliteException { SqliteErrorCode: 19, SqliteExtendedErrorCode: 2067 };
}
