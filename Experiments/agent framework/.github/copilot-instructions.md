# C# Agent Instructions for Modern Development

These instructions provide comprehensive guidance for AI coding assistants (Copilot, etc.) when working on C# projects. They establish best practices rooted in Microsoft's official C# coding standards, SOLID principles, and proven patterns for building maintainable, scalable C# applications.

## 1. C# Naming Conventions

Consistent naming is critical for code readability and maintainability. Follow these C#-specific conventions strictly:

### 1.1 Type Naming

- **Classes**: Use `PascalCase` (e.g., `DataService`, `UserRepository`)
- **Interfaces**: Prefix with `I` in `PascalCase` (e.g., `IWorkerQueue`, `IRepository<T>`, `IDataService`)
- **Structs**: Use `PascalCase` (e.g., `Point`, `ValueCoordinate`)
- **Enums**: Use `PascalCase` with singular name for non-flags, plural for flags (e.g., `Status`, `FilePermissions`)
- **Delegates**: Use `PascalCase` with `Delegate` suffix (e.g., `EventHandlerDelegate`)
- **Type Parameters (Generics)**: Use single capital letter or `T` prefix with descriptive name (e.g., `T`, `TSession`, `TEntity`, `TKey`, `TValue`)

### 1.2 Member Naming

- **Public Methods**: Use `PascalCase` (e.g., `GetUser()`, `SaveAsync()`)
- **Public Properties**: Use `PascalCase` (e.g., `FirstName`, `IsEnabled`, `Count`)
- **Public Events**: Use `PascalCase` (e.g., `DataChanged`, `ProcessingComplete`)
- **Public Constants**: Use `PascalCase` (e.g., `MaxRetries`, `DefaultTimeout`)

### 1.3 Private/Internal Member Naming

- **Private/Internal Fields**: Prefix with `_` and use `camelCase` (e.g., `_userId`, `_workerQueue`, `_logger`)
- **Static Private Fields**: Prefix with `s_` and use `camelCase` (e.g., `s_staticCache`, `s_defaultInstance`)
- **Thread-Static Fields**: Prefix with `t_` and use `camelCase` (e.g., `t_threadLocalData`)
- **Private Methods**: Use `PascalCase` (e.g., `ValidateInput()`, `ProcessData()`)

### 1.4 Parameter and Local Variable Naming

- **Method Parameters**: Use `camelCase` (e.g., `userId`, `isActive`, `maxRetries`)
- **Local Variables**: Use `camelCase` (e.g., `processedItems`, `currentIndex`, `hasErrors`)
- **Primary Constructor Parameters (classes/structs)**: Use `camelCase` (e.g., `public class DataService(ILogger logger, IRepository repository)`)
- **Primary Constructor Parameters (records)**: Use `PascalCase` as they become public properties (e.g., `public record Person(string FirstName, string LastName)`)

### 1.5 General Naming Guidelines

- Avoid abbreviations unless widely recognized (use `userId` instead of `uId`)
- Use meaningful, descriptive names that clarify intent
- Prefer clarity over brevity—longer names are acceptable if they improve understanding
- Avoid single-letter names except for loop counters (`i`, `j`, `k`)
- Avoid consecutive underscores (reserved for compiler-generated identifiers)

---

## 2. Null Safety and Nullable Reference Types

C# 8.0+ provides nullable reference types (NRT) to prevent `NullReferenceException` at runtime. Modern C# development **must** leverage this feature.

### 2.1 Enabling Nullable Reference Types

- Enable globally in `.csproj`: `<Nullable>enable</Nullable>`
- Or use pragmas for file-by-file migration: `#nullable enable` at the top of source files
- In the project file or file-scoped pragmas, set: `<Nullable>enable</Nullable>` to enforce both annotation and warning checks

### 2.2 Type Annotations

- **Non-nullable reference** (default when nullable is enabled): `string name;`
  - Must be initialized to a non-null value
  - Cannot be assigned `null` after initialization
  - Can be dereferenced safely without null checks

- **Nullable reference**: `string? name;`
  - Can be assigned `null`
  - Must be null-checked before dereferencing
  - Use pattern matching for safety: `if (name is not null) { ... }`

### 2.3 Null-State Analysis

The compiler tracks null-state as either **not-null** or **maybe-null**:

