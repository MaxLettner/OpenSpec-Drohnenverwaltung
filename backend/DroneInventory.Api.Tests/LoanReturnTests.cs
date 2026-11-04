using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-008 "Return a loan" and REQ-009 "Store the return date" (specs/loan).</summary>
public class LoanReturnTests
{
    private static async Task<int> CreateAsync(HttpClient client, string url, object body)
    {
        var response = await client.PostAsJsonAsync(url, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    private static async Task<(int DroneId, int GroupId, int LoanId)> LoanAsync(HttpClient client)
    {
        var droneId = await CreateAsync(client, "/api/drones", new { name = "TELLO-07" });
        var groupId = await CreateAsync(client, "/api/student-groups", new { name = "Group 3" });
        var loanId = await CreateAsync(client, "/api/loans", new
        {
            droneId,
            studentGroupId = groupId,
            items = new object[] { new { type = "Propeller", quantity = 8 }, new { type = "Battery", quantity = 4 } },
        });
        return (droneId, groupId, loanId);
    }

    private static async Task<string> AvailabilityAsync(HttpClient client, int droneId)
    {
        var drones = await client.GetFromJsonAsync<JsonElement>("/api/drones");
        return drones.EnumerateArray().Single(d => d.GetProperty("id").GetInt32() == droneId)
            .GetProperty("availability").GetString()!;
    }

    private static async Task AssertProblemAsync(HttpResponseMessage response, HttpStatusCode status, string? detail = null)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal((int)status, problem.GetProperty("status").GetInt32());
        if (detail is not null)
        {
            Assert.Equal(detail, problem.GetProperty("detail").GetString());
        }
    }

    [Fact]
    public async Task REQ_008_Return_a_loan()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId, loanId) = await LoanAsync(client);
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
        var (_, _, loanId) = await LoanAsync(client);

        var response = await client.PostAsJsonAsync($"/api/loans/{loanId}/return", new { });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task REQ_008_Return_twice_is_rejected()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (_, _, loanId) = await LoanAsync(client);
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

        await AssertProblemAsync(response, HttpStatusCode.Conflict, $"Loan {loanId} is already returned.");
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

        await AssertProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task REQ_008_Non_integer_loan_id_is_a_404_problem()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();

        await AssertProblemAsync(await client.PostAsync("/api/loans/abc/return", null), HttpStatusCode.NotFound);
        await AssertProblemAsync(await client.GetAsync("/api/loans/abc"), HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task REQ_008_Drone_can_be_loaned_again_after_return()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId, loanId) = await LoanAsync(client);
        var group1 = await CreateAsync(client, "/api/student-groups", new { name = "Group 1" });
        await client.PostAsync($"/api/loans/{loanId}/return", null);
        var returned = await client.GetFromJsonAsync<JsonElement>($"/api/loans/{loanId}");

        var newId = await CreateAsync(client, "/api/loans", new { droneId, studentGroupId = group1 });

        Assert.NotEqual(loanId, newId);
        var added = await client.GetFromJsonAsync<JsonElement>($"/api/loans/{newId}");
        Assert.Equal("Active", added.GetProperty("status").GetString());
        Assert.Equal(droneId, added.GetProperty("droneId").GetInt32());
        Assert.Equal(group1, added.GetProperty("studentGroupId").GetInt32());
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
        var (_, _, loanId) = await LoanAsync(client);

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
        var (_, _, loanId) = await LoanAsync(client);

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

        await AssertProblemAsync(await client.GetAsync("/api/loans/999"), HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task REQ_009_Same_day_return_gives_ReturnDate_equal_to_LoanDate()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (_, _, loanId) = await LoanAsync(client);

        var loan = await (await client.PostAsync($"/api/loans/{loanId}/return", null))
            .Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(loan.GetProperty("loanDate").GetString(), loan.GetProperty("returnDate").GetString());
    }

    [Fact]
    public async Task REQ_009_ReturnDate_is_never_before_a_future_LoanDate()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (_, _, loanId) = await LoanAsync(client);
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
