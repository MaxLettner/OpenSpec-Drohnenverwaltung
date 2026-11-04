using System.Net;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

public class SmokeTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Api_pipeline_starts_and_serves_the_openapi_document()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Database_is_reachable_through_the_app_db_context()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        Assert.True(await db.Database.CanConnectAsync());
    }
}
