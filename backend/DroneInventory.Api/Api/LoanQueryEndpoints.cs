using DroneInventory.Api.Application;
using DroneInventory.Api.Infrastructure;

namespace DroneInventory.Api.Api;

public static class LoanQueryEndpoints
{
    public static void MapLoanQueryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/loans");
        // Literal segment: never captured by GET /api/loans/{id:int}.
        group.MapGet("/active", ActiveAsync);
    }

    // REQ-007
    private static async Task<IResult> ActiveAsync(AppDbContext db) =>
        Results.Ok(await db.GetActiveLoansAsync());
}
