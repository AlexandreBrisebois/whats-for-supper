namespace tests;

using Xunit.Abstractions;

public class AgentFrameworkTests
{
    private readonly ITestOutputHelper _output; 
    public AgentFrameworkTests(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public async Task Run()
    {
        var AgentWorkflow = new Agent.Workflow();
        var result = await AgentWorkflow.Execute();
        _output.WriteLine("Agent Response:");
        _output.WriteLine(result);
    }
}