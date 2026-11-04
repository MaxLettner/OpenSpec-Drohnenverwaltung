using Microsoft.AspNetCore.Diagnostics;

namespace DroneInventory.Api.Api;

/// <summary>
/// Malformed JSON, unknown members and unknown enum values surface as <see cref="BadHttpRequestException"/>.
/// In Development the framework rethrows them instead of answering 400, so they are mapped here
/// to a 400 ProblemDetails response in every environment.
/// </summary>
public sealed class BadRequestExceptionHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not BadHttpRequestException badRequest)
        {
            return false;
        }

        httpContext.Response.StatusCode = badRequest.StatusCode;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = { Status = badRequest.StatusCode, Title = "The request body is invalid." },
        });
    }
}
