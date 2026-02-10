var builder = DistributedApplication.CreateBuilder(args);

var apiService = builder.AddProject<Projects.WhatsForSupper_Import_ApiService>("apiservice")
    .WithHttpHealthCheck("/health");

// JavaScript web frontend
builder.AddProject<Projects.WhatsForSupper_Import_WebJS>("webfrontend")
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health")
    .WithEnvironment("API_BASE_URL", apiService.GetEndpoint("http"))
    .WaitFor(apiService);

builder.Build().Run();
