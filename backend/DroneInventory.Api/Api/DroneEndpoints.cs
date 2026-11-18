using DroneInventory.Api.Application;
using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Api;

public record CreateDroneRequest(string? Name, string? Description);

public record UpdateDroneRequest(string? Name, string? Description);

public record DroneResponse(int Id, string Name, string? Description);

public static class DroneEndpoints
{
    public static void MapDroneEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/drones");
        group.MapPost("/", CreateAsync);
        group.MapGet("/", ListAsync);
        group.MapPut("/{id:int}", UpdateAsync);
        // {id:int}: a non-integer id does not match and ends as a 404 ProblemDetails.
        group.MapGet("/{id:int}", GetAsync);
    }

    // Drone spec "Show drone details" (design D3); "today" is the same UTC date the loans use.
    private static async Task<IResult> GetAsync(int id, AppDbContext db, TimeProvider timeProvider)
    {
        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        var details = await db.GetDroneDetailsAsync(id, today);
        return details is null
            ? ApiResults.NotFound($"No drone with the Id {id} exists.")
            : Results.Ok(details);
    }

    // REQ-002: the derived availability comes from the query, not from a stored column (design D2).
    private static async Task<IResult> ListAsync(AppDbContext db) =>
        Results.Ok(await db.GetDronesAsync());

    private static async Task<IResult> CreateAsync(CreateDroneRequest request, AppDbContext db)
    {
        var (name, nameErrors) = NameValidation.Validate(request.Name, Drone.NameMaxLength);
        if (name is null)
        {
            return ApiResults.ValidationErrors(nameErrors);
        }

        var (description, descriptionError) = ValidateDescription(request.Description);
        if (descriptionError is not null)
        {
            return ApiResults.ValidationError("description", descriptionError);
        }

        var drone = new Drone { Name = name, Description = description };
        db.Drones.Add(drone);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (SqliteConstraints.IsUniqueViolation(ex))
        {
            // The unique index is the single enforcement point, so simultaneous requests are safe too.
            return ApiResults.DuplicateName("drone", name);
        }

        return Results.Created($"/api/drones/{drone.Id}", new DroneResponse(drone.Id, drone.Name, drone.Description));
    }

    // REQ-001: the same validation as create; the name stays unique ignoring case (design D2).
    private static async Task<IResult> UpdateAsync(int id, UpdateDroneRequest request, AppDbContext db)
    {
        var drone = await db.Drones.SingleOrDefaultAsync(d => d.Id == id);
        if (drone is null)
        {
            return ApiResults.NotFound($"No drone with the Id {id} exists.");
        }

        var (name, nameErrors) = NameValidation.Validate(request.Name, Drone.NameMaxLength);
        if (name is null)
        {
            return ApiResults.ValidationErrors(nameErrors);
        }

        var (description, descriptionError) = ValidateDescription(request.Description);
        if (descriptionError is not null)
        {
            return ApiResults.ValidationError("description", descriptionError);
        }

        drone.Name = name;
        drone.Description = description;
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (SqliteConstraints.IsUniqueViolation(ex))
        {
            return ApiResults.DuplicateName("drone", name);
        }

        return Results.Ok((await db.GetDronesAsync()).Single(d => d.Id == id));
    }

    /// <summary>REQ-001: the description is optional, trimmed, stored as null when blank and at most 500 characters.</summary>
    private static (string? Description, string? Error) ValidateDescription(string? value)
    {
        var description = value?.Trim();
        if (string.IsNullOrEmpty(description))
        {
            return (null, null);
        }

        return description.Length > Drone.DescriptionMaxLength
            ? (null, $"The description must not be longer than {Drone.DescriptionMaxLength} characters.")
            : (description, null);
    }
}
