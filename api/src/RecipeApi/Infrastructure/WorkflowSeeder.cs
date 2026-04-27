using RecipeApi.Infrastructure;

namespace RecipeApi.Infrastructure;

public static class WorkflowSeeder
{
    public static void SeedCoreWorkflows(string targetRoot, Serilog.ILogger logger)
    {
        try
        {
            // Core workflows are bundled in the "Workflows" directory in the output
            var sourceDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "src", "RecipeApi", "Workflows");
            
            // Fallback for different build environments (e.g. if it's just "Workflows" at the root of the output)
            if (!Directory.Exists(sourceDir))
            {
                sourceDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Workflows");
            }

            if (!Directory.Exists(sourceDir))
            {
                logger.Warning("Core workflows source directory not found: {SourceDir}", sourceDir);
                return;
            }

            if (!Directory.Exists(targetRoot))
            {
                logger.Information("Creating workflows target directory: {TargetRoot}", targetRoot);
                Directory.CreateDirectory(targetRoot);
            }

            var workflowFiles = Directory.GetFiles(sourceDir, "*.yaml");
            foreach (var file in workflowFiles)
            {
                var fileName = Path.GetFileName(file);
                var destPath = Path.Combine(targetRoot, fileName);

                // For core workflows, we always overwrite to ensure updates are applied
                File.Copy(file, destPath, overwrite: true);
                logger.Debug("Seeded core workflow: {FileName}", fileName);
            }

            logger.Information("Successfully seeded {Count} core workflows to {TargetRoot}", workflowFiles.Length, targetRoot);
        }
        catch (Exception ex)
        {
            logger.Error(ex, "Failed to seed core workflows.");
        }
    }
}
