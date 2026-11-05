using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-001 "Create a drone" (specs/drone).</summary>
public class DroneCreateTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private async Task<int> CountAsync(string? nameFilter = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return nameFilter is null
            ? await db.Drones.CountAsync()
            : await db.Drones.CountAsync(d => d.Name == nameFilter);
    }

    private async Task<string?> DescriptionOfAsync(string name)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (await db.Drones.SingleAsync(d => d.Name == name)).Description;
    }

    private Task<HttpResponseMessage> PostAsync(object body) =>
        factory.CreateClient().PostAsJsonAsync("/api/drones", body);

    [Fact]
    public async Task REQ_001_Create_a_drone()
    {
        const string description = "SSID: TELLO-9FA21B, right propeller guard damaged";

        var response = await PostAsync(new { name = "TELLO-07", description });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetInt32();
        Assert.True(id > 0);
        Assert.Equal("TELLO-07", created.GetProperty("name").GetString());
        Assert.Equal(description, created.GetProperty("description").GetString());
        Assert.Equal($"/api/drones/{id}", response.Headers.Location?.ToString());
        Assert.Equal(1, await CountAsync("TELLO-07"));
        Assert.Equal(description, await DescriptionOfAsync("TELLO-07"));
    }

    [Fact]
    public void REQ_001_Drone_has_no_status_or_availability_column()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var properties = db.Model.FindEntityType(typeof(Drone))!
            .GetProperties().Select(p => p.Name).ToArray();

        Assert.Equivalent(new[] { "Id", "Name", "Description" }, properties);
        Assert.DoesNotContain(properties, p => p.Contains("Status") || p.Contains("Availab"));
    }

    [Fact]
    public async Task REQ_001_Description_is_optional()
    {
        var response = await PostAsync(new { name = "TELLO-08" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, created.GetProperty("description").ValueKind);
        Assert.Equal(1, await CountAsync("TELLO-08"));
        Assert.Null(await DescriptionOfAsync("TELLO-08"));
    }

    [Fact]
    public async Task REQ_001_Status_is_not_an_input()
    {
        var before = await CountAsync();

        var response = await PostAsync(new { name = "TELLO-S", status = "Loaned" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(before, await CountAsync());
        Assert.Equal(0, await CountAsync("TELLO-S"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task REQ_001_Blank_name_is_rejected(string? name)
    {
        var before = await CountAsync();

        var response = await PostAsync(new { name });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(before, await CountAsync());
    }

    [Fact]
    public async Task REQ_001_Name_and_description_are_trimmed()
    {
        var response = await PostAsync(new { name = "  TELLO-09 ", description = "  spare unit " });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("TELLO-09", created.GetProperty("name").GetString());
        Assert.Equal("spare unit", created.GetProperty("description").GetString());
        Assert.Equal("spare unit", await DescriptionOfAsync("TELLO-09"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task REQ_001_Blank_description_is_stored_as_empty(string description)
    {
        var name = $"TELLO-10-{description.Length}";

        var response = await PostAsync(new { name, description });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Null, created.GetProperty("description").ValueKind);
        Assert.Null(await DescriptionOfAsync(name));
    }

    [Fact]
    public async Task REQ_001_Too_long_name_is_rejected()
    {
        var before = await CountAsync();

        var response = await PostAsync(new { name = new string('x', 101) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(before, await CountAsync());
    }

    [Fact]
    public async Task REQ_001_Name_of_100_characters_is_accepted()
    {
        var response = await PostAsync(new { name = new string('y', 100) });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task REQ_001_Too_long_description_is_rejected()
    {
        var before = await CountAsync();

        var response = await PostAsync(new { name = "TELLO-11", description = new string('d', 501) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(before, await CountAsync());
        Assert.Equal(0, await CountAsync("TELLO-11"));
    }

    [Fact]
    public async Task REQ_001_Description_of_500_characters_is_accepted()
    {
        var response = await PostAsync(new { name = "TELLO-12", description = new string('d', 500) });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Theory]
    [InlineData("TELLO-13", "TELLO-13")]
    [InlineData("TELLO-14", "tello-14")]
    [InlineData("TELLO-15", " tello-15 ")]
    public async Task REQ_001_Duplicate_name_is_rejected_ignoring_case(string first, string second)
    {
        Assert.Equal(HttpStatusCode.Created, (await PostAsync(new { name = first })).StatusCode);
        var before = await CountAsync();

        var response = await PostAsync(new { name = second });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(before, await CountAsync());
        Assert.Equal(1, await CountAsync(first));
    }
}
