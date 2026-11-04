using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-010 "Show loan history" (specs/loan). Data is seeded directly; each test gets its own database.</summary>
public class LoanHistoryTests
{
    private static readonly DateOnly Aug19 = new(2026, 8, 19);

    private record Seed(string Drone, string Group, DateOnly LoanDate, DateOnly? ReturnDate, int? Batteries, int? Propellers);

    private static async Task<int[]> SeedAsync(ApiFactory factory, params Seed[] seeds)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var ids = new List<int>();
        foreach (var s in seeds)
        {
            var drone = new Drone { Name = s.Drone };
            var group = new StudentGroup { Name = s.Group };
            db.Drones.Add(drone);
            db.StudentGroups.Add(group);
            await db.SaveChangesAsync();
            var loan = new Loan
            {
                DroneId = drone.Id,
                StudentGroupId = group.Id,
                LoanDate = s.LoanDate,
                Status = s.ReturnDate is null ? LoanStatus.Active : LoanStatus.Returned,
                ReturnDate = s.ReturnDate,
            };
            if (s.Batteries is { } b) loan.Items.Add(new LoanItem { Type = LoanItemType.Battery, Quantity = b });
            if (s.Propellers is { } p) loan.Items.Add(new LoanItem { Type = LoanItemType.Propeller, Quantity = p });
            db.Loans.Add(loan);
            await db.SaveChangesAsync();
            ids.Add(loan.Id);
        }

        return [.. ids];
    }

    private static async Task<JsonElement[]> GetListAsync(ApiFactory factory, string path)
    {
        var response = await factory.CreateClient().GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement[]>())!;
    }

    private static Task<JsonElement[]> HistoryAsync(ApiFactory factory) => GetListAsync(factory, "/api/loans/history");

    private static string Row(JsonElement r) =>
        $"{r.GetProperty("group").GetString()} | {r.GetProperty("drone").GetString()} | " +
        $"{r.GetProperty("batteries").GetInt32()} | {r.GetProperty("propellers").GetInt32()} | " +
        $"{r.GetProperty("loanDate").GetString()} | {r.GetProperty("returnDate").GetString()}";

    private static int Id(JsonElement r) => r.GetProperty("id").GetInt32();

    [Fact]
    public async Task REQ_010_Returned_loan_stays_in_history()
    {
        using var factory = new ApiFactory();
        var ids = await SeedAsync(factory, new Seed("TELLO-07", "Group 3", Aug19, Aug19.AddDays(2), 4, 8));

        var rows = await HistoryAsync(factory);

        Assert.Equal(["Group 3 | TELLO-07 | 4 | 8 | 2026-08-19 | 2026-08-21"], rows.Select(Row));
        Assert.Equal(ids[0], Id(rows[0]));
    }

    [Fact]
    public async Task REQ_010_Active_loans_are_not_in_the_history()
    {
        using var factory = new ApiFactory();
        await SeedAsync(factory,
            new Seed("TELLO-07", "Group 3", Aug19, null, 1, 2),
            new Seed("TELLO-02", "Group 1", Aug19, Aug19, 1, 2));

        var rows = await HistoryAsync(factory);

        Assert.Equal(["Group 1 | TELLO-02 | 1 | 2 | 2026-08-19 | 2026-08-19"], rows.Select(Row));
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
        await SeedAsync(factory, new Seed("TELLO-07", "Group 3", Aug19, Aug19, null, null));

        var rows = await HistoryAsync(factory);

        Assert.Equal(["Group 3 | TELLO-07 | 0 | 0 | 2026-08-19 | 2026-08-19"], rows.Select(Row));
    }

    [Fact]
    public async Task REQ_010_History_is_ordered_by_return_date_descending_then_id_descending()
    {
        using var factory = new ApiFactory();
        var ids = await SeedAsync(factory,
            new Seed("D-1", "G-1", Aug19, Aug19.AddDays(1), null, null),
            new Seed("D-2", "G-2", Aug19, Aug19.AddDays(3), null, null),
            new Seed("D-3", "G-3", Aug19, Aug19.AddDays(1), null, null));

        var rows = await HistoryAsync(factory);

        Assert.Equal([ids[1], ids[2], ids[0]], rows.Select(Id));
    }

    [Fact]
    public async Task REQ_010_Loan_returned_through_the_api_moves_from_active_to_history()
    {
        using var factory = new ApiFactory();
        int droneId, groupId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var drone = new Drone { Name = "TELLO-07" };
            var group = new StudentGroup { Name = "Group 3" };
            db.Drones.Add(drone);
            db.StudentGroups.Add(group);
            await db.SaveChangesAsync();
            droneId = drone.Id;
            groupId = group.Id;
        }

        var client = factory.CreateClient();
        var created = await client.PostAsJsonAsync("/api/loans", new
        {
            droneId,
            studentGroupId = groupId,
            items = new[] { new { type = "Battery", quantity = 4 }, new { type = "Propeller", quantity = 8 } },
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var loanId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();

        Assert.Empty(await HistoryAsync(factory));

        var returned = await client.PostAsync($"/api/loans/{loanId}/return", null);
        Assert.Equal(HttpStatusCode.OK, returned.StatusCode);

        var history = await HistoryAsync(factory);
        var row = Assert.Single(history);
        Assert.Equal(loanId, Id(row));
        Assert.Equal("Group 3", row.GetProperty("group").GetString());
        Assert.Equal("TELLO-07", row.GetProperty("drone").GetString());
        Assert.Equal(4, row.GetProperty("batteries").GetInt32());
        Assert.Equal(8, row.GetProperty("propellers").GetInt32());
        Assert.Matches(@"^\d{4}-\d{2}-\d{2}$", row.GetProperty("returnDate").GetString()!);
        Assert.Empty(await GetListAsync(factory, "/api/loans/active"));
    }

    [Fact]
    public async Task REQ_010_History_route_works_next_to_the_id_and_active_routes()
    {
        using var factory = new ApiFactory();
        var ids = await SeedAsync(factory, new Seed("TELLO-02", "Group 1", Aug19, Aug19, 3, 4));
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
