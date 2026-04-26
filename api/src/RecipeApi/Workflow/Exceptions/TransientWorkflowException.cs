namespace RecipeApi.Workflow.Exceptions;

public class TransientWorkflowException(string message, Exception? inner = null)
    : Exception(message, inner);