```csharp
string? message = null;  // maybe-null

// This would generate a warning - dereferencing a maybe-null variable
// Console.WriteLine(message.Length);  // ⚠️ Warning: CS8602

// After null check, message is not-null
if (message is not null)
{
    Console.WriteLine(message.Length);  // ✓ Safe
}

// Ternary operator maintains null-state
message = "Hello";  // explicitly assigned non-null
Console.WriteLine(message.Length);  // ✓ Safe
```

### 2.4 API Annotations with Attributes

When your methods interact with nullability in ways the compiler can't infer, use attributes:

- `[NotNull]`: Return value is never null
- `[NotNullWhen(bool)]`: Parameter/return is not-null when condition is met
- `[MaybeNull]`: Return value might be null even if type appears non-nullable
- `[MemberNotNull(params)]`: Method ensures parameters are not-null after completion
- `[AllowNull]`: Parameter can accept null even if type is non-nullable

```csharp
public bool TryGetUser([NotNullWhen(true)] out User? user)
{
    if (UserDatabase.TryFind(out var found))
    {
        user = found;
        return true;
    }
    user = null;
    return false;
}
```

### 2.5 Null-Coalescing and Null-Forgiving

- **Null-coalescing operator** (`??`): Provide default for null values
  ```csharp
  string name = input ?? "Unknown";
  ```

- **Null-forgiving operator** (`!`): Override compiler analysis when certain value is non-null
  ```csharp
  // Only use when you're certain the value won't be null
  string value = possiblyNull!.ToString();
  ```

### 2.6 Best Practices

- Always enable nullable reference types in new projects
- Use null checks consistently: `if (value is not null)` or `if (value != null)`
- Annotate public API signatures with appropriate nullable attributes
- Validate parameters early: `ArgumentNullException.ThrowIfNull(parameter)`
- Use the null-forgiving operator (`!`) sparingly and only with justification

---

## 3. Asynchronous Programming with async/await

C# provides first-class support for asynchronous programming. Use it correctly to prevent deadlocks and ensure responsive applications.

### 3.1 Fundamental Rules

- **Use `async` methods for I/O-bound operations** (network calls, file I/O, database access)
- **Return `Task<T>` or `Task`**, never `void` except for event handlers
- **Add `Async` suffix** to all async method names (e.g., `GetUserAsync()`, `SaveAsync()`)
- **Use `await` throughout the call stack** rather than blocking with `.Result` or `.Wait()`

### 3.2 Method Signatures

```csharp
// ✓ Correct
public async Task<User> GetUserAsync(int userId)
{
    return await _repository.FindAsync(userId);
}

// ✓ Correct - no return value
public async Task ProcessDataAsync()
{
    await _service.ExecuteAsync();
}

// ✓ Correct - event handler only exception to async void
private async void OnButtonClick(object sender, EventArgs e)
{
    await ProcessAsync();
}

// ❌ Avoid - async void outside event handlers
public async void DoSomethingAsync()  // Bad pattern
{
    await Task.Delay(1000);
}
```

### 3.3 I/O-Bound vs CPU-Bound

| Scenario | Pattern | Notes |
|----------|---------|-------|
| **I/O-Bound** (HTTP, DB, file) | `await _service.GetAsync()` | Don't use `Task.Run()` for I/O |
| **CPU-Bound** (calculations) | `await Task.Run(() => ExpensiveCalculation())` | Offload to thread pool |

### 3.4 Handling Multiple Async Operations

```csharp
// ✓ Wait for all tasks concurrently
var results = await Task.WhenAll(
    GetUserAsync(id1),
    GetUserAsync(id2),
    GetUserAsync(id3)
);

// ✓ Complete as soon as any task finishes
var firstCompleted = await Task.WhenAny(tasks);

// ⚠️ AVOID with LINQ - deferred execution
var tasks = userIds.Select(id => GetUserAsync(id));  // Not executed yet!
// Must force evaluation:
var results = await Task.WhenAll(userIds.Select(id => GetUserAsync(id)).ToArray());
```

### 3.5 Synchronous Access to Async Methods (Discouraged)

When you **must** block on async code (rare), prefer this order:

```csharp
// 1. ✓ Preferred - GetAwaiter().GetResult()
var result = task.GetAwaiter().GetResult();

// 2. ✓ For complex scenarios - Task.Run isolation
var result = Task.Run(async () => await GetDataAsync()).GetAwaiter().GetResult();

// 3. ❌ Avoid - Task.Wait() or Task.Result wrap in AggregateException
// var result = task.Result;  // Avoid this
```

### 3.6 ConfigureAwait Considerations

For library code, use `ConfigureAwait(false)` to avoid pumping UI context:

