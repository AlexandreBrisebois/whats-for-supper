using System.Diagnostics;
using OpenTelemetry;

namespace RecipeApi.Telemetry;

/// <summary>Runs synchronously before the SDK batch processor sees an Activity.</summary>
public sealed class NativePrivacyProcessor : BaseProcessor<Activity>
{
    private static readonly HashSet<string> Methods = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "CONNECT", "TRACE"];

    public override void OnEnd(Activity activity)
    {
        var name = (activity.Source.Name, activity.Kind) switch
        {
            ("Microsoft.AspNetCore", ActivityKind.Server) => "api.request",
            ("System.Net.Http", ActivityKind.Client) => "api.http",
            _ => null
        };
        var root = activity;
        while (root.Parent is not null) root = root.Parent;
        if (name is null || !string.IsNullOrEmpty(activity.Source.Version) || activity.Source.Tags?.Any() == true
            || !string.IsNullOrEmpty(activity.Source.TelemetrySchemaUrl) || activity.Events.Any() || activity.Links.Any() || root.ParentSpanId != default)
        {
            // Returning alone would still let the following standard processor enqueue it.
            activity.ActivityTraceFlags &= ~ActivityTraceFlags.Recorded;
            return;
        }

        var method = activity.GetTagItem("http.request.method") ?? activity.GetTagItem("http.method");
        var status = activity.GetTagItem("http.response.status_code") ?? activity.GetTagItem("http.status_code");
        foreach (var tag in activity.TagObjects.ToArray()) activity.SetTag(tag.Key, null);
        foreach (var baggage in activity.Baggage.ToArray()) activity.SetBaggage(baggage.Key, null);
        activity.TraceStateString = null;
        activity.DisplayName = name;
        activity.SetStatus(activity.Status);
        if (method is string text && Methods.Contains(text)) activity.SetTag("http.request.method", text);
        if (status is int code && code is >= 100 and <= 599) activity.SetTag("http.response.status_code", code);
        else if (status is long number && number is >= 100 and <= 599) activity.SetTag("http.response.status_code", number);
    }
}
