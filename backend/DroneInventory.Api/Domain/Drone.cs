namespace DroneInventory.Api.Domain;

/// <summary>A lendable drone. Availability is derived from the active loan and is deliberately not stored.</summary>
public class Drone
{
    public const int NameMaxLength = 100;
    public const int DescriptionMaxLength = 500;

    public int Id { get; set; }

    public required string Name { get; set; }

    public string? Description { get; set; }
}
