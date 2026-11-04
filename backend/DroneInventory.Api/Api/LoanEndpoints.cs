using System.Text.Json;
using DroneInventory.Api.Application;
using DroneInventory.Api.Domain;

namespace DroneInventory.Api.Api;

// Items is accepted and ignored for now; it is validated and stored in task 6.3 (REQ-006).
public record CreateLoanRequest(int? DroneId, int? StudentGroupId, JsonElement? Items = null);

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
    }

    private static async Task<IResult> CreateAsync(CreateLoanRequest request, LoanService loans)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.DroneId is not > 0)
        {
            errors["droneId"] = ["The droneId is required and must be positive."];
        }

        if (request.StudentGroupId is not > 0)
        {
            errors["studentGroupId"] = ["The studentGroupId is required and must be positive."];
        }

        if (errors.Count > 0)
        {
            return Results.ValidationProblem(errors);
        }

        var result = await loans.CreateAsync(request.DroneId!.Value, request.StudentGroupId!.Value);
        if (result.Loan is null)
        {
            return Results.Problem(statusCode: StatusCodes.Status404NotFound, detail: result.NotFound);
        }

        return Results.Created($"/api/loans/{result.Loan.Id}", LoanResponse.From(result.Loan));
    }
}