```csharp
// Library code - don't need UI context
public async Task<Data> FetchAsync()
{
    var response = await _httpClient.GetAsync(url).ConfigureAwait(false);
    return await response.Content.ReadAsAsync<Data>().ConfigureAwait(false);
}

// UI code - keep ConfigureAwait(true) [default]
private async void OnLoadClick()
{
    var data = await _service.FetchAsync();  // Automatically ConfigureAwait(true)
    UpdateUI(data);
}
```

### 3.7 ValueTask for Performance-Critical Code

Use `ValueTask<T>` instead of `Task<T>` when methods often complete synchronously:

```csharp
// Performance-sensitive code with frequent synchronous completion
public ValueTask<CachedData> GetCachedAsync(string key)
{
    if (_cache.TryGetValue(key, out var cached))
    {
        return new ValueTask<CachedData>(cached);  // No allocation
    }
    return new ValueTask<CachedData>(FetchFromDatabaseAsync(key));
}
```

---

## 4. String Handling and Interpolation

Modern C# offers many ways to construct strings. Choose appropriately based on context.

### 4.1 String Interpolation (Preferred)

- **Use string interpolation** for readability and null-safety
  ```csharp
  string message = $"Hello, {user.Name}! You have {user.Credits} credits.";
  ```

- **Format specifiers** for numeric/date formatting
  ```csharp
  decimal price = 19.99m;
  string formatted = $"Price: {price:C2}";  // $19.99
  
  DateTime now = DateTime.Now;
  string dateStr = $"Date: {now:yyyy-MM-dd}";  // Date: 2026-02-11
  ```

### 4.2 Raw String Literals (C# 11+)

Use raw string literals for multi-line text, JSON, or regex patterns:

```csharp
// Raw string literals - no escaping needed
string json = """
    {
        "name": "John",
        "age": 30
    }
    """;

string regex = """[\w.]+@[\w.]+""";  // No need to escape backslashes

string path = """C:\Users\Developer\Projects""";  // Literal backslashes
```

### 4.3 StringBuilder for Loops

Use `StringBuilder` when concatenating in high-frequency loops:

```csharp
// ✓ Efficient for many concatenations
var sb = new StringBuilder();
for (int i = 0; i < 1000; i++)
{
    sb.Append(GetData(i));
}
string result = sb.ToString();

// ❌ Avoid for loops - creates new string each iteration
string result = "";
for (int i = 0; i < 1000; i++)
{
    result += GetData(i);  // O(n²) performance
}
```

### 4.4 Avoid String Positional Formatting

```csharp
// ❌ Avoid - hard to read
string message = string.Format("User {0} has {1} credits", user.Name, user.Credits);

// ✓ Prefer - clear intent
string message = $"User {user.Name} has {user.Credits} credits";
```

---

## 5. Collection Initialization and Expressions

Modern C# provides concise syntax for working with collections.

### 5.1 Collection Expressions (C# 12+)

```csharp
// New collection expression syntax - preferred
string[] vowels = ["a", "e", "i", "o", "u"];
List<int> numbers = [1, 2, 3, 4, 5];
Dictionary<string, int> ages = new() { { "Alice", 30 }, { "Bob", 25 } };

// Spread operator in collections
int[] moreNumbers = [..numbers, 6, 7, 8];
```

### 5.2 Object and Collection Initializers

```csharp
// Use initializers for cleaner construction
var person = new Person 
{ 
    FirstName = "John", 
    LastName = "Doe", 
    Age = 30 
};

// With LINQ
var people = new List<Person>
{
    new() { FirstName = "Alice", Age = 28 },
    new() { FirstName = "Bob", Age = 35 }
};
```

### 5.3 var with Collections

Use `var` for types that are obvious from initialization:

```csharp
// ✓ Type is clear
var users = new List<User>();
var items = GetItems();

// ❌ Type is unclear - be explicit
// var result = GetData();  // What is this?
IEnumerable<Order> orders = GetOrders();  // Clear
```

---

## 6. Modern C# Language Features

Leverage recent C# features for cleaner, more expressive code.

### 6.1 Records for Immutable Data

Use records for data classes, DTOs, and immutable objects:

```csharp
// Positional record (C# 9)
public record Person(string FirstName, string LastName, int Age);

var person = new Person("John", "Doe", 30);
var name = person.FirstName;  // Property access

// Record with inheritance
public record Employee(string FirstName, string LastName, int Age, string Department) 
    : Person(FirstName, LastName, Age);

// Equality comparison built-in
var person1 = new Person("John", "Doe", 30);
var person2 = new Person("John", "Doe", 30);
bool isEqual = person1 == person2;  // true
```

