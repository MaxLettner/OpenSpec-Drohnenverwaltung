using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-001 "Create a drone" (specs/drone). Each test gets its own empty database.</summary>
public class DroneCreateTests
{
    private static Task<HttpResponseMessage> PostAsync(HttpClient client, object body) =>
        client.PostAsJsonAsync("/api/drones", body);

    private static async Task<string?> DescriptionOfAsync(ApiFactory factory, string name)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (await db.Drones.SingleAsync(d => d.Name == name)).Description;
    }

    [Fact]
    public async Task REQ_001_Create_a_drone()
    {
        const string description = "SSID: TELLO-9FA21B, right propeller guard damaged";
        using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var response = await PostAsync(client, new { name = "TELLO-07", description });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetInt32();
        Assert.True(id > 0);
        Assert.Equal("TELLO-07", created.GetProperty("name").GetString());
        Assert.Equal(description, created.GetProperty("description").GetString());
        Assert.Equal($"/api/drones/{id}", response.Headers.Location?.ToString());
        Assert.Equal(1, await TestApi.CountAsync<Drone>(factory, "TELLO-07"));
        Assert.Equal(description, await DescriptionOfAsync(factory, "TELLO-07"));
    }

    [Fact]
    public void REQ_001_Drone_has_no_status_or_availability_column()
    {
        using var factory = new ApiFactory();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var properties = db.Model.FindEntityType(typeof(Drone))!
            .GetProperties().Select(p => p.Name).ToArray();

        // Availability follows from the loan (design D2), so the drone must not carry it as data.
        Assert.DoesNotContain(properties, p =>
            p.Contains("Status", StringComparison.OrdinalIgnoreCase) ||
            p.Contains("Availab", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task REQ_001_Description_is_optional()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var response = await PostAsync(client, new { name = "TELLO-08" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, created.GetProperty("description").ValueKind);
        Assert.Equal(1, await TestApi.CountAsync<Drone>(factory, "TELLO-08"));
        Assert.Null(await DescriptionOfAsync(factory, "TELLO-08"));
    }

    [Fact]
    public async Task REQ_001_Status_is_not_an_input()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var before = await TestApi.CountAsync<Drone>(factory);

        var response = await PostAsync(client, new { name = "TELLO-S", status = "Loaned" });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal(before, await TestApi.CountAsync<Drone>(factory));
        Assert.Equal(0, await TestApi.CountAsync<Drone>(factory, "TELLO-S"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task REQ_001_Blank_name_is_rejected(string? name)
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var before = await TestApi.CountAsync<Drone>(factory);

        var response = await PostAsync(client, new { name });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal(before, await TestApi.CountAsync<Drone>(factory));
    }

    [Fact]
    public async Task REQ_001_Name_and_description_are_trimmed()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var response = await PostAsync(client, new { name = "  TELLO-09 ", description = "  spare unit " });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("TELLO-09", created.GetProperty("name").GetString());
        Assert.Equal("spare unit", created.GetProperty("description").GetString());
        Assert.Equal("spare unit", await DescriptionOfAsync(factory, "TELLO-09"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task REQ_001_Blank_description_is_stored_as_empty(string description)
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var name = $"TELLO-10-{description.Length}";

        var response = await PostAsync(client, new { name, description });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, created.GetProperty("description").ValueKind);
        Assert.Null(await DescriptionOfAsync(factory, name));
    }

    [Fact]
    public async Task REQ_001_Too_long_name_is_rejected()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var before = await TestApi.CountAsync<Drone>(factory);

        var response = await PostAsync(client, new { name = new string('x', 101) });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal(before, await TestApi.CountAsync<Drone>(factory));
    }

    [Fact]
    public async Task REQ_001_Name_of_100_characters_is_accepted()
    {
        using var factory = new ApiFactory();

        var response = await PostAsync(factory.CreateClient(), new { name = new string('y', 100) });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task REQ_001_Too_long_description_is_rejected()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var before = await TestApi.CountAsync<Drone>(factory);

        var response = await PostAsync(client, new { name = "TELLO-11", description = new string('d', 501) });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal(before, await TestApi.CountAsync<Drone>(factory));
        Assert.Equal(0, await TestApi.CountAsync<Drone>(factory, "TELLO-11"));
    }

    [Fact]
    public async Task REQ_001_Description_of_500_characters_is_accepted()
    {
        using var factory = new ApiFactory();

        var response = await PostAsync(
            factory.CreateClient(), new { name = "TELLO-12", description = new string('d', 500) });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Theory]
    [InlineData("TELLO-13", "TELLO-13")]
    [InlineData("TELLO-14", "tello-14")]
    [InlineData("TELLO-15", " tello-15 ")]
    public async Task REQ_001_Duplicate_name_is_rejected_ignoring_case(string first, string second)
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Created, (await PostAsync(client, new { name = first })).StatusCode);
        var before = await TestApi.CountAsync<Drone>(factory);

        var response = await PostAsync(client, new { name = second });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.Conflict);
        Assert.Equal(before, await TestApi.CountAsync<Drone>(factory));
        Assert.Equal(1, await TestApi.CountAsync<Drone>(factory, first));
    }
}
