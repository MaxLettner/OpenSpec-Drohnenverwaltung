namespace DroneInventory.Api.Domain;

/// <summary>Derived from the drone's active loan (REQ-002). Never stored.</summary>
public enum Availability
{
    Available,
    Loaned,
}
