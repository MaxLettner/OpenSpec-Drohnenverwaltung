using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>REQ-004 "Loan a drone" (specs/loan). Each test gets its own database.</summary>
public class LoanCreateTests
{
    private static async Task<int> LoanCountAsync(ApiFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Loans.CountAsync();
    }

    [Fact]
    public async Task REQ_004_Loan_an_available_drone()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = groupId });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var loan = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = loan.GetProperty("id").GetInt32();
        Assert.Equal($"/api/loans/{id}", response.Headers.Location?.ToString());
        Assert.Equal(droneId, loan.GetProperty("droneId").GetInt32());
        Assert.Equal(groupId, loan.GetProperty("studentGroupId").GetInt32());
        Assert.Equal("Active", loan.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, loan.GetProperty("returnDate").ValueKind);
        Assert.Equal(0, loan.GetProperty("items").GetArrayLength());

        using var scope = factory.Services.CreateScope();
        var stored = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Loans.SingleAsync();
        Assert.Equal(id, stored.Id);
        Assert.Equal(droneId, stored.DroneId);
        Assert.Equal(groupId, stored.StudentGroupId);
        Assert.Equal(LoanStatus.Active, stored.Status);
        Assert.Null(stored.ReturnDate);
    }

    [Fact]
    public async Task REQ_004_Loan_date_is_the_current_date()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = groupId });

        var loan = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("2026-03-15", loan.GetProperty("loanDate").GetString());
        using var scope = factory.Services.CreateScope();
        var stored = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Loans.SingleAsync();
        Assert.Equal(ApiFactory.Today, stored.LoanDate);
    }

    [Fact]
    public async Task REQ_004_Loan_to_an_unknown_group()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, _) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId, studentGroupId = 9 });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.NotFound);
        Assert.Equal(0, await LoanCountAsync(factory));
    }

    [Fact]
    public async Task REQ_004_Loan_of_an_unknown_drone()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (_, groupId) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await client.PostAsJsonAsync("/api/loans", new { droneId = 99, studentGroupId = groupId });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.NotFound);
        Assert.Equal(0, await LoanCountAsync(factory));
    }

    [Fact]
    public async Task REQ_004_Loan_date_is_not_an_input()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);

        var response = await client.PostAsJsonAsync(
            "/api/loans", new { droneId, studentGroupId = groupId, loanDate = "2020-01-01" });

        await TestApi.AssertProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal(0, await LoanCountAsync(factory));
    }

    [Theory]
    [InlineData("missing-both")]
    [InlineData("missing-drone")]
    [InlineData("missing-group")]
    [InlineData("zero-drone")]
    [InlineData("zero-group")]
    public async Task REQ_004_Missing_or_zero_ids_are_rejected(string kind)
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var (droneId, groupId) = await TestApi.CreateDroneAndGroupAsync(client);
        object body = kind switch
        {
            "missing-both" => new { },
            "missing-drone" => new { studentGroupId = groupId },
            "missing-group" => new { droneId },
            "zero-drone" => new { droneId = 0, studentGroupId = groupId },
            _ => new { droneId, studentGroupId = 0 },
        };

        var response = await client.PostAsJsonAsync("/api/loans", body);

        await TestApi.AssertProblemAsync(response, HttpStatusCode.BadRequest);
        Assert.Equal(0, await LoanCountAsync(factory));
    }
}
