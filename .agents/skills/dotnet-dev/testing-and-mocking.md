# Testing and Mocking Strategy

## 1. Good vs Bad Tests

### Good Tests
**Integration-style**: Test through real interfaces, not mocks of internal parts.

```csharp
// GOOD: Tests observable behavior
[Fact]
public async Task UserCanCheckoutWithValidCart() {
  var cart = CreateCart();
  cart.Add(product);
  var result = await checkout(cart, paymentMethod);
  Assert.Equal("confirmed", result.Status);
}
```

Characteristics:
- Tests behavior users/callers care about
- Uses public API only
- Survives internal refactors
- Describes WHAT, not HOW
- Related assertions may verify one observable behavior, including persisted state

### Bad Tests
**Implementation-detail tests**: Coupled to internal structure.

```csharp
// BAD: Tests implementation details
[Fact]
public async Task CheckoutCallsPaymentServiceProcess() {
  var mockPayment = new Mock<IPaymentService>();
  await checkout(cart, mockPayment.Object);
  mockPayment.Verify(x => x.Process(cart.Total), Times.Once);
}
```

Red flags:
- Mocking internal collaborators
- Testing private methods
- Asserting incidental call counts/order (required side-effect counts and ordering can be contractual)
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Prefer public behavior; direct database assertions are appropriate for persistence and constraint requirements

```csharp
// Appropriate when the requirement specifically includes persistence
[Fact]
public async Task CreateUserSavesToDatabase() {
  await CreateUser("Alice");
  var row = await db.Query("SELECT * FROM users WHERE name = 'Alice'");
  Assert.NotNull(row);
}

// GOOD: Verifies through interface
[Fact]
public async Task CreateUserMakesUserRetrievable() {
  var user = await CreateUser("Alice");
  var retrieved = await GetUser(user.Id);
  Assert.Equal("Alice", retrieved.Name);
}
```

## 2. When to Mock
Mock at **system boundaries** only:
- External APIs (payment, email, etc.)
- Databases (sometimes - prefer test DB/in-memory)
- Time/randomness
- File system (sometimes)

Avoid mocking internal collaborators merely to mirror implementation. When an integration
factory replaces orchestration or another boundary, preserve required domain side effects.
For example, a workflow-trigger fake must persist the WorkflowInstance and WorkflowTask
state that subsequent reads assert; an empty success object is insufficient. Inspect
`api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` and the selected tests. In-memory
providers cannot prove PostgreSQL constraints or relational update behavior.

## 3. Designing for Mockability
At system boundaries, design interfaces that are easy to mock:

**1. Use dependency injection**
Pass external dependencies in rather than creating them internally.

**2. Prefer SDK-style interfaces over generic fetchers**
Create specific functions for each external operation instead of one generic function with conditional logic:

```csharp
// GOOD: Each function is independently mockable
public interface IApi {
  Task<User> GetUser(string id);
  Task<List<Order>> GetOrders(string userId);
  Task CreateOrder(OrderData data);
}

// BAD: Mocking requires conditional logic inside the mock setup
public interface IApi {
  Task<HttpResponseMessage> Fetch(string endpoint, HttpMethod method);
}
```

The SDK approach means:
- Each operation has a typed contract
- Stateful mocks retain method dispatch, persistence, retry and status transitions; conditional behavior is necessary when callers observe it
- Easier to see which endpoints a test exercises
- Type safety per endpoint
