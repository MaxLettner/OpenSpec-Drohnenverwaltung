namespace DroneInventory.Api.Api;

/// <summary>
/// The name check that drones and student groups share (REQ-001, REQ-003): the name is trimmed,
/// must not be blank and is at most <c>maxLength</c> characters long.
/// </summary>
internal static class NameValidation
{
    private const string Field = "name";

    /// <summary>The trimmed name, or null together with the 400 field errors that reject it.</summary>
    public static (string? Name, Dictionary<string, string[]> Errors) Validate(string? value, int maxLength)
    {
        var name = value?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            return (null, Reject("The name must not be blank."));
        }

        return name.Length > maxLength
            ? (null, Reject($"The name must not be longer than {maxLength} characters."))
            : (name, []);
    }

    private static Dictionary<string, string[]> Reject(string message) => new() { [Field] = [message] };
}
