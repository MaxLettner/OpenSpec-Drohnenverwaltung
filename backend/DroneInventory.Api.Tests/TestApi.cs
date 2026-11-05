using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>A loan to seed directly: the drone and group names, the dates and the accessory quantities.</summary>
internal record LoanSeed(
    string Drone, string Group, DateOnly LoanDate, DateOnly? ReturnDate, int? Batteries = null, int? Propellers = null);

/// <summary>Creating resources through the API, seeding loans and the assertions most endpoint tests share.</summary>
internal static class TestApi
{
    /// <summary>
    /// POSTs <paramref name="body"/> to <paramref name="url"/>, requires the 201 Created of a new
    /// drone, student group or loan and returns the `Id` the backend assigned.
    /// </summary>
    public static async Task<int> CreateAsync(HttpClient client, string url, object body)
    {
        var response = await client.PostAsJsonAsync(url, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
    }

    /// <summary>Creates the drone "TELLO-07" and the student group "Group 3" and returns their Ids.</summary>
    public static async Task<(int DroneId, int GroupId)> CreateDroneAndGroupAsync(HttpClient client) => (
        await CreateAsync(client, "/api/drones", new { name = "TELLO-07" }),
        await CreateAsync(client, "/api/student-groups", new { name = "Group 3" }));

    /// <summary>Loans the drone to the group with the given accessories and returns the new loan Id.</summary>
    public static Task<int> CreateLoanAsync(
        HttpClient client, int droneId, int studentGroupId, params (string Type, int Quantity)[] items) =>
        CreateAsync(client, "/api/loans", new
        {
            droneId,
            studentGroupId,
            items = items.Select(item => new { type = item.Type, quantity = item.Quantity }).ToList(),
        });

    /// <summary>The number of stored <typeparamref name="TEntity"/> rows, optionally only those with that name.</summary>
    public static async Task<int> CountAsync<TEntity>(ApiFactory factory, string? name = null) where TEntity : class
    {
        using var scope = factory.Services.CreateScope();
        var rows = scope.ServiceProvider.GetRequiredService<AppDbContext>().Set<TEntity>();
        return name is null
            ? await rows.CountAsync()
            : await rows.CountAsync(row => EF.Property<string>(row, "Name") == name);
    }

    /// <summary>
    /// Asserts a rejected request (status, ProblemDetails content type, status member) and returns the body,
    /// because the response content can only be read once.
    /// </summary>
    public static async Task<JsonElement> AssertProblemAsync(HttpResponseMessage response, HttpStatusCode expected)
    {
        Assert.Equal(expected, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal((int)expected, problem.GetProperty("status").GetInt32());
        return problem;
    }

    /// <summary>Seeds loans with their drones, groups and accessories directly; returns the loan Ids in input order.</summary>
    public static async Task<int[]> SeedLoansAsync(ApiFactory factory, params LoanSeed[] seeds)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var ids = new List<int>();
        foreach (var seed in seeds)
        {
            var drone = new Drone { Name = seed.Drone };
            var group = new StudentGroup { Name = seed.Group };
            db.Drones.Add(drone);
            db.StudentGroups.Add(group);
            await db.SaveChangesAsync();

            var loan = new Loan
            {
                DroneId = drone.Id,
                StudentGroupId = group.Id,
                LoanDate = seed.LoanDate,
                Status = seed.ReturnDate is null ? LoanStatus.Active : LoanStatus.Returned,
                ReturnDate = seed.ReturnDate,
            };
            if (seed.Batteries is { } batteries)
            {
                loan.Items.Add(new LoanItem { Type = LoanItemType.Battery, Quantity = batteries });
            }

            if (seed.Propellers is { } propellers)
            {
                loan.Items.Add(new LoanItem { Type = LoanItemType.Propeller, Quantity = propellers });
            }

            db.Loans.Add(loan);
            await db.SaveChangesAsync();
            ids.Add(loan.Id);
        }

        return [.. ids];
    }

    /// <summary>
    /// A loan row as the list endpoints show it: "group | drone | batteries | propellers | loanDate",
    /// and the return date when the row carries one.
    /// </summary>
    public static string DescribeRow(JsonElement row)
    {
        var text = $"{row.GetProperty("group").GetString()} | {row.GetProperty("drone").GetString()} | " +
                   $"{row.GetProperty("batteries").GetInt32()} | {row.GetProperty("propellers").GetInt32()} | " +
                   $"{row.GetProperty("loanDate").GetString()}";
        return row.TryGetProperty("returnDate", out var returnDate)
            ? $"{text} | {returnDate.GetString()}"
            : text;
    }
}
