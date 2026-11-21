using Xunit;

namespace RecipeApi.Tests.Infrastructure;

// These tests own the process-wide elevated PIN. Run them outside parallel
// collections so neither another writer nor a reader observes a temporary PIN.
// All other test collections retain their normal parallel execution.
[CollectionDefinition("ElevatedActionsPin", DisableParallelization = true)]
public sealed class ElevatedActionsPinCollection { }
