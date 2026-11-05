using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-010 "Retain returned loans" (specs/loan).</summary>
public class LoanRetentionTests
{
    private static async Task<int> ActiveLoanAsync(HttpClient client)
    {
        var droneId = await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-07" });
        var groupId = await TestApi.CreateAsync(client, "/api/student-groups", new { name = "Group 3" });
        return await TestApi.CreateAsync(client, "/api/loans", new
        {
            droneId,
            studentGroupId = groupId,
            items = new object[] { new { type = "Battery", quantity = 4 }, new { type = "Propeller", quantity = 8 } },
        });
    }

    private static async Task AssertLoanKeptAsync(ApiFactory factory, HttpClient client, int loanId)
    {
        var loan = await client.GetFromJsonAsync<JsonElement>($"/api/loans/{loanId}");
        Assert.Equal("Returned", loan.GetProperty("status").GetString());
        var items = loan.GetProperty("items").EnumerateArray()
            .ToDictionary(i => i.GetProperty("type").GetString()!, i => i.GetProperty("quantity").GetInt32());
        Assert.Equal(2, items.Count);
        Assert.Equal(4, items["Battery"]);
        Assert.Equal(8, items["Propeller"]);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var stored = await db.Loans.Include(l => l.Items).SingleAsync(l => l.Id == loanId);
        Assert.Equal(LoanStatus.Returned, stored.Status);
        Assert.NotNull(stored.ReturnDate);
        Assert.Equal(4, stored.Items.Single(i => i.Type == LoanItemType.Battery).Quantity);
        Assert.Equal(8, stored.Items.Single(i => i.Type == LoanItemType.Propeller).Quantity);
        Assert.Equal(2, await db.LoanItems.CountAsync(i => i.LoanId == loanId));
    }

    [Fact]
    public async Task REQ_010_Return_does_not_delete_the_loan()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var loanId = await ActiveLoanAsync(client);

        var response = await client.PostAsync($"/api/loans/{loanId}/return", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await AssertLoanKeptAsync(factory, client, loanId);
    }

    [Fact]
    public async Task REQ_010_No_way_to_delete_a_loan()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var loanId = await ActiveLoanAsync(client);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/loans/{loanId}/return", null)).StatusCode);

        var response = await client.DeleteAsync($"/api/loans/{loanId}");

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(405, problem.GetProperty("status").GetInt32());
        Assert.Contains("GET", response.Content.Headers.Allow);
        await AssertLoanKeptAsync(factory, client, loanId);
    }

    [Theory]
    [InlineData("/api/drones/1")]
    [InlineData("/api/student-groups/1")]
    [InlineData("/api/loans")]
    public async Task REQ_010_No_delete_route_for_drones_groups_or_the_loan_collection(string url)
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        await ActiveLoanAsync(client);

        var response = await client.DeleteAsync(url);

        // Drones and groups have no route with an id, so 404; /api/loans has POST, so 405.
        var expected = url == "/api/loans" ? HttpStatusCode.MethodNotAllowed : HttpStatusCode.NotFound;
        Assert.Equal(expected, response.StatusCode);
    }

    [Fact]
    public void REQ_010_No_DELETE_endpoint_is_registered()
    {
        using var factory = new ApiFactory();
        _ = factory.CreateClient();

        var deletes = factory.Services.GetRequiredService<IEnumerable<EndpointDataSource>>()
            .SelectMany(s => s.Endpoints)
            .OfType<RouteEndpoint>()
            .Where(e => e.Metadata.GetMetadata<IHttpMethodMetadata>()?.HttpMethods
                .Contains(HttpMethods.Delete, StringComparer.OrdinalIgnoreCase) == true)
            .Select(e => e.RoutePattern.RawText)
            .ToList();

        Assert.Empty(deletes);
    }
}
