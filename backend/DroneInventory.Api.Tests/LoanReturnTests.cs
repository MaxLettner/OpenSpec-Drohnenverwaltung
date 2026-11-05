using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-008 "Return a loan" and REQ-009 "Store the return date" (specs/loan). Each test gets its own database.</summary>
public class LoanReturnTests
{
    private static async Task<string> AvailabilityAsync(HttpClient client, int droneId)
    {
        var drones = await client.GetFromJsonAsync<JsonElement>("/api/drones");
        return drones.EnumerateArray().Single(d => d.GetProperty("id").GetInt32() == droneId)
            .GetProperty("availability").GetString()!;
    }

    [Fact]
    public async Task REQ_008_Return_a_loan()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        var loanId = await TestApi.CreateLoanAsync(client, droneId, groupId, ("Propeller", 8), ("Battery", 4));
        Assert.Equal("Loaned", await AvailabilityAsync(client, droneId));

        var response = await client.PostAsync($"/api/loans/{loanId}/return", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var loan = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Returned", loan.GetProperty("status").GetString());
        Assert.Equal(loanId, loan.GetProperty("id").GetInt32());
        Assert.Equal(droneId, loan.GetProperty("droneId").GetInt32());
        Assert.Equal(groupId, loan.GetProperty("studentGroupId").GetInt32());
        Assert.Equal(ApiFactory.Today.ToString("yyyy-MM-dd"), loan.GetProperty("loanDate").GetString());
        var items = loan.GetProperty("items");
        Assert.Equal(2, items.GetArrayLength());
        Assert.Equal("Battery", items[0].GetProperty("type").GetString());
        Assert.Equal(4, items[0].GetProperty("quantity").GetInt32());
        Assert.Equal("Propeller", items[1].GetProperty("type").GetString());
        Assert.Equal(8, items[1].GetProperty("quantity").GetInt32());
        Assert.Equal("Available", await AvailabilityAsync(client, droneId));

        var stored = await client.GetFromJsonAsync<JsonElement>($"/api/loans/{loanId}");
        Assert.Equal("Returned", stored.GetProperty("status").GetString());
    }

    [Fact]
    public async Task REQ_008_Return_with_an_empty_json_body()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        var loanId = await TestApi.CreateLoanAsync(client, droneId, groupId);

