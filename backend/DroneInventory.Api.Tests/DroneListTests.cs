using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-002 "Show drones" (specs/drone). Loans are seeded directly; each test gets its own database.</summary>
public class DroneListTests
{
    private static readonly DateOnly Day = new(2026, 11, 4);

    private static async Task SeedAsync(ApiFactory factory, params (string Drone, LoanStatus[] Loans)[] drones)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var group = new StudentGroup { Name = "Group 1" };
        db.StudentGroups.Add(group);
        foreach (var (name, loans) in drones)
        {
            var drone = new Drone { Name = name };
            db.Drones.Add(drone);
            await db.SaveChangesAsync();
            foreach (var status in loans)
            {
                db.Loans.Add(new Loan
                {
                    DroneId = drone.Id,
                    StudentGroupId = group.Id,
                    LoanDate = Day,
                    ReturnDate = status == LoanStatus.Returned ? Day : null,
                    Status = status,
                });
            }
        }

        await db.SaveChangesAsync();
    }

    private static async Task<JsonElement[]> ListAsync(ApiFactory factory)
    {
        var response = await factory.CreateClient().GetAsync("/api/drones");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement[]>())!;
    }

    private static string AvailabilityOf(JsonElement[] drones, string name) =>
        drones.Single(d => d.GetProperty("name").GetString() == name).GetProperty("availability").GetString()!;

    [Fact]
    public async Task REQ_002_List_drones_with_and_without_a_loan()
    {
        using var factory = new ApiFactory();
        await SeedAsync(factory, ("TELLO-02", [LoanStatus.Active]), ("TELLO-07", []));

        var drones = await ListAsync(factory);

        Assert.Equal(2, drones.Length);
        Assert.Equal("Loaned", AvailabilityOf(drones, "TELLO-02"));
        Assert.Equal("Available", AvailabilityOf(drones, "TELLO-07"));
        Assert.All(drones, d => Assert.True(d.GetProperty("id").GetInt32() > 0));
    }

    [Fact]
    public async Task REQ_002_Response_contains_description_or_null()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        await client.PostAsJsonAsync("/api/drones", new { name = "A", description = "spare" });
        await client.PostAsJsonAsync("/api/drones", new { name = "B" });

        var drones = await client.GetFromJsonAsync<JsonElement[]>("/api/drones");

        Assert.Equal("spare", drones![0].GetProperty("description").GetString());
        Assert.Equal(JsonValueKind.Null, drones[1].GetProperty("description").ValueKind);
    }

    [Fact]
    public async Task REQ_002_Drone_is_available_again_after_return()
    {
        using var factory = new ApiFactory();
        await SeedAsync(factory, ("TELLO-07", [LoanStatus.Returned]));

        var drones = await ListAsync(factory);

        Assert.Equal("Available", AvailabilityOf(drones, "TELLO-07"));
    }

    [Fact]
    public async Task REQ_002_Drone_with_returned_and_active_loan_is_loaned()
    {
        using var factory = new ApiFactory();
        await SeedAsync(factory, ("TELLO-07", [LoanStatus.Returned, LoanStatus.Active]));

        var drones = await ListAsync(factory);

        Assert.Equal("Loaned", AvailabilityOf(drones, "TELLO-07"));
    }

    [Fact]
    public async Task REQ_002_Empty_inventory_gives_an_empty_list()
    {
        using var factory = new ApiFactory();

        var drones = await ListAsync(factory);

        Assert.Empty(drones);
    }

    [Fact]
    public async Task REQ_002_List_is_ordered_by_name_ignoring_case()
    {
        using var factory = new ApiFactory();
        await SeedAsync(factory, ("beta", []), ("Gamma", []), ("Alpha", []));

        var drones = await ListAsync(factory);

        Assert.Equal(["Alpha", "beta", "Gamma"], drones.Select(d => d.GetProperty("name").GetString()));
    }

    [Fact]
    public async Task REQ_002_Newly_created_drone_is_listed_as_available()
    {
        using var factory = new ApiFactory();
        var created = await factory.CreateClient().PostAsJsonAsync("/api/drones", new { name = "TELLO-07" });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);

        var drones = await ListAsync(factory);

        Assert.Equal("Available", AvailabilityOf(drones, "TELLO-07"));
    }
}
