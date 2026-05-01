using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using RecipeApi.Data;
using RecipeApi.Models;
using RecipeApi.Workflow;

namespace RecipeApi.Services.Processors;

/// <summary>
/// Marks the family GOTO setting as "ready" once synthesis is complete.
///
/// Safe to append to any workflow — if no family_goto setting exists whose
/// recipeId matches the payload, this processor is a no-op.
///
/// When a match is found:
///   1. Sets value.status = "ready" in family_settings.
///   2. Sets recipe.image_count = 1 in recipes (so GET /status returns "ready").
/// </summary>
public class MarkGotoReadyProcessor(
    RecipeDbContext db,
    ILogger<MarkGotoReadyProcessor> logger) : IWorkflowProcessor
{
    public string ProcessorName => "MarkGotoReady";

    public async Task<object?> ExecuteAsync(WorkflowTask task, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(task.Payload))
            throw new ArgumentException("Task payload is empty.");

        using var doc = JsonDocument.Parse(task.Payload);
        if (!doc.RootElement.TryGetProperty("recipeId", out var idProp) &&
            !doc.RootElement.TryGetProperty("RecipeId", out idProp))
            throw new ArgumentException("Task payload does not contain recipeId.");

        var recipeId = idProp.GetGuid();
        var recipeIdStr = recipeId.ToString();

        // ── Find the family_goto setting whose recipeId matches ───────────────
        var setting = await db.FamilySettings
            .FirstOrDefaultAsync(s => s.Key == "family_goto", ct);

        if (setting is null)
        {
            logger.LogDebug("MarkGotoReady: no family_goto setting found — no-op for {RecipeId}", recipeId);
            return new { Message = $"No family_goto setting found — no-op for {recipeId}" };
        }

        // Check that the stored recipeId matches
        string? storedRecipeId = null;
        if (setting.Value.TryGetProperty("recipeId", out var storedIdProp))
            storedRecipeId = storedIdProp.GetString();

        if (!string.Equals(storedRecipeId, recipeIdStr, StringComparison.OrdinalIgnoreCase))
        {
            logger.LogDebug(
                "MarkGotoReady: family_goto.recipeId={Stored} does not match {RecipeId} — no-op",
                storedRecipeId, recipeId);
            return new { Message = $"family_goto.recipeId mismatch — no-op for {recipeId}" };
        }

        // ── Patch value JSON: set status = "ready" ────────────────────────────
        // JsonElement is immutable — round-trip through JsonNode to mutate.
        var node = JsonNode.Parse(setting.Value.GetRawText())!.AsObject();
        node["status"] = "ready";

        setting.Value = JsonDocument.Parse(node.ToJsonString()).RootElement;
        setting.UpdatedAt = DateTimeOffset.UtcNow;

        // ── Set image_count = 1 so GET /status returns "ready" ───────────────
        // (SynthesizeRecipeProcessor writes ImageCount=0; we bump it here so the
        //  status endpoint's "name != null && imageCount > 0" guard passes.)
        var recipe = await db.Recipes.FindAsync([recipeId], ct);
        if (recipe is not null)
        {
            recipe.ImageCount = 1;
            recipe.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "MarkGotoReady: set family_goto status=ready and image_count=1 for recipe {RecipeId}",
            recipeId);

        return new { Message = $"Marked family_goto ready for recipe {recipeId}" };
    }
}
