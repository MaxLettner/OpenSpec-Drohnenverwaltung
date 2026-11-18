using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-001 "Edit a drone" (specs/drone). Each test gets its own empty database.</summary>
public class DroneEditTests
{
    private static Task<HttpResponseMessage> PutAsync(HttpClient client, int id, object body) =>
        client.PutAsJsonAsync($"/api/drones/{id}", body);

    [Fact]
    public async Task REQ_001_Rename_a_drone()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        await TestApi.SeedLoansAsync(factory,
            new LoanSeed("TELLO-07", "Group 3", new(2026, 3, 1), new(2026, 3, 2)));
        var id = (await client.GetFromJsonAsync<JsonElement[]>("/api/drones"))![0].GetProperty("id").GetInt32();

        var response = await PutAsync(client, id, new { name = "TELLO-07B", description = "New propeller guard" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(id, updated.GetProperty("id").GetInt32());
        Assert.Equal("TELLO-07B", updated.GetProperty("name").GetString());
        Assert.Equal("New propeller guard", updated.GetProperty("description").GetString());
        Assert.Equal("Available", updated.GetProperty("availability").GetString());
        Assert.Equal(JsonValueKind.Null, updated.GetProperty("activeLoanId").ValueKind);

        var list = await client.GetFromJsonAsync<JsonElement[]>("/api/drones");
        var listed = Assert.Single(list!);
        Assert.Equal("TELLO-07B", listed.GetProperty("name").GetString());
        Assert.Equal("New propeller guard", listed.GetProperty("description").GetString());
        var history = await client.GetFromJsonAsync<JsonElement[]>("/api/loans/history");
        Assert.Equal("TELLO-07B", Assert.Single(history!).GetProperty("drone").GetString());
    }

    [Fact]
    public async Task REQ_001_Name_taken_by_another_drone()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-07" });
        var other = await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-08" });

        var response = await PutAsync(client, other, new { name = "tello-07" });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.Conflict);
        var drones = await client.GetFromJsonAsync<JsonElement[]>("/api/drones");
        Assert.Equal(["TELLO-07", "TELLO-08"], drones!.Select(d => d.GetProperty("name").GetString()));
    }

    [Fact]
    public async Task REQ_001_Edit_may_change_only_the_case_of_the_own_name()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-07" });

        var response = await PutAsync(client, id, new { name = "tello-07" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task REQ_001_Invalid_name_is_rejected_on_edit(string? name)
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-07", description = "spare" });

        var response = await PutAsync(client, id, new { name, description = "changed" });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.BadRequest);
        var drone = Assert.Single((await client.GetFromJsonAsync<JsonElement[]>("/api/drones"))!);
        Assert.Equal("TELLO-07", drone.GetProperty("name").GetString());
        Assert.Equal("spare", drone.GetProperty("description").GetString());
    }

    [Fact]
    public async Task REQ_001_Too_long_name_and_description_are_rejected_on_edit()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-07" });

        await TestApi.AssertProblemAsync(
            await PutAsync(client, id, new { name = new string('x', 101) }), HttpStatusCode.BadRequest);
        await TestApi.AssertProblemAsync(
            await PutAsync(client, id, new { name = "TELLO-07", description = new string('d', 501) }),
            HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task REQ_001_Name_and_description_are_trimmed_on_edit()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var id = await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-07", description = "old" });

        var response = await PutAsync(client, id, new { name = "  TELLO-09 ", description = "   " });

        var updated = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("TELLO-09", updated.GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, updated.GetProperty("description").ValueKind);
    }

    [Fact]
    public async Task REQ_001_Edit_an_unknown_drone_is_not_found()
    {
        using var factory = new ApiFactory();

        var response = await PutAsync(factory.CreateClient(), 999, new { name = "TELLO-99" });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.NotFound);
    }
}