### 6.2 Primary Constructors (C# 12)

Classes and structs can have primary constructor parameters:

```csharp
public class DataService(ILogger logger, IRepository repository)
{
    private readonly ILogger _logger = logger;
    private readonly IRepository _repository = repository;

    public async Task ProcessAsync()
    {
        _logger.Information("Processing started");
        // Use repository
    }
}

// For records - parameters become public properties
public record UserDto(string Id, string Email, string Name);
```

### 6.3 Init-Only Properties

Use `init` to make properties settable only during initialization:

```csharp
public class User
{
    public string Id { get; init; }  // Can only be set during initialization
    public string Email { get; set; }  // Normal property
    public string? MiddleName { get; init; }  // Nullable init-only
}

// Usage
var user = new User { Id = "123", Email = "test@example.com" };
// user.Id = "456";  // ❌ Compile error - cannot set init-only property
```

### 6.4 Required Properties (C# 11)

Force explicit initialization of critical properties:

```csharp
public class LabelledContainer<T>
{
    public required string Label { get; set; }
    public required T Contents { get; init; }
}

// Must provide required properties
var container = new LabelledContainer<string> 
{ 
    Label = "Important", 
    Contents = "Data" 
};
// var empty = new LabelledContainer<string>();  // ❌ Compile error
```

### 6.5 Pattern Matching

Use pattern matching for cleaner conditional logic:

```csharp
// Type patterns
object obj = GetValue();
if (obj is User user)
{
    Console.WriteLine($"User: {user.Name}");
}

// Property patterns
if (person is { Age: > 18, IsActive: true })
{
    // Person is over 18 and active
}

// List patterns (C# 11)
if (numbers is [var first, .. var rest])
{
    // first is the first element, rest are the remaining
}
```

### 6.6 Switch Expressions

Replace switch statements with cleaner switch expressions:

```csharp
// ✓ Modern switch expression
string GetStatusMessage(Status status) => status switch
{
    Status.Active => "The system is running",
    Status.Idle => "The system is idle",
    Status.Error => "An error occurred",
    _ => "Unknown status"
};

// With property patterns
string GetUserRole(User user) => user switch
{
    { IsAdmin: true } => "Administrator",
    { IsManager: true } => "Manager",
    { IsActive: false } => "Inactive",
    _ => "User"
};
```

---

## 7. Error Handling and Exception Management

Proper error handling prevents unexpected failures and aids debugging.

### 7.1 Specific Exception Handling

```csharp
// ✓ Catch specific exceptions
try
{
    var user = await _repository.GetAsync(userId);
    ProcessUser(user);
}
catch (UserNotFoundException ex)
{
    _logger.Warning($"User {userId} not found: {ex.Message}");
    return NotFound();
}
catch (DatabaseException ex)
{
    _logger.Error($"Database error: {ex}", ex);
    return StatusCode(500, "Database error occurred");
}

// ❌ Avoid catching Exception without filtering
// catch (Exception ex)  // Too broad - hides bugs
```

### 7.2 Using Statements for Resource Management

```csharp
// ✓ Modern using statement - automatic disposal
using var file = File.OpenRead("data.txt");
var data = await file.ReadAsync(buffer, 0, buffer.Length);

// ✓ Traditional using block
using (var connection = new SqlConnection(connectionString))
{
    await connection.OpenAsync();
    // Use connection
}  // Automatically disposed
```

### 7.3 Null Validation

```csharp
// ✓ Preferred - ArgumentNullException.ThrowIfNull
public class UserService
{
    public UserService(IRepository repository)
    {
        ArgumentNullException.ThrowIfNull(repository);
        _repository = repository;
    }
}

// For complex validation
public void ProcessOrder(Order order)
{
    ArgumentNullException.ThrowIfNull(order);
    ArgumentNullException.ThrowIfNull(order.Items);
    
    if (order.Items.Count == 0)
        throw new ArgumentException("Order must contain items", nameof(order));
}
```

### 7.4 Custom Result Types (Alternative to Exceptions)

For domain logic, consider Result types instead of throwing exceptions:

