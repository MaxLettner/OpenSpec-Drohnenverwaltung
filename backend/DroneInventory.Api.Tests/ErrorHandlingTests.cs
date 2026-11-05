using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace DroneInventory.Api.Tests;

/// <summary>
/// The error and JSON pipeline: every rejection leaves the API as ProblemDetails and enums travel as
/// strings with numbers rejected (design D5, REQ-001, REQ-006).
/// </summary>
public class ErrorHandlingTests
{
    private static StringContent Json(string json) => new(json, Encoding.UTF8, "application/json");

    [Fact]
    public async Task Malformed_json_body_gives_400_problem_details()
    {
        using var factory = new ApiFactory();

        var response = await factory.CreateClient().PostAsync("/api/drones", Json("{ \"name\": "));

        await TestApi.AssertProblemAsync(response, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Unknown_route_gives_404_problem_details()
    {
        using var factory = new ApiFactory();

        var response = await factory.CreateClient().GetAsync("/api/does-not-exist");

        await TestApi.AssertProblemAsync(response, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Conflict_is_returned_as_409_problem_details()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        await TestApi.CreateAsync(client, "/api/drones", new { name = "TELLO-07" });

        var response = await client.PostAsJsonAsync("/api/drones", new { name = "TELLO-07" });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Unknown_json_member_is_rejected_with_400()
    {
        using var factory = new ApiFactory();

        var response = await factory.CreateClient()
            .PostAsync("/api/drones", Json("{ \"name\": \"x\", \"status\": \"Loaned\" }"));

        await TestApi.AssertProblemAsync(response, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Enums_are_written_as_strings()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = groupId });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var loan = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Active", loan.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Unknown_enum_value_is_rejected_with_400()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await client.PostAsync("/api/loans", Json(
            $$"""{"droneId":{{droneId}},"studentGroupId":{{groupId}},"items":[{"type":"Charger","quantity":1}]}"""));

        await TestApi.AssertProblemAsync(response, HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Numeric_enum_value_is_rejected_with_400()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await client.PostAsync("/api/loans", Json(
            $$"""{"droneId":{{droneId}},"studentGroupId":{{groupId}},"items":[{"type":1,"quantity":1}]}"""));

        await TestApi.AssertProblemAsync(response, HttpStatusCode.BadRequest);
    }
}
