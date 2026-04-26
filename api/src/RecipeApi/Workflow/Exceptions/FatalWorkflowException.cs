namespace RecipeApi.Workflow.Exceptions;

public class FatalWorkflowException(string message, Exception? inner = null)
    : Exception(message, inner);
