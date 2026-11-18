using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>Dashboard spec (REQ-002, REQ-006, REQ-007, REQ-010); today is <see cref="ApiFactory.Today"/>, 15.03.2026.</summary>
public class DashboardTests
{
    private static async Task<JsonElement> GetAsync(ApiFactory factory)
    {
        var response = await factory.CreateClient().GetAsync("/api/dashboard");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static int Int(JsonElement e, string a, string? b = null) =>
        (b is null ? e.GetProperty(a) : e.GetProperty(a).GetProperty(b)).GetInt32();

    [Fact]
    public async Task REQ_002_Figures_match_the_data()
    {
        using var factory = new ApiFactory();
        await TestApi.SeedLoansAsync(factory,
            new LoanSeed("TELLO-02", "Group 1", new(2026, 3, 10), null),
            new LoanSeed("TELLO-07", "Group 2", new(2026, 3, 1), new(2026, 3, 2)));
        await TestApi.CreateAsync(factory.CreateClient(), "/api/drones", new { name = "TELLO-08" });

        var dashboard = await GetAsync(factory);

        Assert.Equal(3, Int(dashboard, "drones", "total"));
        Assert.Equal(2, Int(dashboard, "drones", "available"));
        Assert.Equal(1, Int(dashboard, "drones", "loaned"));
        Assert.Equal(2, Int(dashboard, "studentGroups"));
        Assert.Equal(1, Int(dashboard, "loans", "active"));
        Assert.Equal(1, Int(dashboard, "loans", "returned"));
    }

    [Fact]
    public async Task REQ_002_Empty_database()
    {
        using var factory = new ApiFactory();

        var dashboard = await GetAsync(factory);

        Assert.Equal(0, Int(dashboard, "drones", "total"));
        Assert.Equal(0, Int(dashboard, "drones", "available"));
        Assert.Equal(0, Int(dashboard, "drones", "loaned"));
        Assert.Equal(0, Int(dashboard, "studentGroups"));
        Assert.Equal(0, Int(dashboard, "loans", "active"));
        Assert.Equal(0, Int(dashboard, "loans", "returned"));
        Assert.Equal(0, Int(dashboard, "accessoriesOut", "batteries"));
        Assert.Equal(0, Int(dashboard, "accessoriesOut", "propellers"));
        Assert.Empty(dashboard.GetProperty("longestActiveLoans").EnumerateArray());
        Assert.All(dashboard.GetProperty("loansPerWeek").EnumerateArray(), w => Assert.Equal(0, Int(w, "count")));
    }

    [Fact]
    public async Task REQ_006_Only_active_loans_count()
    {
        using var factory = new ApiFactory();
        await TestApi.SeedLoansAsync(factory,
            new LoanSeed("A", "G1", new(2026, 3, 10), null, Batteries: 3, Propellers: 4),
            new LoanSeed("B", "G2", new(2026, 3, 10), null, Batteries: 2),
            new LoanSeed("C", "G3", new(2026, 3, 1), new(2026, 3, 2), Batteries: 5));

        var dashboard = await GetAsync(factory);

        Assert.Equal(5, Int(dashboard, "accessoriesOut", "batteries"));
        Assert.Equal(4, Int(dashboard, "accessoriesOut", "propellers"));
    }

    [Fact]
    public async Task REQ_007_Oldest_loans_first()
    {
        using var factory = new ApiFactory();
        await TestApi.SeedLoansAsync(factory, [.. Enumerable.Range(1, 6).Reverse()
            .Select(day => new LoanSeed($"D{day}", $"G{day}", new(2026, 3, day), null))]);

        var rows = (await GetAsync(factory)).GetProperty("longestActiveLoans").EnumerateArray().ToArray();

        Assert.Equal(5, rows.Length);
        Assert.Equal("2026-03-01", rows[0].GetProperty("loanDate").GetString());
        Assert.Equal(14, Int(rows[0], "daysOut"));
        Assert.Equal("D1", rows[0].GetProperty("drone").GetString());
        Assert.Equal("G1", rows[0].GetProperty("group").GetString());
        Assert.DoesNotContain(rows, r => r.GetProperty("loanDate").GetString() == "2026-03-06");
    }

    [Fact]
    public async Task REQ_010_Loans_counted_by_week()
    {
        using var factory = new ApiFactory();
        await TestApi.SeedLoansAsync(factory,
            new LoanSeed("A", "G1", new(2026, 3, 9), null),
            new LoanSeed("B", "G2", new(2026, 3, 15), null),
            new LoanSeed("C", "G3", new(2026, 3, 2), new(2026, 3, 3)),
            new LoanSeed("D", "G4", new(2026, 1, 18), new(2026, 1, 19)));

        var weeks = (await GetAsync(factory)).GetProperty("loansPerWeek").EnumerateArray()
            .ToDictionary(w => w.GetProperty("weekStart").GetString()!, w => Int(w, "count"));

        Assert.Equal(8, weeks.Count);
        Assert.Equal("2026-01-19", weeks.Keys.First());
        Assert.Equal("2026-03-09", weeks.Keys.Last());
        Assert.Equal(2, weeks["2026-03-09"]);
        Assert.Equal(1, weeks["2026-03-02"]);
        // The loan of 18.01.2026 lies before the first week.
        Assert.Equal(3, weeks.Values.Sum());
    }
}
