# Architecture Guidelines (C# & .NET)

## 1. Deep Modules
From "A Philosophy of Software Design":

**Deep module** = small interface + lots of implementation

```
┌─────────────────────┐
│   Small Interface   │  ← Few methods, simple params
├─────────────────────┤
│                     │
│                     │
│  Deep Implementation│  ← Complex logic hidden
│                     │
│                     │
└─────────────────────┘
```

**Shallow module** = large interface + little implementation (avoid)

```
┌─────────────────────────────────┐
│       Large Interface           │  ← Many methods, complex params
├─────────────────────────────────┤
│  Thin Implementation            │  ← Just passes through
└─────────────────────────────────┘
```

When designing interfaces, ask:
- Can I reduce the number of methods?
- Can I simplify the parameters?
- Can I hide more complexity inside?

## 2. Interface Design for Testability
Good interfaces make testing natural:

1. **Accept dependencies, don't create them**
   ```csharp
   // Testable
   public void ProcessOrder(Order order, IPaymentGateway gateway) {}

   // Hard to test
   public void ProcessOrder(Order order) {
     var gateway = new StripeGateway();
   }
   ```

2. **Prefer pure calculations where appropriate**
   Persistence and workflow operations intentionally have side effects; retain and test their observable results.
   ```csharp
   // Testable
   public Discount CalculateDiscount(Cart cart) {}

   // Hard to test
   public void ApplyDiscount(Cart cart) {
     cart.Total -= discount;
   }
   ```

3. **Small surface area**
   - Fewer methods = fewer tests needed
   - Fewer params = simpler test setup

## 3. Refactor Candidates
Within the selected scope after Green, consider these only when needed for the change. Do not turn observations into adjacent cleanup:

- **Duplication** → Extract function/class
- **Long methods** → Break into private helpers (keep tests on public interface)
- **Shallow modules** → Combine or deepen
- **Feature envy** → Move logic to where data lives
- **Primitive obsession** → Introduce value objects
- **Existing code** required by the selected behavior; report unrelated issues separately
