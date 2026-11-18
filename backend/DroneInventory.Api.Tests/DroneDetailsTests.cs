using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>Drone spec "Show drone details" (REQ-002, REQ-007, REQ-010); today is <see cref="ApiFactory.Today"/>.</summary>
public class DroneDetailsTests
{
    private static async Task<JsonElement> GetAsync(ApiFactory factory, string droneName)
    {
        var client = factory.CreateClient();
        var drones = await client.GetFromJsonAsync<JsonElement[]>("/api/drones");
        var id = drones!.Single(d => d.GetProperty("name").GetString() == droneName).GetProperty("id").GetInt32();
        var response = await client.GetAsync($"/api/drones/{id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    [Fact]
    public async Task REQ_007_Details_of_a_loaned_drone()
    {
        using var factory = new ApiFactory();
        var ids = await TestApi.SeedLoansAsync(factory,
            new LoanSeed("TELLO-02", "Group 1", new(2026, 3, 10), null, Batteries: 2, Propellers: 4));

        var details = await GetAsync(factory, "TELLO-02");

        Assert.Equal("TELLO-02", details.GetProperty("name").GetString());
        Assert.Equal("Loaned", details.GetProperty("availability").GetString());
        var active = details.GetProperty("activeLoan");
        Assert.Equal(ids[0], active.GetProperty("id").GetInt32());
        Assert.Equal("Group 1", active.GetProperty("group").GetString());
        Assert.Equal("2026-03-10", active.GetProperty("loanDate").GetString());
        Assert.Equal(5, active.GetProperty("daysOut").GetInt32());
        Assert.Equal(2, active.GetProperty("batteries").GetInt32());
        Assert.Equal(4, active.GetProperty("propellers").GetInt32());
        Assert.True(active.GetProperty("studentGroupId").GetInt32() > 0);
        Assert.Empty(details.GetProperty("recentLoans").EnumerateArray());
    }

    [Fact]
    public async Task REQ_010_Details_of_an_available_drone()
    {
        using var factory = new ApiFactory();
        var drone = await TestApi.CreateAsync(factory.CreateClient(), "/api/drones", new { name = "TELLO-07", description = "spare" });
        var group = await TestApi.CreateAsync(factory.CreateClient(), "/api/student-groups", new { name = "Group 3" });
        await SeedReturnedLoansAsync(factory, drone, group, count: 6);

        var details = await GetAsync(factory, "TELLO-07");

        Assert.Equal("Available", details.GetProperty("availability").GetString());
        Assert.Equal("spare", details.GetProperty("description").GetString());
        Assert.Equal(JsonValueKind.Null, details.GetProperty("activeLoan").ValueKind);
        var returnDates = details.GetProperty("recentLoans").EnumerateArray()
            .Select(l => l.GetProperty("returnDate").GetString()).ToArray();
        Assert.Equal(["2026-03-07", "2026-03-06", "2026-03-05", "2026-03-04", "2026-03-03"], returnDates);
        var latest = details.GetProperty("recentLoans")[0];
        Assert.Equal("Group 3", latest.GetProperty("group").GetString());
        Assert.Equal(group, latest.GetProperty("studentGroupId").GetInt32());
        Assert.Equal("2026-03-06", latest.GetProperty("loanDate").GetString());
    }

    [Fact]
    public async Task REQ_002_Unknown_drone_is_not_found()
    {
        using var factory = new ApiFactory();

        var response = await factory.CreateClient().GetAsync("/api/drones/999");

        await TestApi.AssertProblemAsync(response, HttpStatusCode.NotFound);
    }

    /// <summary>Returned loans of the drone, the n-th loaned on 1.3.+n and returned a day later.</summary>
    private static async Task SeedReturnedLoansAsync(ApiFactory factory, int droneId, int groupId, int count)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        for (var n = 0; n < count; n++)
        {
            db.Loans.Add(new Loan
            {
                DroneId = droneId,
                StudentGroupId = groupId,
                LoanDate = new DateOnly(2026, 3, 1 + n),
                ReturnDate = new DateOnly(2026, 3, 2 + n),
                Status = LoanStatus.Returned,
            });
        }

        await db.SaveChangesAsync();
    }
}
