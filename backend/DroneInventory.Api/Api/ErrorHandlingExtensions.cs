using System.Text.Json.Serialization;

namespace DroneInventory.Api.Api;

public static class ErrorHandlingExtensions
{
    /// <summary>
    /// Errors (400/404/409/500) leave the API as RFC 9457 ProblemDetails.
    /// Enums travel as strings (numbers are rejected) and unknown JSON members are a 400.
    /// </summary>
    public static IServiceCollection AddApiErrorHandling(this IServiceCollection services)
    {
        services.AddProblemDetails();
        services.AddExceptionHandler<BadRequestExceptionHandler>();
        services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false));
            options.SerializerOptions.UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow;
        });
        return services;
    }

    public static IApplicationBuilder UseApiErrorHandling(this IApplicationBuilder app)
    {
        app.UseExceptionHandler();
        app.UseStatusCodePages();
        return app;
    }
}
