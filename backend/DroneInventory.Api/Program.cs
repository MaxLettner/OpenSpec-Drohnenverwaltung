using DroneInventory.Api.Api;
using DroneInventory.Api.Application;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

builder.Services.AddApiErrorHandling();

// The one place the database location comes from: appsettings.json sets the connection string.
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("The connection string \"Default\" is not configured.");
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<LoanService>();

var app = builder.Build();

app.UseApiErrorHandling();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    // Creates the database file on first start and applies new migrations.
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    // appsettings.Development.json turns this on; the test factory turns it off (sample-data spec).
    if (app.Configuration.GetValue<bool>("SampleData:SeedWhenEmpty"))
    {
        await SampleData.SeedIfEmptyAsync(db);
    }
}

app.MapStudentGroupEndpoints();
app.MapDroneEndpoints();
app.MapLoanEndpoints();
app.MapLoanQueryEndpoints();

app.Run();

// Makes the entry point visible to WebApplicationFactory in the test project.
public partial class Program;
