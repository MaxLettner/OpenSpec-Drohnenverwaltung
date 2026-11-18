using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace DroneInventory.Api.Tests;

/// <summary>deployment spec: the database is ready on every start and survives a restart (REQ-001 to REQ-010).</summary>
public class DatabaseStartupTests
{
    private static async Task<JsonElement[]> GetAsync(HttpClient client, string url) =>
        await client.GetFromJsonAsync<JsonElement[]>(url) ?? [];

    private static IEnumerable<string?> Names(JsonElement[] rows, string property = "name") =>
        rows.Select(r => r.GetProperty(property).GetString());

    [Fact]
    public async Task First_start_in_Production_creates_an_empty_database()
    {
        using var folder = new TempDatabaseFolder();
        using var factory = new FileDatabaseFactory(folder.ConnectionString);
        var client = factory.CreateClient();

        Assert.Empty(await GetAsync(client, "/api/drones"));
        await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-07" });
        Assert.True(File.Exists(folder.DatabaseFile));
    }

    [Fact]
    public async Task Start_on_an_older_database_keeps_its_drones_and_loans()
    {
        using var folder = new TempDatabaseFolder();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(folder.ConnectionString).Options;
        await using (var old = new AppDbContext(options))
        {
            // The schema before AddRetired, filled the way that version stored its data.
            await old.GetService<IMigrator>().MigrateAsync("20261104075411_CreateLoans");
            await old.Database.ExecuteSqlRawAsync("""
                INSERT INTO Drones (Id, Name) VALUES (1, 'TELLO-07');
                INSERT INTO StudentGroups (Id, Name) VALUES (1, 'Group 3');
                INSERT INTO Loans (DroneId, StudentGroupId, LoanDate, ReturnDate, Status)
                VALUES (1, 1, '2026-08-19', '2026-08-20', 'Returned');
                """);
        }

        using var factory = new FileDatabaseFactory(folder.ConnectionString);
        var client = factory.CreateClient();

        Assert.Equal(["TELLO-07"], Names(await GetAsync(client, "/api/drones")));
        Assert.Equal(["TELLO-07"], Names(await GetAsync(client, "/api/loans/history"), "drone"));
    }

    [Fact]
    public async Task Restart_keeps_the_active_and_returned_loans()
    {
        using var folder = new TempDatabaseFolder();
        using (var first = new FileDatabaseFactory(folder.ConnectionString))
        {
            var client = first.CreateClient();
            var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
            var returnedDrone = await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-02" });
            var returned = await TestApi.CreateLoanAsync(client, returnedDrone, groupId);
            (await client.PostAsync($"/api/loans/{returned}/return", null)).EnsureSuccessStatusCode();
            await TestApi.CreateLoanAsync(client, droneId, groupId, ("Battery", 4), ("Propeller", 8));
        }

        using var second = new FileDatabaseFactory(folder.ConnectionString);
        var restarted = second.CreateClient();

        var active = Assert.Single(await GetAsync(restarted, "/api/loans/active"));
        Assert.Equal("Group 3", active.GetProperty("group").GetString());
        Assert.Equal("TELLO-07", active.GetProperty("drone").GetString());
        Assert.Equal(4, active.GetProperty("batteries").GetInt32());
        Assert.Equal(8, active.GetProperty("propellers").GetInt32());
        Assert.Equal(["TELLO-02"], Names(await GetAsync(restarted, "/api/loans/history"), "drone"));
    }
}
