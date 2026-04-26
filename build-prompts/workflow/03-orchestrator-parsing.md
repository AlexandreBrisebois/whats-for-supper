# Build Prompt 03: Workflow Orchestrator - YAML & DAG Validation

**Persona**: Software Architect
**Goal**: Implement the core logic for loading, parsing, and validating YAML-based workflow definitions.

## Strict Scope
- **NEW**: `api/src/RecipeApi/Services/WorkflowOrchestrator.cs` (Interface & Implementation)
- **NEW**: `api/src/RecipeApi/Models/WorkflowDefinition.cs` (POCO for YAML deserialization)
- **DO NOT TOUCH**: Database logic or Task generation in this prompt. Focus entirely on the "Definition" layer.

## Contract & Decisions
- **Decision: Declarative YAML**: We use a Directed Acyclic Graph (DAG) defined in YAML.
- **Example Schema**:
  ```yaml
  id: recipe_import
  parameters: [recipe_id]
  tasks:
    - id: extract
      processor: ExtractRecipe
      payload: { recipe_id: "{{recipe_id}}" }
    - id: hero
      processor: GenerateHero
      depends_on: [extract]
      payload: { recipe_id: "{{recipe_id}}", force: true }
  ```

## Technical Skeleton
```csharp
namespace RecipeApi.Services;

public interface IWorkflowOrchestrator {
    Task<WorkflowInstance> TriggerAsync(string workflowId, Dictionary<string, string> parameters);
    WorkflowDefinition GetDefinition(string workflowId);
}
```

## Requirements
1.  **WorkflowDefinition POCO**: Create classes that match the YAML structure (using `YamlDotNet` or similar).
2.  **YAML Loading**: 
    - The `WorkflowOrchestrator` should use `WorkflowRootResolver` to find YAML files in `/data/workflows`.
    - Implement `GetDefinition(string workflowId)`.
3.  **DAG Validation**:
    - Implement a validation step that ensures:
        - All `depends_on` IDs exist within the same workflow.
        - **No Circular Dependencies**: Use a DFS or Kahn's algorithm to detect cycles.
        - All mandatory parameters used in `{{variables}}` are defined in the `parameters` list.

## TDD Protocol
1.  Create unit tests with sample YAML strings:
    - Test a valid YAML DAG.
    - Test a YAML with a circular dependency (Should throw `InvalidWorkflowException`).
    - Test a YAML with a missing dependency ID (Should throw `InvalidWorkflowException`).
2.  Verify the `parameters` validation logic.

## Mandatory Handover
- Summary of the YAML parser logic.
- Result of cycle detection tests.
