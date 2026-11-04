using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Application;

/// <summary>Outcome of <see cref="LoanService.CreateAsync"/>: the new loan, or why none was created.</summary>
public record CreateLoanResult(Loan? Loan, string? NotFound)
{
    public static CreateLoanResult Created(Loan loan) => new(loan, null);

    public static CreateLoanResult Missing(string message) => new(null, message);
}

/// <summary>Holds the loan rules (design D3). Endpoints only translate HTTP to calls of this service.</summary>
public class LoanService(AppDbContext db, TimeProvider timeProvider)
{
    // REQ-004: loan an existing drone to an existing student group; the LoanDate is today and never caller-supplied.
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

        var loan = new Loan
        {
            DroneId = droneId,
            StudentGroupId = studentGroupId,
            Status = LoanStatus.Active,
            LoanDate = DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime),
        };
        db.Loans.Add(loan);
        await db.SaveChangesAsync();
        return CreateLoanResult.Created(loan);
    }
}
