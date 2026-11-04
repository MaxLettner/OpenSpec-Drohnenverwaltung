namespace DroneInventory.Api.Domain;

public class StudentGroup
{
    public const int NameMaxLength = 100;

    public int Id { get; set; }

    public required string Name { get; set; }
}
