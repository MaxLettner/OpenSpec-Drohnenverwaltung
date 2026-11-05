namespace DroneInventory.Api.Api;

/// <summary>
/// The error responses the endpoints share, so that one kind of rejection always has the same shape
/// and wording: a field error is a 400 validation problem (REQ-001, REQ-003, REQ-006) and a name
/// taken by another drone or student group is a 409 (REQ-001, REQ-003).
/// </summary>
internal static class ApiResults
{
    /// <summary>A 400 validation problem that names one request field and the reason it was rejected.</summary>
    public static IResult ValidationError(string field, string message) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { [field] = [message] });

    /// <summary>A 409 for a <paramref name="name"/> that another <paramref name="entity"/> already uses, e.g. "drone".</summary>
    public static IResult DuplicateName(string entity, string name) =>
        Results.Problem(
            statusCode: StatusCodes.Status409Conflict,
            detail: $"A {entity} named \"{name}\" already exists.");
}
