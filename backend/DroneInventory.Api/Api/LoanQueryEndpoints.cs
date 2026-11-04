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
        group.MapGet("/history", HistoryAsync);
    }

    // REQ-010
    private static async Task<IResult> HistoryAsync(AppDbContext db) =>
        Results.Ok(await db.GetLoanHistoryAsync());

    // REQ-007
    private static async Task<IResult> ActiveAsync(AppDbContext db) =>
        Results.Ok(await db.GetActiveLoansAsync());
}
