using DroneInventory.Api.Api;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

builder.Services.AddApiErrorHandling();

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? "Data Source=droneinventory.db";
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));

var app = builder.Build();

app.UseApiErrorHandling();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.Run();

// Makes the entry point visible to WebApplicationFactory in the test project.
public partial class Program;
