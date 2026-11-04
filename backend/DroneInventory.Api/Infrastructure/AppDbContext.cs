using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Infrastructure;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
}
