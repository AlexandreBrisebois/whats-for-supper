using Xunit;

namespace RecipeApi.Tests.Infrastructure;

// This collection mutates process-wide WORKFLOWS_ROOT. Serializing only its
// members still races unrelated repository readers (including demo and Worker
// startup). Run it outside parallel collections, preserving default parallel
// execution for the remaining suite and all assertions in those tests.
[CollectionDefinition("WorkflowRootResolver", DisableParallelization = true)]
public sealed class WorkflowRootResolverCollection { }
