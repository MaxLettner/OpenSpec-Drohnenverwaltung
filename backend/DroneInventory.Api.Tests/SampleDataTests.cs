using System.Net.Http.Json;
using System.Text.Json;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DroneInventory.Api.Tests;

/// <summary>sample-data spec: the fixed sample set of a fresh development database (REQ-001 to REQ-010).</summary>
public class SampleDataTests
{
    private static async Task<JsonElement> GetAsync(HttpClient client, string url) =>
        await client.GetFromJsonAsync<JsonElement>(url);

    /// <summary>Creates the tables on the factory's database before the API starts, like a database that already exists.</summary>
    private static AppDbContext OpenBeforeStart(ApiFactory factory)
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(factory.Connection).Options);
        db.Database.Migrate();
        return db;
    }

    [Fact]
    public async Task Empty_development_database_gets_drones_groups_active_and_returned_loans()
    {
        using var factory = new ApiFactory { SeedSampleData = true };
        var client = factory.CreateClient();

        var drones = (await GetAsync(client, "/api/drones")).EnumerateArray().ToList();
        Assert.Equal(10, drones.Count);
        Assert.Contains(drones, d => d.GetProperty("availability").GetString() == "Available");
        Assert.Contains(drones, d => d.GetProperty("availability").GetString() == "Loaned");
        Assert.Equal(5, (await GetAsync(client, "/api/student-groups")).GetArrayLength());
        Assert.Equal(3, (await GetAsync(client, "/api/loans/active")).GetArrayLength());
        Assert.Equal(4, (await GetAsync(client, "/api/loans/history")).GetArrayLength());
    }

    [Fact]
    public async Task Sample_data_follows_the_loan_rules()
    {
        using var factory = new ApiFactory { SeedSampleData = true };
        factory.CreateClient();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var loans = await db.Loans.Include(l => l.Items).ToListAsync();

        // REQ-005: at most one active loan per drone.
        Assert.All(
            loans.Where(l => l.Status == LoanStatus.Active).GroupBy(l => l.DroneId),
            perDrone => Assert.Single(perDrone));
        // REQ-009: a returned loan ends on or after its loan date; an active one has no return date.
        Assert.All(loans, l =>
        {
            if (l.Status == LoanStatus.Returned)
            {
                Assert.True(l.ReturnDate >= l.LoanDate, $"Loan {l.Id} returns before it starts.");
            }
            else
            {
                Assert.Null(l.ReturnDate);
            }
        });
        // REQ-006: whole quantities of 0 or more, one item per type.
        Assert.All(loans, l =>
        {
            Assert.All(l.Items, i => Assert.True(i.Quantity >= 0));
            Assert.Equal(l.Items.Count, l.Items.Select(i => i.Type).Distinct().Count());
        });
    }

    [Fact]
    public async Task Two_fresh_databases_get_the_same_data()
    {
        using var first = new ApiFactory { SeedSampleData = true };
        using var second = new ApiFactory { SeedSampleData = true };

        foreach (var url in new[] { "/api/drones", "/api/student-groups", "/api/loans/active", "/api/loans/history" })
        {
            var a = (await GetAsync(first.CreateClient(), url)).GetRawText();
            var b = (await GetAsync(second.CreateClient(), url)).GetRawText();
            Assert.Equal(a, b);
        }
    }

    [Fact]
    public async Task Database_with_own_data_is_left_as_it_is()
    {
        using var factory = new ApiFactory { SeedSampleData = true };
        using (var db = OpenBeforeStart(factory))
        {
            db.Drones.Add(new Drone { Name = "TELLO-99" });
            await db.SaveChangesAsync();
        }

        var drones = await GetAsync(factory.CreateClient(), "/api/drones");

        Assert.Equal(["TELLO-99"], drones.EnumerateArray().Select(d => d.GetProperty("name").GetString()));
        Assert.Equal(0, await TestApi.CountAsync<StudentGroup>(factory));
        Assert.Equal(0, await TestApi.CountAsync<Loan>(factory));
    }

    [Fact]
    public async Task Production_without_sample_data_setting_writes_no_sample_data()
    {
        using var folder = new TempDatabaseFolder();
        using var production = new FileDatabaseFactory(folder.ConnectionString);
        var client = production.CreateClient();

        Assert.Equal(0, (await GetAsync(client, "/api/drones")).GetArrayLength());
        Assert.Equal(0, (await GetAsync(client, "/api/student-groups")).GetArrayLength());
        Assert.Equal(0, (await GetAsync(client, "/api/loans/active")).GetArrayLength());
        Assert.Equal(0, (await GetAsync(client, "/api/loans/history")).GetArrayLength());
    }

    [Fact]
    public async Task Sample_data_switched_on_in_Production_fills_an_empty_database()
    {
        using var baseFactory = new ApiFactory { SeedSampleData = true };
        using var production = baseFactory.WithWebHostBuilder(builder => builder.UseEnvironment("Production"));

        var drones = (await GetAsync(production.CreateClient(), "/api/drones")).EnumerateArray().ToList();

        Assert.Equal(10, drones.Count);
        Assert.Contains(drones, d => d.GetProperty("availability").GetString() == "Available");
        Assert.Contains(drones, d => d.GetProperty("availability").GetString() == "Loaned");
    }

    [Fact]
    public async Task Sample_data_is_on_by_default_in_Development()
    {
        // No SampleData setting of the test's own: only appsettings.Development.json decides.
        using var folder = new TempDatabaseFolder();
        using var development = new FileDatabaseFactory(folder.ConnectionString, "Development");

        Assert.Equal(10, (await GetAsync(development.CreateClient(), "/api/drones")).GetArrayLength());
    }

    [Fact]
    public async Task Sample_data_disabled_leaves_the_database_empty()
    {
        using var factory = new ApiFactory { SeedSampleData = false };

        var drones = await GetAsync(factory.CreateClient(), "/api/drones");

        Assert.Equal(0, drones.GetArrayLength());
    }
}
