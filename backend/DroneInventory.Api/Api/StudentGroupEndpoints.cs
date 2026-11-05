using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Api;

public record CreateStudentGroupRequest(string? Name);

public record StudentGroupResponse(int Id, string Name);

public static class StudentGroupEndpoints
{
    public static void MapStudentGroupEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/student-groups");
        group.MapPost("/", CreateAsync);
        group.MapGet("/", ListAsync);
    }

    // Fixed order by name (design D10); the NOCASE collation makes it case-insensitive.
    private static async Task<IResult> ListAsync(AppDbContext db) =>
        Results.Ok(await db.StudentGroups
            .OrderBy(g => g.Name)
            .Select(g => new StudentGroupResponse(g.Id, g.Name))
            .ToListAsync());

    private static async Task<IResult> CreateAsync(CreateStudentGroupRequest request, AppDbContext db)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            return ApiResults.ValidationError("name", "The name must not be blank.");
        }

        if (name.Length > StudentGroup.NameMaxLength)
        {
            return ApiResults.ValidationError(
                "name",
                $"The name must not be longer than {StudentGroup.NameMaxLength} characters.");
        }

        var studentGroup = new StudentGroup { Name = name };
        db.StudentGroups.Add(studentGroup);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqliteException { SqliteErrorCode: 19 })
        {
            // The unique index is the single enforcement point, so simultaneous requests are safe too.
            return ApiResults.DuplicateName("student group", name);
        }

        return Results.Created(
            $"/api/student-groups/{studentGroup.Id}",
            new StudentGroupResponse(studentGroup.Id, studentGroup.Name));
    }
}
