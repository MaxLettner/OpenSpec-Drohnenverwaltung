using DroneInventory.Api.Domain;
using DroneInventory.Api.Infrastructure;
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
            .AsNoTracking()
            .OrderBy(g => g.Name)
            .Select(g => new StudentGroupResponse(g.Id, g.Name))
            .ToListAsync());

    private static async Task<IResult> CreateAsync(CreateStudentGroupRequest request, AppDbContext db)
    {
        var (name, nameErrors) = NameValidation.Validate(request.Name, StudentGroup.NameMaxLength);
        if (name is null)
        {
            return ApiResults.ValidationErrors(nameErrors);
        }

        var studentGroup = new StudentGroup { Name = name };
        db.StudentGroups.Add(studentGroup);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (SqliteConstraints.IsUniqueViolation(ex))
        {
            // The unique index is the single enforcement point, so simultaneous requests are safe too.
            return ApiResults.DuplicateName("student group", name);
        }

        return Results.Created(
            $"/api/student-groups/{studentGroup.Id}",
            new StudentGroupResponse(studentGroup.Id, studentGroup.Name));
    }
}