```csharp
public class Result<T>
{
    public bool IsSuccess { get; set; }
    public T? Data { get; set; }
    public string? Error { get; set; }
}

// Usage - more explicit error handling
public async Task<Result<User>> GetUserAsync(int userId)
{
    try
    {
        var user = await _repository.FindAsync(userId);
        if (user == null)
            return new Result<User> { IsSuccess = false, Error = "User not found" };

        return new Result<User> { IsSuccess = true, Data = user };
    }
    catch (Exception ex)
    {
        return new Result<User> { IsSuccess = false, Error = ex.Message };
    }
}
```

---

## 8. Dependency Injection and Object Composition

Leverage DI for loose coupling and testability.

### 8.1 Constructor Injection (Preferred)

```csharp
public class UserService
{
    private readonly IRepository<User> _repository;
    private readonly IEmailService _emailService;
    private readonly ILogger _logger;

    // Inject dependencies via constructor
    public UserService(IRepository<User> repository, IEmailService emailService, ILogger logger)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task RegisterAsync(User user)
    {
        await _repository.AddAsync(user);
        await _emailService.SendConfirmationAsync(user.Email);
        _logger.Information($"User {user.Id} registered");
    }
}
```

### 8.2 Service Registration

In your Startup/Program.cs:

```csharp
// ASP.NET Core example
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddScoped<IRepository<User>, UserRepository>()
    .AddScoped<IEmailService, EmailService>()
    .AddScoped<UserService>()
    .AddLogging();

var app = builder.Build();
```

### 8.3 Interface Segregation

Create focused interfaces following ISP:

```csharp
// ❌ Too broad
public interface IUserService
{
    Task<User> GetUserAsync(int id);
    Task SaveAsync(User user);
    Task SendEmailAsync(string email);
    Task GenerateReportAsync();
}

// ✓ Segregated
public interface IUserRepository
{
    Task<User> GetAsync(int id);
    Task SaveAsync(User user);
}

public interface IEmailService
{
    Task SendAsync(string email, string subject, string body);
}

public interface IReportGenerator
{
    Task<Report> GenerateAsync(ReportRequest request);
}
```

---

## 9. Testing Best Practices

Write testable code and comprehensive tests.

### 9.1 Unit Test Structure (AAA Pattern)

```csharp
[TestFixture]
public class UserServiceTests
{
    private UserService _userService;
    private Mock<IRepository<User>> _mockRepository;

    [SetUp]
    public void Setup()
    {
        _mockRepository = new Mock<IRepository<User>>();
        _userService = new UserService(_mockRepository.Object);
    }

    [Test]
    public async Task GetUserAsync_WithValidId_ReturnsUser()
    {
        // Arrange
        var userId = 1;
        var expectedUser = new User { Id = userId, Name = "John Doe" };
        _mockRepository
            .Setup(r => r.GetAsync(userId))
            .ReturnsAsync(expectedUser);

        // Act
        var result = await _userService.GetUserAsync(userId);

        // Assert
        Assert.That(result, Is.EqualTo(expectedUser));
        _mockRepository.Verify(r => r.GetAsync(userId), Times.Once);
    }

    [Test]
    public async Task SaveAsync_WithNullUser_ThrowsArgumentNullException()
    {
        // Act & Assert
        Assert.ThrowsAsync<ArgumentNullException>(
            async () => await _userService.SaveAsync(null)
        );
    }
}
```

### 9.2 Testable Code Design

- **Inject dependencies** - enables mocking
- **Avoid static methods** - difficult to test
- **Use interfaces** - allows substitution
- **Keep methods focused** - easier to unit test
- **Return Task, not void** - allows proper async testing

```csharp
// ✓ Testable - dependencies injected
public class OrderProcessor
{
    private readonly IPaymentGateway _paymentGateway;
    private readonly IInventoryService _inventory;

    public OrderProcessor(IPaymentGateway paymentGateway, IInventoryService inventory)
    {
        _paymentGateway = paymentGateway;
        _inventory = inventory;
    }

    public async Task<OrderResult> ProcessAsync(Order order)
    {
        var payment = await _paymentGateway.ChargeAsync(order.Total);
        if (!payment.IsSuccessful)
            return OrderResult.PaymentFailed();

        await _inventory.UpdateAsync(order);
        return OrderResult.Success();
    }
}
```

### 9.3 Integration Testing

Test interactions between components:

