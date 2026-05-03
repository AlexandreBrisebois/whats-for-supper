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
- One logical assertion per test

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
- Asserting on call counts/order
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Verifying through external means instead of interface

```csharp
// BAD: Bypasses interface to verify
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

Don't mock:
- Your own classes/modules
- Internal collaborators
- Anything you control

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
- Each mock returns one specific shape
- No conditional logic in test setup
- Easier to see which endpoints a test exercises
- Type safety per endpoint
