using System.Diagnostics;
using DroneInventory.Api.Application;
using DroneInventory.Api.Domain;

namespace DroneInventory.Api.Api;

// Type/Quantity are nullable so a missing member is a validation error, not a silent default (REQ-006).
// Numeric types, unknown types and fractional quantities fail JSON binding and become a 400.
public record CreateLoanRequest(int? DroneId, int? StudentGroupId, List<LoanItemInput?>? Items = null);

public record LoanItemResponse(LoanItemType Type, int Quantity);

public record LoanResponse(
    int Id,
    int DroneId,
    int StudentGroupId,
    LoanStatus Status,
    DateOnly LoanDate,
    DateOnly? ReturnDate,
    IReadOnlyList<LoanItemResponse> Items)
{
    public static LoanResponse From(Loan loan) => new(
        loan.Id,
        loan.DroneId,
        loan.StudentGroupId,
        loan.Status,
        loan.LoanDate,
        loan.ReturnDate,
        loan.Items.Select(i => new LoanItemResponse(i.Type, i.Quantity)).ToList());
}

public static class LoanEndpoints
{
    public static void MapLoanEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/loans");
        group.MapPost("/", CreateAsync);
        // {id:int}: a non-integer id does not match and ends as a 404 ProblemDetails.
        group.MapGet("/{id:int}", GetAsync);
        group.MapPost("/{id:int}/return", ReturnAsync);
    }

    private static async Task<IResult> GetAsync(int id, LoanService loans) =>
        await loans.GetAsync(id) is { } loan
            ? Results.Ok(LoanResponse.From(loan))
            : ApiResults.NotFound(NoLoan(id));

    private static async Task<IResult> ReturnAsync(int id, LoanService loans)
    {
        switch (await loans.ReturnAsync(id))
        {
            case ReturnLoanResult.Returned returned:
                return Results.Ok(LoanResponse.From(returned.Loan));
            case ReturnLoanResult.NotFound:
                return ApiResults.NotFound(NoLoan(id));
            case ReturnLoanResult.AlreadyReturned:
                return ApiResults.Conflict(AlreadyReturned(id));
            default:
                throw new UnreachableException("The service returned a result this endpoint does not know.");
        }
    }

    private static async Task<IResult> CreateAsync(CreateLoanRequest request, LoanService loans)
    {
        var result = await loans.CreateAsync(
            new LoanRequest(request.DroneId, request.StudentGroupId, request.Items));
        switch (result)
        {
            case CreateLoanResult.Created created:
                return Results.Created($"/api/loans/{created.Loan.Id}", LoanResponse.From(created.Loan));
            case CreateLoanResult.InvalidInput invalid:
                return ApiResults.ValidationErrors(invalid.Errors);
            case CreateLoanResult.MissingReference missing:
                return ApiResults.NotFound(MissingReference(missing));
            case CreateLoanResult.NotAvailable notAvailable:
                return ApiResults.Conflict(DroneNotAvailable(notAvailable.DroneId));
            default:
                throw new UnreachableException("The service returned a result this endpoint does not know.");
        }
    }

    // The wording of the loan rejections belongs to the HTTP responses that carry it (design D5).
    private static string NoLoan(int id) => $"No loan with Id {id} exists.";

    private static string AlreadyReturned(int id) => $"Loan {id} is already returned.";

    private static string DroneNotAvailable(int droneId) => $"Drone {droneId} is not available.";

    private static string MissingReference(CreateLoanResult.MissingReference missing) =>
        missing.Reference == LoanReference.Drone
            ? $"No drone with Id {missing.Id} exists."
            : $"No student group with Id {missing.Id} exists.";
}
