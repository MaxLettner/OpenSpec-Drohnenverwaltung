using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Application;

/// <summary>
/// Outcome of <see cref="LoanService.CreateAsync"/>: the new loan, or why none was created
/// (<see cref="Invalid"/> = invalid accessories, <see cref="NotFound"/> = unknown drone or group,
/// <see cref="Conflict"/> = drone not available).
/// </summary>
public record CreateLoanResult(
    Loan? Loan, string? NotFound, string? Conflict, IReadOnlyDictionary<string, string[]>? Invalid = null)
{
    public static CreateLoanResult Created(Loan loan) => new(loan, null, null);

    public static CreateLoanResult Missing(string message) => new(null, message, null);

    public static CreateLoanResult NotAvailable(int droneId) => new(null, null, $"Drone {droneId} is not available.");

    public static CreateLoanResult InvalidItems(IReadOnlyDictionary<string, string[]> errors) => new(null, null, null, errors);
}

/// <summary>Outcome of <see cref="LoanService.ReturnAsync"/>: the returned loan, or why not (unknown loan, already returned).</summary>
public record ReturnLoanResult(Loan? Loan, string? NotFound, string? Conflict)
{
    public static ReturnLoanResult Returned(Loan loan) => new(loan, null, null);

    public static ReturnLoanResult Missing(int id) => new(null, $"No loan with Id {id} exists.", null);

    public static ReturnLoanResult AlreadyReturned(int id) => new(null, null, $"Loan {id} is already returned.");
}

/// <summary>One requested accessory. Null members and null list elements are reported as validation errors.</summary>
public record LoanItemInput(LoanItemType? Type, int? Quantity);

/// <summary>Holds the loan rules (design D3). Endpoints only translate HTTP to calls of this service.</summary>
public class LoanService(AppDbContext db, TimeProvider timeProvider)
{
    // REQ-004: loan an existing drone to an existing student group; the LoanDate is today and never caller-supplied.
    // REQ-005: a drone has at most one active loan.
    // REQ-006: optional accessories, one item per type, integer quantity >= 0 (0 is allowed).
    public async Task<CreateLoanResult> CreateAsync(
        int droneId, int studentGroupId, IReadOnlyList<LoanItemInput?>? items = null)
    {
        var errors = ValidateItems(items);
        if (errors.Count > 0)
        {
            return CreateLoanResult.InvalidItems(errors);
        }

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
            Items = (items ?? [])
                .OrderBy(i => i!.Type)
                .Select(i => new LoanItem { Type = i!.Type!.Value, Quantity = i.Quantity!.Value })
                .ToList(),
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

    // The loan with its items in a fixed order (Battery before Propeller), or null for an unknown Id.
    public async Task<Loan?> GetAsync(int id)
    {
        var loan = await db.Loans.Include(l => l.Items).AsSplitQuery().FirstOrDefaultAsync(l => l.Id == id);
        loan?.Items.Sort((a, b) => a.Type.CompareTo(b.Type));
        return loan;
    }

    // REQ-008: an active loan becomes Returned (the drone is available again, as availability is derived).
    // REQ-009: ReturnDate is today (UTC), never before the LoanDate. Only Status and ReturnDate change.
    public async Task<ReturnLoanResult> ReturnAsync(int id)
    {
        var loan = await GetAsync(id);
        if (loan is null)
        {
            return ReturnLoanResult.Missing(id);
        }

        if (loan.Status == LoanStatus.Returned)
        {
            return ReturnLoanResult.AlreadyReturned(id);
        }

        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        loan.Status = LoanStatus.Returned;
        loan.ReturnDate = today < loan.LoanDate ? loan.LoanDate : today;
        await db.SaveChangesAsync();
        return ReturnLoanResult.Returned(loan);
    }

    private static Dictionary<string, string[]> ValidateItems(IReadOnlyList<LoanItemInput?>? items)
    {
        var errors = new Dictionary<string, string[]>();
        var seen = new HashSet<LoanItemType>();
        for (var i = 0; i < (items?.Count ?? 0); i++)
        {
            var item = items![i];
            if (item is null)
            {
                errors[$"items[{i}]"] = ["An item must not be null."];
                continue;
            }

            if (item.Type is null)
            {
                errors[$"items[{i}].type"] = ["The type is required (Battery or Propeller)."];
            }
            else if (!seen.Add(item.Type.Value))
            {
                errors["items"] = [$"The type {item.Type} appears more than once; use one item per type."];
            }

            if (item.Quantity is null)
            {
                errors[$"items[{i}].quantity"] = ["The quantity is required."];
            }
            else if (item.Quantity < 0)
            {
                errors[$"items[{i}].quantity"] = ["The quantity must be 0 or greater."];
            }
        }

        return errors;
    }

    // 19 = SQLITE_CONSTRAINT; 2067 = SQLITE_CONSTRAINT_UNIQUE (the partial index on Loans(DroneId)).
    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is SqliteException { SqliteErrorCode: 19, SqliteExtendedErrorCode: 2067 };
}