```csharp
[TestFixture]
public class UserServiceIntegrationTests
{
    private IServiceProvider _serviceProvider;

    [SetUp]
    public void Setup()
    {
        var services = new ServiceCollection();
        services
            .AddScoped<IUserRepository, UserRepository>()
            .AddScoped<IEmailService, EmailService>()
            .AddScoped<UserService>()
            .AddScoped<IDbContext, TestDbContext>();  // Use test database

        _serviceProvider = services.BuildServiceProvider();
    }

    [Test]
    public async Task RegisterAsync_CreatesUserAndSendsEmail()
    {
        // Arrange
        var userService = _serviceProvider.GetRequiredService<UserService>();
        var user = new User { Email = "test@example.com", Name = "Test User" };

        // Act
        await userService.RegisterAsync(user);

        // Assert
        var repo = _serviceProvider.GetRequiredService<IUserRepository>();
        var savedUser = await repo.GetAsync(user.Id);
        Assert.That(savedUser, Is.Not.Null);
    }
}
```

---

## 10. Code Organization and Project Structure

### 10.1 File and Namespace Organization

```
Project/
├── Core/
│   ├── Domain/
│   │   ├── Entities/
│   │   │   ├── User.cs
│   │   │   ├── Order.cs
│   │   └── ValueObjects/
│   │       ├── Email.cs
│   │       ├── Money.cs
│   ├── Interfaces/
│   │   ├── IRepository.cs
│   │   ├── IEmailService.cs
│   ├── Exceptions/
│   │   ├── DomainException.cs
├── Application/
│   ├── Services/
│   │   ├── UserService.cs
│   │   ├── OrderService.cs
│   ├── DTOs/
│   │   ├── CreateUserDto.cs
│   ├── Mappings/
│   │   └── MappingProfile.cs
├── Infrastructure/
│   ├── Repositories/
│   │   ├── UserRepository.cs
│   ├── Services/
│   │   ├── EmailService.cs
│   ├── Data/
│   │   ├── AppDbContext.cs
├── Presentation/
│   ├── Controllers/
│   │   ├── UsersController.cs
│   ├── Middleware/
│   │   ├── ErrorHandlingMiddleware.cs
├── Tests/
│   ├── Unit/
│   ├── Integration/
```

### 10.2 Using Statements Organization

Place using statements outside namespace declarations for clarity:

```csharp
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using MyProject.Core.Interfaces;

namespace MyProject.Application.Services;

public class UserService
{
    // Implementation
}
```

---

## 11. Code Analysis and Linting

Enable compiler checks and automated tooling.

### 11.1 .editorconfig

Create a `.editorconfig` at the repository root:

```ini
root = true

[*.cs]
# New line preferences
csharp_new_line_before_open_brace = all
csharp_new_line_before_else = true

# Indentation preferences
indent_size = 4
indent_style = space
tab_size = 4

# Naming conventions
dotnet_naming_style.pascal_case_style.capitalization = pascal_case
dotnet_naming_style.camel_case_style.capitalization = camel_case

dotnet_naming_rule.public_members_pascal_case.severity = suggestion
dotnet_naming_rule.public_members_pascal_case.symbols = public_symbols
dotnet_naming_rule.public_members_pascal_case.style = pascal_case_style

# Suppress known safe patterns
dotnet_diagnostic.CS8618.severity = none  # Non-nullable property not initialized
```

### 11.2 Roslyn Analyzers

Enable recommended analyzers in `.csproj`:

```xml
<PropertyGroup>
    <AnalysisLevel>latest</AnalysisLevel>
    <EnableNETAnalyzers>true</EnableNETAnalyzers>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
</PropertyGroup>
```

---

## 12. AI Assistant Responsibilities When Working with C#

When generating or reviewing C# code, AI assistants must:

1. **Validate Naming Conventions**: Ensure all identifiers follow C# conventions specified above
2. **Enforce Null Safety**: Enable nullable reference types and use proper annotations
3. **Async-First Approach**: Default to async/await for I/O operations
4. **Dependency Injection**: Design for testability with constructor injection
5. **SOLID Compliance**: Verify code adheres to SOLID principles
6. **Exception Handling**: Use specific exceptions and proper null validation
7. **Collection Usage**: Prefer modern collection expressions and LINQ
8. **Language Features**: Leverage records, primary constructors, pattern matching where appropriate
9. **Test Generation**: Include unit tests with AAA pattern
10. **Documentation**: Generate XML comments for public APIs

---

## 13. Additional Resources

- [Microsoft C# Coding Conventions](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions)
- [Nullable Reference Types](https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references)
- [Async/Await Best Practices](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-scenarios)
- [C# Language Versions](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/configure-language-version)
- [Framework Design Guidelines](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/)
