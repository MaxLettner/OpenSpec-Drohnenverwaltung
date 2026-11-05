using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Application;

/// <summary>
/// A loan request as the API receives it. Every member may be missing, because the validation has to
/// name each field it rejects (REQ-004, REQ-006).
/// </summary>
public record LoanRequest(int? DroneId, int? StudentGroupId, IReadOnlyList<LoanItemInput?>? Items = null);

/// <summary>One requested accessory. Null members and null list elements are reported as validation errors.</summary>
public record LoanItemInput(LoanItemType? Type, int? Quantity);

/// <summary>Which reference a loan request needs but the system does not have (REQ-004).</summary>
public enum LoanReference
{
    Drone,
    StudentGroup,
}

/// <summary>
/// Outcome of <see cref="LoanService.CreateAsync"/>. Only the nested cases can be constructed, so a
/// result is exactly one of them and the caller cannot read a case that does not apply.
/// </summary>
public abstract record CreateLoanResult
{
    private CreateLoanResult()
    {
    }

    /// <summary>REQ-004: the loan was created.</summary>
    public sealed record Created(Loan Loan) : CreateLoanResult;

    /// <summary>REQ-004, REQ-006: the request was rejected; the keys name the offending fields.</summary>
    public sealed record InvalidInput(Dictionary<string, string[]> Errors) : CreateLoanResult;

    /// <summary>REQ-004: the drone or student group the request refers to does not exist.</summary>
    public sealed record MissingReference(LoanReference Reference, int Id) : CreateLoanResult;

    /// <summary>REQ-005: the drone already has an active loan.</summary>
    public sealed record NotAvailable(int DroneId) : CreateLoanResult;
}

/// <summary>
/// Outcome of <see cref="LoanService.ReturnAsync"/>. Only the nested cases can be constructed, so a
/// result is exactly one of them.
/// </summary>
public abstract record ReturnLoanResult
{
    private ReturnLoanResult()
    {
    }

    /// <summary>REQ-008, REQ-009: the loan is returned and carries its ReturnDate.</summary>
    public sealed record Returned(Loan Loan) : ReturnLoanResult;

    /// <summary>REQ-008: no loan with that Id exists.</summary>
    public sealed record NotFound(int LoanId) : ReturnLoanResult;

    /// <summary>REQ-008: the loan was already returned, here or by a simultaneous request.</summary>
    public sealed record AlreadyReturned(int LoanId) : ReturnLoanResult;
}

/// <summary>Holds the loan rules (design D3). Endpoints only translate HTTP to calls of this service.</summary>
public class LoanService(AppDbContext db, TimeProvider timeProvider)
{
    // REQ-004: loan an existing drone to an existing student group; the LoanDate is today and never caller-supplied.
    // REQ-005: a drone has at most one active loan.
    // REQ-006: optional accessories, one item per type, integer quantity >= 0 (0 is allowed).
    public async Task<CreateLoanResult> CreateAsync(LoanRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        var droneId = request.DroneId.GetValueOrDefault();
        if (droneId <= 0)
        {
            errors["droneId"] = ["The droneId is required and must be positive."];
        }

        var studentGroupId = request.StudentGroupId.GetValueOrDefault();
        if (studentGroupId <= 0)
        {
            errors["studentGroupId"] = ["The studentGroupId is required and must be positive."];
        }

        var items = ValidateItems(request.Items, errors);
        if (errors.Count > 0)
        {
            return new CreateLoanResult.InvalidInput(errors);
        }

        if (!await db.Drones.AnyAsync(d => d.Id == droneId))
        {
            return new CreateLoanResult.MissingReference(LoanReference.Drone, droneId);
        }

        if (!await db.StudentGroups.AnyAsync(g => g.Id == studentGroupId))
        {
            return new CreateLoanResult.MissingReference(LoanReference.StudentGroup, studentGroupId);
        }

        // REQ-005 friendly path; the partial unique index still decides when requests race (design D4).
        if (await db.Loans.AnyAsync(l => l.DroneId == droneId && l.Status == LoanStatus.Active))
        {
            return new CreateLoanResult.NotAvailable(droneId);
        }

        var loan = NewLoan(droneId, studentGroupId, items);
        db.Loans.Add(loan);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (SqliteConstraints.IsUniqueViolation(ex))
        {
            // REQ-005 race path: another request inserted the active loan after the check above.
            db.Entry(loan).State = EntityState.Detached;
            return new CreateLoanResult.NotAvailable(droneId);
        }

        return new CreateLoanResult.Created(loan);
    }