        var response = await client.PostAsJsonAsync($"/api/loans/{loanId}/return", new { });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task REQ_008_Return_twice_is_rejected()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        var loanId = await TestApi.CreateLoanAsync(client, droneId, groupId);
        await client.PostAsync($"/api/loans/{loanId}/return", null);
        // Move the stored ReturnDate away from "today" to prove a rejected second return leaves it alone.
        var original = new DateOnly(2026, 3, 14);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            (await db.Loans.SingleAsync()).ReturnDate = original;
            await db.SaveChangesAsync();
        }

        var response = await client.PostAsync($"/api/loans/{loanId}/return", null);

        await TestApi.AssertProblemAsync(response, HttpStatusCode.Conflict);
        var stored = await client.GetFromJsonAsync<JsonElement>($"/api/loans/{loanId}");
        Assert.Equal("Returned", stored.GetProperty("status").GetString());
        Assert.Equal("2026-03-14", stored.GetProperty("returnDate").GetString());
    }

    [Fact]
    public async Task REQ_008_Return_of_an_unknown_loan()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var response = await client.PostAsync("/api/loans/999/return", null);

        await TestApi.AssertProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task REQ_008_Non_integer_loan_id_is_a_404_problem()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();

        await TestApi.AssertProblemAsync(
            await client.PostAsync("/api/loans/abc/return", null), HttpStatusCode.NotFound);
        await TestApi.AssertProblemAsync(await client.GetAsync("/api/loans/abc"), HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task REQ_008_Drone_can_be_loaned_again_after_return()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        var loanId = await TestApi.CreateLoanAsync(client, droneId, groupId);
        var otherGroup = await TestApi.CreateAsync(client, "/api/student-groups", new { name = "Group 1" });
        await client.PostAsync($"/api/loans/{loanId}/return", null);
        var returned = await client.GetFromJsonAsync<JsonElement>($"/api/loans/{loanId}");

        var newId = await TestApi.CreateLoanAsync(client, droneId, otherGroup);

        Assert.NotEqual(loanId, newId);
        var added = await client.GetFromJsonAsync<JsonElement>($"/api/loans/{newId}");
        Assert.Equal("Active", added.GetProperty("status").GetString());
        Assert.Equal(droneId, added.GetProperty("droneId").GetInt32());
        Assert.Equal(otherGroup, added.GetProperty("studentGroupId").GetInt32());
        var unchanged = await client.GetFromJsonAsync<JsonElement>($"/api/loans/{loanId}");
        Assert.Equal(returned.GetRawText(), unchanged.GetRawText());
        Assert.Equal(groupId, unchanged.GetProperty("studentGroupId").GetInt32());
        Assert.Equal("Loaned", await AvailabilityAsync(client, droneId));
    }

    [Fact]
    public async Task REQ_009_ReturnDate_is_set_on_return()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        var loanId = await TestApi.CreateLoanAsync(client, droneId, groupId);

        var loan = await (await client.PostAsync($"/api/loans/{loanId}/return", null))
            .Content.ReadFromJsonAsync<JsonElement>();

        var returnDate = DateOnly.Parse(loan.GetProperty("returnDate").GetString()!);
        Assert.Equal(ApiFactory.Today, returnDate);
        Assert.True(returnDate >= DateOnly.Parse(loan.GetProperty("loanDate").GetString()!));
    }

    [Fact]
    public async Task REQ_009_Active_loan_has_no_return_date()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        var loanId = await TestApi.CreateLoanAsync(client, droneId, groupId);

        var response = await client.GetAsync($"/api/loans/{loanId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var loan = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Active", loan.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, loan.GetProperty("returnDate").ValueKind);
    }

    [Fact]
    public async Task REQ_009_Get_of_an_unknown_loan()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();

        await TestApi.AssertProblemAsync(await client.GetAsync("/api/loans/999"), HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task REQ_009_Same_day_return_gives_ReturnDate_equal_to_LoanDate()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        var loanId = await TestApi.CreateLoanAsync(client, droneId, groupId);

        var loan = await (await client.PostAsync($"/api/loans/{loanId}/return", null))
            .Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(loan.GetProperty("loanDate").GetString(), loan.GetProperty("returnDate").GetString());
    }

    [Fact]
    public async Task REQ_008_REQ_009_Simultaneous_returns_the_conditional_update_decides()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        var loanId = await TestApi.CreateLoanAsync(client, droneId, groupId);
        // The service's update sees an Active loan; right before it the other return "wins"
        // with a ReturnDate different from the one the service would write (today).
        factory.BeforeNextNonQuery = connection =>
        {
            using var command = connection.CreateCommand();
            command.CommandText =
                $"UPDATE Loans SET Status = 'Returned', ReturnDate = '2026-03-14' WHERE Id = {loanId}";
            Assert.Equal(1, command.ExecuteNonQuery());
        };

        var response = await client.PostAsync($"/api/loans/{loanId}/return", null);

        await TestApi.AssertProblemAsync(response, HttpStatusCode.Conflict);
        var stored = await client.GetFromJsonAsync<JsonElement>($"/api/loans/{loanId}");
        Assert.Equal("Returned", stored.GetProperty("status").GetString());
        Assert.Equal("2026-03-14", stored.GetProperty("returnDate").GetString());
    }

    [Fact]
    public async Task REQ_008_REQ_009_Simultaneous_returns_in_parallel_give_one_success_and_one_conflict()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        var loanId = await TestApi.CreateLoanAsync(client, droneId, groupId);

        var responses = await Task.WhenAll(
            client.PostAsync($"/api/loans/{loanId}/return", null),
            client.PostAsync($"/api/loans/{loanId}/return", null));

        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.OK);
        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Conflict);
        var stored = await client.GetFromJsonAsync<JsonElement>($"/api/loans/{loanId}");
        Assert.Equal("Returned", stored.GetProperty("status").GetString());
        Assert.Equal(ApiFactory.Today.ToString("yyyy-MM-dd"), stored.GetProperty("returnDate").GetString());
    }

    [Fact]
    public async Task REQ_009_ReturnDate_is_never_before_a_future_LoanDate()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        var loanId = await TestApi.CreateLoanAsync(client, droneId, groupId);
        var future = ApiFactory.Today.AddDays(5);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            (await db.Loans.SingleAsync()).LoanDate = future;
            await db.SaveChangesAsync();
        }

        var loan = await (await client.PostAsync($"/api/loans/{loanId}/return", null))
            .Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(future.ToString("yyyy-MM-dd"), loan.GetProperty("returnDate").GetString());
        Assert.Equal(future.ToString("yyyy-MM-dd"), loan.GetProperty("loanDate").GetString());
    }
}
