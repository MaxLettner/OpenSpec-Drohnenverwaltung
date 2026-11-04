using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using DroneInventory.Api.Api;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>
/// Task 1.2: central error handling and JSON options.
/// The API has no body-bound endpoint yet, so the factory adds small probe endpoints
/// that use the application's real JSON options and error pipeline.
/// </summary>
public class ErrorHandlingTests(ErrorHandlingTests.ProbeFactory factory) : IClassFixture<ErrorHandlingTests.ProbeFactory>
{
    private enum ProbeKind { Battery, Propeller }

    private sealed record ProbeBody(string Name, ProbeKind? Kind);

    public sealed class ProbeFactory : ApiFactory
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.ConfigureServices(services => services.AddTransient<IStartupFilter, ProbeEndpoints>());
        }
    }

    private sealed class ProbeEndpoints : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            app.UseApiErrorHandling();
            next(app);
            app.UseRouting();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapPost("/probe/body", (ProbeBody body) => Results.Ok(body));
                endpoints.MapGet("/probe/conflict", () => Results.Problem(statusCode: StatusCodes.Status409Conflict));
            });
        };
    }

    private static StringContent Json(string json) => new(json, Encoding.UTF8, "application/json");

    private static async Task<JsonElement> ReadProblemAsync(HttpResponseMessage response)
    {
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    [Fact]
    public async Task Malformed_json_body_gives_400_problem_details()
    {
        var response = await factory.CreateClient().PostAsync("/probe/body", Json("{ \"name\": "));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await ReadProblemAsync(response);
        Assert.Equal(400, problem.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task Unknown_route_gives_404_problem_details()
    {
        var response = await factory.CreateClient().GetAsync("/api/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await ReadProblemAsync(response);
        Assert.Equal(404, problem.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task Conflict_is_returned_as_409_problem_details()
    {
        var response = await factory.CreateClient().GetAsync("/probe/conflict");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await ReadProblemAsync(response);
        Assert.Equal(409, problem.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task Unknown_json_member_is_rejected_with_400()
    {
        var response = await factory.CreateClient().PostAsync("/probe/body", Json("{ \"name\": \"x\", \"status\": \"Loaned\" }"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await ReadProblemAsync(response);
    }

    [Fact]
    public async Task Enums_are_read_and_written_as_strings()
    {
        var response = await factory.CreateClient().PostAsync("/probe/body", Json("{ \"name\": \"x\", \"kind\": \"Propeller\" }"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Propeller", body.GetProperty("kind").GetString());
    }

    [Fact]
    public async Task Unknown_enum_value_is_rejected_with_400()
    {
        var response = await factory.CreateClient().PostAsync("/probe/body", Json("{ \"name\": \"x\", \"kind\": \"Charger\" }"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await ReadProblemAsync(response);
    }

    [Fact]
    public async Task Numeric_enum_value_is_rejected_with_400()
    {
        var response = await factory.CreateClient().PostAsync("/probe/body", Json("{ \"name\": \"x\", \"kind\": 1 }"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await ReadProblemAsync(response);
    }
}
