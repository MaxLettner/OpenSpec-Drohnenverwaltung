using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-007 "Show active loans" (specs/loan). Data is seeded directly; each test gets its own database.</summary>
public class ActiveLoanListTests
{
    private static readonly DateOnly Aug19 = new(2026, 8, 19);

    private static async Task<JsonElement[]> ActiveAsync(ApiFactory factory)
    {
        var response = await factory.CreateClient().GetAsync("/api/loans/active");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement[]>())!;
    }

    private static int Id(JsonElement row) => row.GetProperty("id").GetInt32();

    [Fact]
    public async Task REQ_007_Active_loan_list_matches_the_reference_example()
    {
        using var factory = new ApiFactory();
        var ids = await TestApi.SeedLoansAsync(factory,
            new LoanSeed("TELLO-02", "Group 1", Aug19, null, Batteries: 3, Propellers: 4),
            new LoanSeed("TELLO-07", "Group 3", Aug19, null, Batteries: 4, Propellers: 8));

        var rows = await ActiveAsync(factory);

        Assert.Equal(
            ["Group 1 | TELLO-02 | 3 | 4 | 2026-08-19", "Group 3 | TELLO-07 | 4 | 8 | 2026-08-19"],
            rows.Select(TestApi.DescribeRow));
        Assert.Equal(ids, rows.Select(Id));
    }

    [Fact]
    public async Task REQ_007_Returned_loans_are_not_listed()
    {
        using var factory = new ApiFactory();
        await TestApi.SeedLoansAsync(factory,
            new LoanSeed("TELLO-07", "Group 3", Aug19, Aug19, Batteries: 1, Propellers: 2),
            new LoanSeed("TELLO-02", "Group 1", Aug19, null, Batteries: 1, Propellers: 2));

        var rows = await ActiveAsync(factory);

        Assert.Equal(["Group 1 | TELLO-02 | 1 | 2 | 2026-08-19"], rows.Select(TestApi.DescribeRow));
    }

    [Fact]
    public async Task REQ_007_Loan_without_accessories_shows_zero_batteries_and_propellers()
    {
        using var factory = new ApiFactory();
        await TestApi.SeedLoansAsync(factory, new LoanSeed("TELLO-07", "Group 3", Aug19, null));

        var rows = await ActiveAsync(factory);

        Assert.Equal(["Group 3 | TELLO-07 | 0 | 0 | 2026-08-19"], rows.Select(TestApi.DescribeRow));
    }

    [Fact]
    public async Task REQ_007_Loan_with_only_a_battery_item_shows_zero_propellers()
    {
        using var factory = new ApiFactory();
        await TestApi.SeedLoansAsync(factory, new LoanSeed("TELLO-07", "Group 3", Aug19, null, Batteries: 5));

        var rows = await ActiveAsync(factory);

        Assert.Equal(["Group 3 | TELLO-07 | 5 | 0 | 2026-08-19"], rows.Select(TestApi.DescribeRow));
    }

    [Fact]
    public async Task REQ_007_No_active_loans_returns_an_empty_list()
    {
        using var factory = new ApiFactory();

        Assert.Empty(await ActiveAsync(factory));
    }

    [Fact]
    public async Task REQ_007_Rows_are_ordered_by_loan_date_then_id()
    {
        using var factory = new ApiFactory();
        var ids = await TestApi.SeedLoansAsync(factory,
            new LoanSeed("D-late", "G-late", Aug19.AddDays(1), null),
            new LoanSeed("D-early-a", "G-a", Aug19, null),
            new LoanSeed("D-early-b", "G-b", Aug19, null));

        var rows = await ActiveAsync(factory);

        Assert.Equal([ids[1], ids[2], ids[0]], rows.Select(Id));
    }

    [Fact]
    public async Task REQ_007_Active_route_works_next_to_the_id_route()
    {
        using var factory = new ApiFactory();
        var ids = await TestApi.SeedLoansAsync(factory,
            new LoanSeed("TELLO-02", "Group 1", Aug19, null, Batteries: 3, Propellers: 4));
        var client = factory.CreateClient();

        var active = await client.GetAsync("/api/loans/active");
        var byId = await client.GetAsync($"/api/loans/{ids[0]}");

        Assert.Equal(HttpStatusCode.OK, active.StatusCode);
        Assert.Equal(JsonValueKind.Array, (await active.Content.ReadFromJsonAsync<JsonElement>()).ValueKind);
        Assert.Equal(HttpStatusCode.OK, byId.StatusCode);
        Assert.Equal(ids[0], (await byId.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32());
    }
}
