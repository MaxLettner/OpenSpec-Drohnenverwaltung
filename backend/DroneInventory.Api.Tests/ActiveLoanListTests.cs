using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-007 "Show active loans" (specs/loan). Data is seeded directly; each test gets its own database.</summary>
public class ActiveLoanListTests
{
    private static readonly DateOnly Aug19 = new(2026, 8, 19);

    private record Seed(string Drone, string Group, DateOnly Date, int? Batteries, int? Propellers,
        LoanStatus Status = LoanStatus.Active);

    private static async Task<int[]> SeedAsync(ApiFactory factory, params Seed[] seeds)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var ids = new List<int>();
        foreach (var s in seeds)
        {
            var drone = new Drone { Name = s.Drone };
            var group = new StudentGroup { Name = s.Group };
            var loan = new Loan
            {
                LoanDate = s.Date,
                Status = s.Status,
                ReturnDate = s.Status == LoanStatus.Returned ? s.Date : null,
            };
            if (s.Batteries is { } b) loan.Items.Add(new LoanItem { Type = LoanItemType.Battery, Quantity = b });
            if (s.Propellers is { } p) loan.Items.Add(new LoanItem { Type = LoanItemType.Propeller, Quantity = p });
            db.Drones.Add(drone);
            db.StudentGroups.Add(group);
            await db.SaveChangesAsync();
            loan.DroneId = drone.Id;
            loan.StudentGroupId = group.Id;
            db.Loans.Add(loan);
            await db.SaveChangesAsync();
            ids.Add(loan.Id);
        }

        return [.. ids];
    }

    private static async Task<JsonElement[]> ActiveAsync(ApiFactory factory)
    {
        var response = await factory.CreateClient().GetAsync("/api/loans/active");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement[]>())!;
    }

    private static string Row(JsonElement r) =>
        $"{r.GetProperty("group").GetString()} | {r.GetProperty("drone").GetString()} | " +
        $"{r.GetProperty("batteries").GetInt32()} | {r.GetProperty("propellers").GetInt32()} | " +
        $"{r.GetProperty("loanDate").GetString()}";

    [Fact]
    public async Task REQ_007_Active_loan_list_matches_the_reference_example()
    {
        using var factory = new ApiFactory();
        var ids = await SeedAsync(factory,
            new Seed("TELLO-02", "Group 1", Aug19, 3, 4),
            new Seed("TELLO-07", "Group 3", Aug19, 4, 8));

        var rows = await ActiveAsync(factory);

        Assert.Contains("Group 1 | TELLO-02 | 3 | 4 | 2026-08-19", rows.Select(Row));
        Assert.Contains("Group 3 | TELLO-07 | 4 | 8 | 2026-08-19", rows.Select(Row));
        Assert.Equal(ids, rows.Select(r => r.GetProperty("id").GetInt32()));
    }

    [Fact]
    public async Task REQ_007_Returned_loans_are_not_listed()
    {
        using var factory = new ApiFactory();
        await SeedAsync(factory,
            new Seed("TELLO-07", "Group 3", Aug19, 1, 2, LoanStatus.Returned),
            new Seed("TELLO-02", "Group 1", Aug19, 1, 2));

        var rows = await ActiveAsync(factory);

        Assert.Equal(["Group 1 | TELLO-02 | 1 | 2 | 2026-08-19"], rows.Select(Row));
    }

    [Fact]
    public async Task REQ_007_Loan_without_accessories_shows_zero_batteries_and_propellers()
    {
        using var factory = new ApiFactory();
        await SeedAsync(factory, new Seed("TELLO-07", "Group 3", Aug19, null, null));

        var rows = await ActiveAsync(factory);

        Assert.Equal(["Group 3 | TELLO-07 | 0 | 0 | 2026-08-19"], rows.Select(Row));
    }

    [Fact]
    public async Task REQ_007_Loan_with_only_a_battery_item_shows_zero_propellers()
    {
        using var factory = new ApiFactory();
        await SeedAsync(factory, new Seed("TELLO-07", "Group 3", Aug19, 5, null));

        var rows = await ActiveAsync(factory);

        Assert.Equal(["Group 3 | TELLO-07 | 5 | 0 | 2026-08-19"], rows.Select(Row));
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
        var ids = await SeedAsync(factory,
            new Seed("D-late", "G-late", Aug19.AddDays(1), null, null),
            new Seed("D-early-a", "G-a", Aug19, null, null),
            new Seed("D-early-b", "G-b", Aug19, null, null));

        var rows = await ActiveAsync(factory);

        Assert.Equal([ids[1], ids[2], ids[0]], rows.Select(r => r.GetProperty("id").GetInt32()));
    }

    [Fact]
    public async Task REQ_007_Active_route_works_next_to_the_id_route()
    {
        using var factory = new ApiFactory();
        var ids = await SeedAsync(factory, new Seed("TELLO-02", "Group 1", Aug19, 3, 4));
        var client = factory.CreateClient();

        var active = await client.GetAsync("/api/loans/active");
        var byId = await client.GetAsync($"/api/loans/{ids[0]}");

        Assert.Equal(HttpStatusCode.OK, active.StatusCode);
        Assert.Equal(JsonValueKind.Array, (await active.Content.ReadFromJsonAsync<JsonElement>()).ValueKind);
        Assert.Equal(HttpStatusCode.OK, byId.StatusCode);
        Assert.Equal(ids[0], (await byId.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32());
    }
}
