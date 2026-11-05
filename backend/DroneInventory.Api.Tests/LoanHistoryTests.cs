using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-010 "Show loan history" (specs/loan). Data is seeded directly; each test gets its own database.</summary>
public class LoanHistoryTests
{
    private static readonly DateOnly Aug19 = new(2026, 8, 19);

    private static async Task<JsonElement[]> HistoryAsync(ApiFactory factory)
    {
        var response = await factory.CreateClient().GetAsync("/api/loans/history");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement[]>())!;
    }

    private static int Id(JsonElement row) => row.GetProperty("id").GetInt32();

    [Fact]
    public async Task REQ_010_Returned_loan_stays_in_history()
    {
        using var factory = new ApiFactory();
        var ids = await TestApi.SeedLoansAsync(factory,
            new LoanSeed("TELLO-07", "Group 3", Aug19, Aug19.AddDays(2), Batteries: 4, Propellers: 8));

        var rows = await HistoryAsync(factory);

        Assert.Equal(
            ["Group 3 | TELLO-07 | 4 | 8 | 2026-08-19 | 2026-08-21"],
            rows.Select(TestApi.DescribeRow));
        Assert.Equal(ids[0], Id(rows[0]));
    }

    [Fact]
    public async Task REQ_010_Active_loans_are_not_in_the_history()
    {
        using var factory = new ApiFactory();
        await TestApi.SeedLoansAsync(factory,
            new LoanSeed("TELLO-07", "Group 3", Aug19, null, Batteries: 1, Propellers: 2),
            new LoanSeed("TELLO-02", "Group 1", Aug19, Aug19, Batteries: 1, Propellers: 2));

        var rows = await HistoryAsync(factory);

        Assert.Equal(
            ["Group 1 | TELLO-02 | 1 | 2 | 2026-08-19 | 2026-08-19"],
            rows.Select(TestApi.DescribeRow));
    }

    [Fact]
    public async Task REQ_010_No_returned_loans_returns_an_empty_list()
    {
        using var factory = new ApiFactory();

        Assert.Empty(await HistoryAsync(factory));
    }

    [Fact]
    public async Task REQ_010_Loan_without_accessories_shows_zero_batteries_and_propellers()
    {
        using var factory = new ApiFactory();
        await TestApi.SeedLoansAsync(factory, new LoanSeed("TELLO-07", "Group 3", Aug19, Aug19));

        var rows = await HistoryAsync(factory);

        Assert.Equal(
            ["Group 3 | TELLO-07 | 0 | 0 | 2026-08-19 | 2026-08-19"],
            rows.Select(TestApi.DescribeRow));
    }

    [Fact]
    public async Task REQ_010_History_is_ordered_by_return_date_descending_then_id_descending()
    {
        using var factory = new ApiFactory();
        var ids = await TestApi.SeedLoansAsync(factory,
            new LoanSeed("D-1", "G-1", Aug19, Aug19.AddDays(1)),
            new LoanSeed("D-2", "G-2", Aug19, Aug19.AddDays(3)),
            new LoanSeed("D-3", "G-3", Aug19, Aug19.AddDays(1)));

        var rows = await HistoryAsync(factory);

        Assert.Equal([ids[1], ids[2], ids[0]], rows.Select(Id));
    }

    [Fact]
    public async Task REQ_010_Loan_returned_through_the_api_moves_from_active_to_history()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        var loanId = await TestApi.CreateLoanAsync(client, droneId, groupId, ("Battery", 4), ("Propeller", 8));

        Assert.Empty(await HistoryAsync(factory));

        var returned = await client.PostAsync($"/api/loans/{loanId}/return", null);
        Assert.Equal(HttpStatusCode.OK, returned.StatusCode);

        var row = Assert.Single(await HistoryAsync(factory));
        Assert.Equal(loanId, Id(row));
        Assert.Equal("Group 3", row.GetProperty("group").GetString());
        Assert.Equal("TELLO-07", row.GetProperty("drone").GetString());
        Assert.Equal(4, row.GetProperty("batteries").GetInt32());
        Assert.Equal(8, row.GetProperty("propellers").GetInt32());
        Assert.Matches(@"^\d{4}-\d{2}-\d{2}$", row.GetProperty("returnDate").GetString()!);
        Assert.Empty(await client.GetFromJsonAsync<JsonElement[]>("/api/loans/active") ?? []);
    }

    [Fact]
    public async Task REQ_010_History_route_works_next_to_the_id_and_active_routes()
    {
        using var factory = new ApiFactory();
        var ids = await TestApi.SeedLoansAsync(factory,
            new LoanSeed("TELLO-02", "Group 1", Aug19, Aug19, Batteries: 3, Propellers: 4));
        var client = factory.CreateClient();

        var history = await client.GetAsync("/api/loans/history");
        var active = await client.GetAsync("/api/loans/active");
        var byId = await client.GetAsync($"/api/loans/{ids[0]}");

        Assert.Equal(HttpStatusCode.OK, history.StatusCode);
        Assert.Equal(HttpStatusCode.OK, active.StatusCode);
        Assert.Equal(HttpStatusCode.OK, byId.StatusCode);
        Assert.Single((await history.Content.ReadFromJsonAsync<JsonElement[]>())!);
        Assert.Empty((await active.Content.ReadFromJsonAsync<JsonElement[]>())!);
    }
}
