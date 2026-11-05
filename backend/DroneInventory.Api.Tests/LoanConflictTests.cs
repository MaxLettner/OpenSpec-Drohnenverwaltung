using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-005 "One active loan per drone" (specs/loan). Each test gets its own database.</summary>
public class LoanConflictTests
{
    private static async Task<List<Loan>> LoansAsync(ApiFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Loans.AsNoTracking().ToListAsync();
    }

    [Fact]
    public async Task REQ_005_Reject_a_second_loan()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        var otherGroup = await TestApi.CreateAsync(client, "/api/student-groups", new { name = "Group 1" });
        var firstId = await TestApi.CreateLoanAsync(client, droneId, groupId);

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = otherGroup });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.Conflict);
        var loan = Assert.Single(await LoansAsync(factory));
        Assert.Equal(firstId, loan.Id);
        Assert.Equal(groupId, loan.StudentGroupId);
        Assert.Equal(LoanStatus.Active, loan.Status);
        Assert.Null(loan.ReturnDate);
    }

    [Fact]
    public async Task REQ_005_Reject_an_unavailable_drone()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        await TestApi.CreateLoanAsync(client, droneId, groupId);
        var drones = await client.GetFromJsonAsync<JsonElement>("/api/drones");
        Assert.Equal("Loaned", drones[0].GetProperty("availability").GetString());

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = groupId });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Single(await LoansAsync(factory));
    }

    [Fact]
    public async Task REQ_005_Simultaneous_loan_attempts_the_constraint_decides()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        var otherGroup = await TestApi.CreateAsync(client, "/api/student-groups", new { name = "Group 1" });
        // The service's pre-check sees no active loan; right before its INSERT the other request "wins".
        factory.BeforeNextSaveChanges = connection =>
        {
            using var command = connection.CreateCommand();
            command.CommandText =
                "INSERT INTO Loans (DroneId, StudentGroupId, Status, LoanDate) " +
                $"VALUES ({droneId}, {otherGroup}, 'Active', '2026-03-15')";
            command.ExecuteNonQuery();
        };

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = groupId });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.Conflict);
        var loan = Assert.Single(await LoansAsync(factory));
        Assert.Equal(otherGroup, loan.StudentGroupId);
        Assert.Equal(LoanStatus.Active, loan.Status);
    }

    [Fact]
    public async Task REQ_005_A_returned_loan_does_not_block_a_new_loan()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        var otherGroup = await TestApi.CreateAsync(client, "/api/student-groups", new { name = "Group 1" });
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Loans.Add(new Loan
            {
                DroneId = droneId,
                StudentGroupId = groupId,
                Status = LoanStatus.Returned,
                LoanDate = new DateOnly(2026, 3, 1),
                ReturnDate = new DateOnly(2026, 3, 2),
            });
            await db.SaveChangesAsync();
        }

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = otherGroup });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var loans = await LoansAsync(factory);
        Assert.Equal(2, loans.Count);
        Assert.Single(loans, l => l.Status == LoanStatus.Active && l.StudentGroupId == otherGroup);
    }
}
