# Demo household delta

## Purpose

Describe the existing resettable showcase, its access presentation, snapshot effects, scheduling and bounded AI suppression so operators and household visitors can distinguish supported behavior from unqualified guarantees.

Shared rule owners: [household identity](../../../../../specs/household-identity/spec.md) and
[background processing](../../../../../specs/background-processing/spec.md). Named
requirements below refer to those owners without changing their shared policy.

## ADDED Requirements

### Requirement: Bypass the five demo workflow processor names

With demo enabled, worker dispatch for ExtractRecipe, GenerateDescription, SynthesizeRecipe, WebAcquisition and CategorizeIngredients SHALL return a Demo Mode Bypass result naming the processor instead of executing its ordinary processor body. Normally persisted task completion SHALL follow shared background-processing rules without certifying produced recipe content.

#### Scenario: Each named processor bypassed
- **WHEN** a demo worker dispatches one of the five named processor tasks
- **THEN** its result identifies Demo Mode Bypass and that processor name without running the ordinary processor body

#### Scenario: Bypass result completes task
- **WHEN** a bypass returns normally and completion persistence succeeds
- **THEN** the task is Completed with a stored bypass result; this alone does not certify acquired content or a ready recipe

### Requirement: Block outgoing calls through the decorated chat client

In demo mode, outgoing response and streaming-response requests through the registered decorated chat client SHALL throw before delegating to the underlying chat provider. With demo disabled, that decorator SHALL delegate these requests normally.

#### Scenario: Response blocked
- **WHEN** a consumer invokes a response request through the decorated chat client in demo mode
- **THEN** it fails with Outgoing AI Chat calls are disabled in Demo Mode. before provider delegation

#### Scenario: Stream blocked
- **WHEN** a consumer invokes a streaming-response request through the decorated chat client in demo mode
- **THEN** it fails with Outgoing AI Streaming Chat calls are disabled in Demo Mode. before provider delegation

#### Scenario: Normal chat delegation
- **WHEN** demo mode is disabled and a consumer invokes either chat request form through the decorator
- **THEN** the request is delegated to the underlying client without the demo rejection

### Requirement: Keep the ordinary Search entry visible in demo presentation

The Recipes page SHALL retain its ordinary recipe-search input when health reports demoMode true. Its visibility SHALL NOT certify successful semantic embedding, provider isolation or cost-free search.

#### Scenario: Search input available
- **WHEN** the Recipes page renders with established household/member context and demo health presentation
- **THEN** the recipe-search input remains visible