    // The loan with its items in a fixed order (Battery before Propeller), or null for an unknown Id.
    public async Task<Loan?> GetAsync(int id)
    {
        var loan = await db.Loans.AsNoTracking().Include(l => l.Items).FirstOrDefaultAsync(l => l.Id == id);
        loan?.Items.Sort((a, b) => a.Type.CompareTo(b.Type));
        return loan;
    }

    // REQ-008: an active loan becomes Returned (the drone is available again, as availability is derived).
    // REQ-009: ReturnDate is today (UTC), never before the LoanDate. Only Status and ReturnDate change.
    public async Task<ReturnLoanResult> ReturnAsync(int id)
    {
        var today = Today();

        // One conditional update: the row changes only while it is still Active, so of simultaneous returns
        // exactly one affects a row and the first ReturnDate is never overwritten.
        var affected = await db.Loans
            .Where(l => l.Id == id && l.Status == LoanStatus.Active)
            .ExecuteUpdateAsync(s => s
                .SetProperty(l => l.Status, LoanStatus.Returned)
                .SetProperty(l => l.ReturnDate, l => l.LoanDate > today ? l.LoanDate : today));

        if (affected == 0)
        {
            // Nothing changed: the loan does not exist, or another return won the race above.
            return await db.Loans.AnyAsync(l => l.Id == id)
                ? new ReturnLoanResult.AlreadyReturned(id)
                : new ReturnLoanResult.NotFound(id);
        }

        return new ReturnLoanResult.Returned(await StoredLoanAsync(id));
    }

    /// <summary>The loan the update just matched, with its items in the same fixed order.</summary>
    private async Task<Loan> StoredLoanAsync(int id)
    {
        var loan = await db.Loans.AsNoTracking().Include(l => l.Items).SingleAsync(l => l.Id == id);
        loan.Items.Sort((a, b) => a.Type.CompareTo(b.Type));
        return loan;
    }

    /// <summary>The new Active loan, dated today, with the validated items in a fixed order (Battery first).</summary>
    private Loan NewLoan(int droneId, int studentGroupId, List<LoanItem> items) => new()
    {
        DroneId = droneId,
        StudentGroupId = studentGroupId,
        Status = LoanStatus.Active,
        LoanDate = Today(),
        Items = [.. items.OrderBy(i => i.Type)],
    };

    /// <summary>Today in UTC. The server sets the dates, the caller never supplies them (REQ-004, REQ-009).</summary>
    private DateOnly Today() => DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);

    /// <summary>
    /// REQ-006: reports every rejected accessory in <paramref name="errors"/> and returns the accepted
    /// ones as the items the loan stores.
    /// </summary>
    private static List<LoanItem> ValidateItems(
        IReadOnlyList<LoanItemInput?>? requested, Dictionary<string, string[]> errors)
    {
        var items = new List<LoanItem>();
        var seen = new HashSet<LoanItemType>();
        var itemInputs = requested ?? [];
        for (var i = 0; i < itemInputs.Count; i++)
        {
            var item = itemInputs[i];
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

            // Only a complete, accepted accessory reaches the loan; anything else is reported above.
            if (item is { Type: { } type, Quantity: { } quantity } && quantity >= 0)
            {
                items.Add(new LoanItem { Type = type, Quantity = quantity });
            }
        }

        return items;
    }
}
