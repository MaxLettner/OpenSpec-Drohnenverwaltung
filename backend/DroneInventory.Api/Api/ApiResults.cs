namespace DroneInventory.Api.Api;

/// <summary>
/// The error responses the endpoints share, so that one kind of rejection always has the same shape
/// and wording: a field error is a 400 validation problem (REQ-001, REQ-003, REQ-006), a missing
/// resource a 404 and a rejected state a 409 (REQ-004, REQ-005, REQ-008).
/// </summary>
internal static class ApiResults
{
    /// <summary>A 400 validation problem that names one request field and the reason it was rejected.</summary>
    public static IResult ValidationError(string field, string message) =>
        ValidationErrors(new Dictionary<string, string[]> { [field] = [message] });

    /// <summary>A 400 validation problem that names each rejected field and the reason.</summary>
    public static IResult ValidationErrors(IDictionary<string, string[]> errors) =>
        Results.ValidationProblem(errors);

    /// <summary>A 404 for a resource the request refers to but the system does not have.</summary>
    public static IResult NotFound(string detail) =>
        Results.Problem(statusCode: StatusCodes.Status404NotFound, detail: detail);

    /// <summary>A 409 for a request that contradicts the stored state.</summary>
    public static IResult Conflict(string detail) =>
        Results.Problem(statusCode: StatusCodes.Status409Conflict, detail: detail);

    /// <summary>A 409 for a <paramref name="name"/> that another <paramref name="entity"/> already uses, e.g. "drone".</summary>
    public static IResult DuplicateName(string entity, string name) =>
        Conflict($"A {entity} named \"{name}\" already exists.");
}
