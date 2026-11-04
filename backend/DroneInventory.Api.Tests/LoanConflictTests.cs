using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-005 "One active loan per drone" (specs/loan).</summary>
public class LoanConflictTests
{
    private static async Task<int> CreateAsync(HttpClient client, string url, object body)
    {
        var response = await client.PostAsJsonAsync(url, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    private static async Task<List<Loan>> LoansAsync(ApiFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Loans.AsNoTracking().ToListAsync();
    }

    private static async Task AssertConflictAsync(HttpResponseMessage response, int droneId)
    {
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(409, problem.GetProperty("status").GetInt32());
        Assert.Equal($"Drone {droneId} is not available.", problem.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task REQ_005_Reject_a_second_loan()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var droneId = await CreateAsync(client, "/api/drones", new { name = "TELLO-07" });
        var group1 = await CreateAsync(client, "/api/student-groups", new { name = "Group 1" });
        var group2 = await CreateAsync(client, "/api/student-groups", new { name = "Group 2" });
        var firstId = await CreateAsync(client, "/api/loans", new { droneId, studentGroupId = group1 });

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = group2 });

        await AssertConflictAsync(response, droneId);
        var loan = Assert.Single(await LoansAsync(factory));
        Assert.Equal(firstId, loan.Id);
        Assert.Equal(group1, loan.StudentGroupId);
        Assert.Equal(LoanStatus.Active, loan.Status);
        Assert.Null(loan.ReturnDate);
    }

    [Fact]
    public async Task REQ_005_Reject_an_unavailable_drone()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var droneId = await CreateAsync(client, "/api/drones", new { name = "TELLO-07" });
        var group1 = await CreateAsync(client, "/api/student-groups", new { name = "Group 1" });
        await CreateAsync(client, "/api/loans", new { droneId, studentGroupId = group1 });
        var drones = await client.GetFromJsonAsync<JsonElement>("/api/drones");
        Assert.Equal("Loaned", drones[0].GetProperty("availability").GetString());

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = group1 });

        await AssertConflictAsync(response, droneId);
        Assert.Single(await LoansAsync(factory));
    }

    [Fact]
    public async Task REQ_005_Simultaneous_loan_attempts_the_constraint_decides()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var droneId = await CreateAsync(client, "/api/drones", new { name = "TELLO-07" });
        var group1 = await CreateAsync(client, "/api/student-groups", new { name = "Group 1" });
        var group2 = await CreateAsync(client, "/api/student-groups", new { name = "Group 2" });
        // The service's pre-check sees no active loan; right before its INSERT the other request "wins".
        factory.BeforeNextSaveChanges = connection =>
        {
            using var command = connection.CreateCommand();
            command.CommandText =
                "INSERT INTO Loans (DroneId, StudentGroupId, Status, LoanDate) " +
                $"VALUES ({droneId}, {group2}, 'Active', '2026-03-15')";
            command.ExecuteNonQuery();
        };

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = group1 });

        await AssertConflictAsync(response, droneId);
        var loan = Assert.Single(await LoansAsync(factory));
        Assert.Equal(group2, loan.StudentGroupId);
        Assert.Equal(LoanStatus.Active, loan.Status);
    }

    [Fact]
    public async Task REQ_005_A_returned_loan_does_not_block_a_new_loan()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var droneId = await CreateAsync(client, "/api/drones", new { name = "TELLO-07" });
        var group1 = await CreateAsync(client, "/api/student-groups", new { name = "Group 1" });
        var group2 = await CreateAsync(client, "/api/student-groups", new { name = "Group 2" });
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Loans.Add(new Loan
            {
                DroneId = droneId,
                StudentGroupId = group1,
                Status = LoanStatus.Returned,
                LoanDate = new DateOnly(2026, 3, 1),
                ReturnDate = new DateOnly(2026, 3, 2),
            });
            await db.SaveChangesAsync();
        }

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = group2 });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var loans = await LoansAsync(factory);
        Assert.Equal(2, loans.Count);
        Assert.Single(loans, l => l.Status == LoanStatus.Active && l.StudentGroupId == group2);
    }
}
