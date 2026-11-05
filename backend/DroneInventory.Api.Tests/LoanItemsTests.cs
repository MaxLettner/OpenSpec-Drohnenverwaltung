using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-006 "Loan accessories" (specs/loan). Each test gets its own database.</summary>
public class LoanItemsTests
{
    private static Task<HttpResponseMessage> PostRawAsync(HttpClient client, string json) =>
        client.PostAsync("/api/loans", new StringContent(json, Encoding.UTF8, "application/json"));

    private static async Task<(int Loans, List<LoanItem> Items)> StoredAsync(ApiFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (await db.Loans.CountAsync(), await db.LoanItems.AsNoTracking().OrderBy(i => i.Type).ToListAsync());
    }

    /// <summary>Asserts the rejection and that nothing was stored; returns the ProblemDetails body.</summary>
    private static async Task<JsonElement> AssertRejectedAsync(ApiFactory factory, HttpResponseMessage response)
    {
        var problem = await TestApi.AssertProblemAsync(response, HttpStatusCode.BadRequest);
        var (loans, items) = await StoredAsync(factory);
        Assert.Equal(0, loans);
        Assert.Empty(items);
        return problem;
    }

    [Fact]
    public async Task REQ_006_Record_accessories_with_the_loan()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await client.PostAsJsonAsync("/api/loans", new
        {
            droneId,
            studentGroupId = groupId,
            items = new object[]
            {
                new { type = "Propeller", quantity = 8 },
                new { type = "Battery", quantity = 4 },
            },
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var items = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("items");
        Assert.Equal(2, items.GetArrayLength());
        Assert.Equal("Battery", items[0].GetProperty("type").GetString());
        Assert.Equal(4, items[0].GetProperty("quantity").GetInt32());
        Assert.Equal("Propeller", items[1].GetProperty("type").GetString());
        Assert.Equal(8, items[1].GetProperty("quantity").GetInt32());
        var (loans, stored) = await StoredAsync(factory);
        Assert.Equal(1, loans);
        Assert.Equal(
            [(LoanItemType.Battery, 4), (LoanItemType.Propeller, 8)],
            stored.Select(i => (i.Type, i.Quantity)));
    }

    [Fact]
    public async Task REQ_006_Negative_quantity_is_rejected()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await client.PostAsJsonAsync("/api/loans", new
        {
            droneId, studentGroupId = groupId, items = new[] { new { type = "Battery", quantity = -1 } },
        });

        var problem = await AssertRejectedAsync(factory, response);
        Assert.True(problem.GetProperty("errors").TryGetProperty("items[0].quantity", out _));
    }

    [Fact]
    public async Task REQ_006_Zero_quantity_is_allowed()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await client.PostAsJsonAsync("/api/loans", new
        {
            droneId, studentGroupId = groupId, items = new[] { new { type = "Battery", quantity = 0 } },
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var items = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("items");
        Assert.Equal(0, items[0].GetProperty("quantity").GetInt32());
        var (_, stored) = await StoredAsync(factory);
        var item = Assert.Single(stored);
        Assert.Equal(LoanItemType.Battery, item.Type);
        Assert.Equal(0, item.Quantity);
    }

    [Fact]
    public async Task REQ_006_Fractional_quantity_is_rejected()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await PostRawAsync(client,
            $$"""{"droneId":{{droneId}},"studentGroupId":{{groupId}},"items":[{"type":"Battery","quantity":1.5}]}""");

        await AssertRejectedAsync(factory, response);
    }

    [Fact]
    public async Task REQ_006_Unknown_accessory_type_is_rejected()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await client.PostAsJsonAsync("/api/loans", new
        {
            droneId, studentGroupId = groupId, items = new[] { new { type = "Charger", quantity = 1 } },
        });

        await AssertRejectedAsync(factory, response);
    }

    [Fact]
    public async Task REQ_006_Repeated_accessory_type_is_rejected()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await client.PostAsJsonAsync("/api/loans", new
        {
            droneId,
            studentGroupId = groupId,
            items = new[] { new { type = "Battery", quantity = 2 }, new { type = "Battery", quantity = 3 } },
        });

        var problem = await AssertRejectedAsync(factory, response);
        Assert.True(problem.GetProperty("errors").TryGetProperty("items", out _));
    }

    [Fact]
    public async Task REQ_006_Loan_without_accessories_has_no_items()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = groupId });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(0, (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("items").GetArrayLength());
        var (loans, items) = await StoredAsync(factory);
        Assert.Equal(1, loans);
        Assert.Empty(items);
    }

    [Fact]
    public async Task REQ_006_Empty_items_list_has_no_items()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await client.PostAsJsonAsync(
            "/api/loans", new { droneId, studentGroupId = groupId, items = Array.Empty<object>() });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(0, (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("items").GetArrayLength());
        var (loans, items) = await StoredAsync(factory);
        Assert.Equal(1, loans);
        Assert.Empty(items);
    }

    [Theory]
    [InlineData("""{"quantity":1}""")]
    [InlineData("""{"type":"Battery"}""")]
    [InlineData("""{"type":"Battery","quantity":null}""")]
    [InlineData("""{"type":0,"quantity":1}""")]
    [InlineData("""{"type":"Battery","quantity":"2"}""")]
    [InlineData("null")]
    public async Task REQ_006_Malformed_items_are_rejected(string item)
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await PostRawAsync(client,
            $$"""{"droneId":{{droneId}},"studentGroupId":{{groupId}},"items":[{{item}}]}""");

        await AssertRejectedAsync(factory, response);
    }
}
