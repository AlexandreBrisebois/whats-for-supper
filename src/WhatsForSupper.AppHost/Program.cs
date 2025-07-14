using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

var builder = Host.CreateDefaultBuilder(args);

builder.ConfigureServices(services =>
{
    services.AddHostedService<AppOrchestrator>();
});

var host = builder.Build();

Console.WriteLine("🍽️  What's for Supper - Application Host Starting...");
await host.RunAsync();

public class AppOrchestrator : BackgroundService
{
    private readonly ILogger<AppOrchestrator> _logger;
    private Process? _apiProcess;
    private Process? _reactProcess;

    public AppOrchestrator(ILogger<AppOrchestrator> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            _logger.LogInformation("Starting What's for Supper application components...");

            // Start API
            await StartApiService(stoppingToken);
            
            // Wait a bit for API to start
            await Task.Delay(3000, stoppingToken);
            
            // Start React frontend
            await StartReactFrontend(stoppingToken);

            _logger.LogInformation("✅ All services started successfully!");
            _logger.LogInformation("🌐 Frontend: http://localhost:5173");
            _logger.LogInformation("🔌 API: http://localhost:5223");
            _logger.LogInformation("📚 API Docs: http://localhost:5223/swagger");
            _logger.LogInformation("\nPress Ctrl+C to stop all services.");

            // Keep running until cancellation is requested
            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Application shutdown requested.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error running application orchestrator");
        }
    }

    private Task StartApiService(CancellationToken cancellationToken)
    {
        _logger.LogInformation("🚀 Starting API Service...");
        
        var apiPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "WhatsForSupper.Api");
        
        _apiProcess = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "dotnet",
                Arguments = "run --urls http://localhost:5223",
                WorkingDirectory = apiPath,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            }
        };

        _apiProcess.OutputDataReceived += (sender, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
                _logger.LogInformation("[API] {Output}", e.Data);
        };

        _apiProcess.ErrorDataReceived += (sender, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
                _logger.LogError("[API] {Error}", e.Data);
        };

        _apiProcess.Start();
        _apiProcess.BeginOutputReadLine();
        _apiProcess.BeginErrorReadLine();

        _logger.LogInformation("✅ API Service started on http://localhost:5223");
        return Task.CompletedTask;
    }

    private Task StartReactFrontend(CancellationToken cancellationToken)
    {
        _logger.LogInformation("🚀 Starting React Frontend...");
        
        var reactPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "whats-for-supper-web");
        
        _reactProcess = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "npm",
                Arguments = "run dev",
                WorkingDirectory = reactPath,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            }
        };

        _reactProcess.OutputDataReceived += (sender, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
                _logger.LogInformation("[React] {Output}", e.Data);
        };

        _reactProcess.ErrorDataReceived += (sender, e) =>
        {
            if (!string.IsNullOrEmpty(e.Data))
                _logger.LogError("[React] {Error}", e.Data);
        };

        _reactProcess.Start();
        _reactProcess.BeginOutputReadLine();
        _reactProcess.BeginErrorReadLine();

        _logger.LogInformation("✅ React Frontend started on http://localhost:5173");
        return Task.CompletedTask;
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("🛑 Stopping all services...");

        if (_apiProcess != null && !_apiProcess.HasExited)
        {
            _apiProcess.Kill();
            _apiProcess.Dispose();
            _logger.LogInformation("✅ API Service stopped");
        }

        if (_reactProcess != null && !_reactProcess.HasExited)
        {
            _reactProcess.Kill();
            _reactProcess.Dispose();
            _logger.LogInformation("✅ React Frontend stopped");
        }

        await base.StopAsync(cancellationToken);
    }
}
