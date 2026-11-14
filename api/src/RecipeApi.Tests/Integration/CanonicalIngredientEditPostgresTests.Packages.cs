using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RecipeApi.Data;
using RecipeApi.Dto;
using RecipeApi.Services;
using RecipeApi.Tests.Infrastructure;
using Xunit;

namespace RecipeApi.Tests.Integration;

public sealed partial class CanonicalIngredientEditPostgresTests
{
    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryDeclaredPackage_NullDefinitionInputSavesCountAndFixedCapacityWithoutChangingOriginalRows()
    {
        await WithEditor(async (factory, before) =>
        {
            using var client = factory.CreateAuthenticatedClient();
            string storedBefore;
            string metadataBefore;
            int operationsBefore;
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.AsNoTracking().SingleAsync(recipe => recipe.Id == Id);
                storedBefore = JsonSerializer.Serialize(recipe, Json);
                metadataBefore = recipe.RawMetadata!;
                operationsBefore = await db.CanonicalRecipeOperations.CountAsync();
            }
            var declared = new RecipeIngredientLineInput
            {
                ClientId = "declared-package-tomatoes",
                Description = "tomatoes",
                Amount = LegacyGroceryQuantity.Parse("2"),
                AmountText = "2",
                Unit = new("cans", null),
                Scaling = "proportional",
                Package = new(new("cans", null), new(LegacyGroceryQuantity.Parse("400")!, new("g", null)), "net"),
                Shopping = new("tomatoes", null, null)
            };
            using var response = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = before.ContentRevision,
                ingredientLines = new[] { Row(before.IngredientLines[0]), Row(before.IngredientLines[1]), declared }
            });
            var responseText = await response.Content.ReadAsStringAsync();
            output.WriteLine($"Ordinary declared package PATCH HTTP {(int)response.StatusCode}: {responseText}");
            if (response.StatusCode != HttpStatusCode.OK)
            {
                using var rejectedScope = factory.Services.CreateScope();
                var rejectedDb = rejectedScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                Assert.Equal(storedBefore, JsonSerializer.Serialize(await rejectedDb.Recipes.AsNoTracking()
                    .SingleAsync(recipe => recipe.Id == Id), Json));
                Assert.Equal(operationsBefore, await rejectedDb.CanonicalRecipeOperations.CountAsync());
            }
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var result = JsonDocument.Parse(responseText);
            var savedId = result.RootElement.GetProperty("createdIds").GetProperty("declared-package-tomatoes").GetGuid();
            Assert.NotEqual(Guid.Empty, savedId);
            using var read = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{Id}"));
            var wire = read.RootElement.GetProperty("recipe");
            var savedWire = wire.GetProperty("ingredientLines").EnumerateArray()
                .Single(row => row.GetProperty("id").GetGuid() == savedId);
            Assert.Equal("cans", savedWire.GetProperty("unit").GetProperty("text").GetString());
            Assert.Equal(JsonValueKind.Null, savedWire.GetProperty("unit").GetProperty("definitionId").ValueKind);
            var packageWire = savedWire.GetProperty("package");
            Assert.Equal("cans", packageWire.GetProperty("countUnit").GetProperty("text").GetString());
            Assert.Equal(JsonValueKind.Null, packageWire.GetProperty("countUnit").GetProperty("definitionId").ValueKind);
            Assert.Equal("net", packageWire.GetProperty("basis").GetString());
            Assert.Equal(LegacyGroceryQuantity.Parse("400"), packageWire.GetProperty("capacity").GetProperty("amount").Deserialize<GroceryQuantity>(Json));
            Assert.Equal("g", packageWire.GetProperty("capacity").GetProperty("unit").GetProperty("text").GetString());
            Assert.Equal(JsonValueKind.Null, packageWire.GetProperty("capacity").GetProperty("unit").GetProperty("definitionId").ValueKind);

            using var savedScope = factory.Services.CreateScope();
            var savedDb = savedScope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            var savedRecipe = await savedDb.Recipes.AsNoTracking().SingleAsync(recipe => recipe.Id == Id);
            var content = CanonicalRecipeContentStore.Read(savedRecipe)!;
            Assert.NotEqual(before.ContentRevision, content.ContentRevision);
            Assert.Equal(before.SourceRevision, content.SourceRevision);
            Assert.Equal(before.Servings, content.Servings);
            Assert.Equal(before.Servings, savedRecipe.Servings);
            Assert.Equal(metadataBefore, savedRecipe.RawMetadata);
            Assert.Equal(JsonSerializer.Serialize(before.InstructionSections, Json), JsonSerializer.Serialize(content.InstructionSections, Json));
            Assert.Equal(3, content.IngredientLines.Count);
            for (var index = 0; index < before.IngredientLines.Count; index++)
                Assert.Equal(JsonSerializer.Serialize(before.IngredientLines[index], Json), JsonSerializer.Serialize(content.IngredientLines[index], Json));
            var saved = content.IngredientLines[2];
            Assert.Equal(savedId, saved.Id);
            Assert.Equal(declared.Amount, saved.Amount);
            Assert.Equal(declared.Package, saved.Package);
            Assert.Equal("human", saved.Provenance.Origin);
            Assert.Null(saved.Provenance.SourceRef);
            Assert.Contains("package", saved.Provenance.ProtectedFields);
            Assert.Contains("unit", saved.Provenance.ProtectedFields);
            Assert.Contains("amount", saved.Provenance.ProtectedFields);
        });
    }

    private static RecipeIngredientLineInput DeclaredPackageRow(string clientId, string capacity = "400", string basis = "net") => new()
    {
        ClientId = clientId, Description = "tomatoes", Amount = LegacyGroceryQuantity.Parse("2"), AmountText = "2",
        Unit = new("cans", null), Scaling = "proportional",
        Package = new(new("cans", null), new(LegacyGroceryQuantity.Parse(capacity)!, new("g", null)), basis),
        Shopping = new("tomatoes", null, null)
    };

    private static async Task<CanonicalRecipeContent> ReadDeclaredPackageContent(TestWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        return CanonicalRecipeContentStore.Read(await scope.ServiceProvider.GetRequiredService<RecipeDbContext>()
            .Recipes.AsNoTracking().SingleAsync(recipe => recipe.Id == Id))!;
    }

    private static async Task<(string Recipe, int Operations)> DeclaredPackageState(TestWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
        return (JsonSerializer.Serialize(await db.Recipes.AsNoTracking().SingleAsync(recipe => recipe.Id == Id), Json),
            await db.CanonicalRecipeOperations.CountAsync());
    }

    private static async Task<CanonicalRecipeContent> SaveDeclaredPackageRows(TestWebApplicationFactory factory,
        CanonicalRecipeContent current, params RecipeIngredientLineInput[] rows)
    {
        using var client = factory.CreateAuthenticatedClient();
        using var response = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
        {
            expectedContentRevision = current.ContentRevision, ingredientLines = rows
        });
        Assert.True(response.StatusCode == HttpStatusCode.OK,
            $"Expected ordinary package Save HTTP200, got {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return await ReadDeclaredPackageContent(factory);
    }

    private static void AssertDeclaredPackageUnrelatedFacts(CanonicalRecipeContent before, CanonicalRecipeContent current)
    {
        Assert.Equal(before.SourceRevision, current.SourceRevision);
        Assert.Equal(before.Servings, current.Servings);
        Assert.Equal(JsonSerializer.Serialize(before.InstructionSections, Json), JsonSerializer.Serialize(current.InstructionSections, Json));
        foreach (var original in before.IngredientLines)
            Assert.Equal(JsonSerializer.Serialize(original, Json),
                JsonSerializer.Serialize(Assert.Single(current.IngredientLines, row => row.Id == original.Id), Json));
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryDeclaredPackage_LiteralEditsKeepZeroRangeIndependentUnitAndExplicitClearThroughReorder()
    {
        await WithEditor(async (factory, before) =>
        {
            var current = await SaveDeclaredPackageRows(factory, before,
                Row(before.IngredientLines[0]), Row(before.IngredientLines[1]), DeclaredPackageRow("package-literal"));
            var packageId = current.IngredientLines[2].Id;
            foreach (var (amount, basis) in new[] { ("0", "drained"), ("350–450", "unspecified") })
            {
                var old = current;
                var row = current.IngredientLines.Single(row => row.Id == packageId);
                var package = row.Package! with { Capacity = row.Package.Capacity with { Amount = LegacyGroceryQuantity.Parse(amount)! }, Basis = basis };
                current = await SaveDeclaredPackageRows(factory, current,
                    Row(current.IngredientLines[0]), Row(current.IngredientLines[1]), Row(row) with { Package = package });
                Assert.NotEqual(old.ContentRevision, current.ContentRevision);
                Assert.Equal(package, current.IngredientLines[2].Package);
                Assert.Equal(packageId, current.IngredientLines[2].Id);
                AssertDeclaredPackageUnrelatedFacts(before, current);
            }
            var selected = current.IngredientLines.Single(row => row.Id == packageId);
            var independent = selected.Package! with { CountUnit = new("tins", null) };
            current = await SaveDeclaredPackageRows(factory, current,
                Row(selected) with { Unit = null, Package = independent }, Row(before.IngredientLines[1]), Row(before.IngredientLines[0]));
            Assert.Equal(new[] { packageId, before.IngredientLines[1].Id, before.IngredientLines[0].Id }, current.IngredientLines.Select(row => row.Id));
            Assert.Null(current.IngredientLines[0].Unit);
            Assert.Equal("tins", current.IngredientLines[0].Package!.CountUnit.Text);
            Assert.Equal(independent, current.IngredientLines[0].Package);
            AssertDeclaredPackageUnrelatedFacts(before, current);
            // A following semantic Save must not fill the independently cleared row unit from the package count label.
            current = await SaveDeclaredPackageRows(factory, current,
                current.IngredientLines.Select(row => row.Id == packageId ? Row(row, "3") : Row(row)).ToArray());
            Assert.Null(current.IngredientLines[0].Unit);
            Assert.Equal(independent, current.IngredientLines[0].Package);
            var stale = current;
            current = await SaveDeclaredPackageRows(factory, current,
                current.IngredientLines.Select(row => row.Id == packageId ? Row(row) with { Package = null } : Row(row)).ToArray());
            Assert.Null(current.IngredientLines[0].Package);
            Assert.Null(current.IngredientLines[0].Unit);
            Assert.Equal(LegacyGroceryQuantity.Parse("3"), current.IngredientLines[0].Amount);
            AssertDeclaredPackageUnrelatedFacts(before, current);
            using var client = factory.CreateAuthenticatedClient();
            var state = await DeclaredPackageState(factory);
            using var conflict = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
            {
                expectedContentRevision = stale.ContentRevision, name = "Must not partially save",
                ingredientLines = stale.IngredientLines.Select(row => Row(row)).ToArray()
            });
            Assert.Equal(HttpStatusCode.Conflict, conflict.StatusCode);
            Assert.Equal(state, await DeclaredPackageState(factory));
            current = await SaveDeclaredPackageRows(factory, current,
                current.IngredientLines.Select(row => row.Id == packageId ? Row(row, "4") : Row(row)).ToArray());
            Assert.Null(current.IngredientLines[0].Package);
            Assert.Null(current.IngredientLines[0].Unit);
            AssertDeclaredPackageUnrelatedFacts(before, current);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryDeclaredPackage_NewNestedDefinitionsRejectAtomicallyAtEachPath()
    {
        await WithEditor(async (factory, before) =>
        {
            using var client = factory.CreateAuthenticatedClient();
            var state = await DeclaredPackageState(factory);
            var literal = DeclaredPackageRow("unqualified-package");
            foreach (var invalid in new[]
            {
                literal with { Unit = new("cans", "count:can") },
                literal with { Package = literal.Package! with { CountUnit = new("cans", "count:can") } },
                literal with { Package = literal.Package! with { Capacity = literal.Package.Capacity with { Unit = new("g", "mass:g") } } }
            })
            {
                using var response = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
                {
                    expectedContentRevision = before.ContentRevision, name = "Must not partially save", servings = 6,
                    ingredientLines = new[] { Row(before.IngredientLines[0]), Row(before.IngredientLines[1]), invalid }
                });
                Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
                Assert.Equal(state, await DeclaredPackageState(factory));
            }
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryDeclaredPackage_RetainedDefinitionObjectsCarryOnlyAtTheirSavedPathAndMayBeCleared()
    {
        await WithEditor(async (factory, before) =>
        {
            // This baseline is explicitly seeded retained canonical data. It proves carrying qualified stored facts,
            // not an ordinary producer for dictionary definitions. The ordinary literal inlet has a separate test.
            var packageId = Guid.NewGuid();
            var retainedRow = new RecipeIngredientLineDto
            {
                Id = packageId, Description = "tomatoes", Amount = LegacyGroceryQuantity.Parse("2"), AmountText = "2",
                Unit = new("cans", "count:can"), Scaling = "proportional",
                Package = new(new("cans", "count:can"), new(LegacyGroceryQuantity.Parse("400")!, new("g", "mass:g")), "net"),
                Shopping = new("tomatoes", null, null), Provenance = new("source", before.SourceRevision, [])
            };
            var seeded = before with { ContentRevision = Guid.NewGuid().ToString("N"), IngredientLines = [.. before.IngredientLines, retainedRow] };
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.SingleAsync(recipe => recipe.Id == Id);
                recipe.CanonicalContent = JsonSerializer.Serialize(seeded, Json);
                recipe.Ingredients = JsonSerializer.Serialize(seeded.IngredientLines.Select(CanonicalRecipeContentStore.Render), Json);
                await db.SaveChangesAsync();
            }
            var current = await SaveDeclaredPackageRows(factory, seeded,
                Row(before.IngredientLines[0]), Row(before.IngredientLines[1]), Row(retainedRow) with
                {
                    Package = retainedRow.Package! with
                    {
                        Capacity = retainedRow.Package.Capacity with { Amount = LegacyGroceryQuantity.Parse("350–450")! }, Basis = "drained"
                    }
                });
            var selected = current.IngredientLines[2];
            Assert.Equal(retainedRow.Unit, selected.Unit);
            Assert.Equal(retainedRow.Package!.CountUnit, selected.Package!.CountUnit);
            Assert.Equal(retainedRow.Package.Capacity.Unit, selected.Package.Capacity.Unit);
            Assert.Equal(LegacyGroceryQuantity.Parse("350–450"), selected.Package.Capacity.Amount);
            Assert.Equal("drained", selected.Package.Basis);
            Assert.Equal("human", selected.Provenance.Origin);
            Assert.Equal(before.SourceRevision, selected.Provenance.SourceRef);
            Assert.Contains("package", selected.Provenance.ProtectedFields);
            AssertDeclaredPackageUnrelatedFacts(before, current);
            using var client = factory.CreateAuthenticatedClient();
            var state = await DeclaredPackageState(factory);
            foreach (var invalid in new[]
            {
                Row(selected) with { Unit = new("tins", "count:can") },
                Row(selected) with { Unit = new("cans", "count:tin") },
                Row(selected) with { Package = selected.Package with { CountUnit = new("tins", "count:can") } },
                Row(selected) with { Package = selected.Package with { CountUnit = new("cans", "count:tin") } },
                Row(selected) with { Package = selected.Package with { Capacity = selected.Package.Capacity with { Unit = new("grammes", "mass:g") } } },
                Row(selected) with { Package = selected.Package with { Capacity = selected.Package.Capacity with { Unit = new("g", "mass:kg") } } },
                Row(selected) with { Package = selected.Package with { CountUnit = selected.Package.Capacity.Unit } },
                Row(selected) with { Package = selected.Package with { Capacity = selected.Package.Capacity with { Unit = selected.Package.CountUnit } } }
            })
            {
                using var response = await client.PatchAsJsonAsync($"/api/recipes/{Id}", new
                {
                    expectedContentRevision = current.ContentRevision, name = "Must not partially save",
                    ingredientLines = new[] { Row(before.IngredientLines[0]), Row(before.IngredientLines[1]), invalid }
                });
                Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
                Assert.Equal(state, await DeclaredPackageState(factory));
            }
            current = await SaveDeclaredPackageRows(factory, current,
                Row(before.IngredientLines[0]), Row(before.IngredientLines[1]), Row(selected) with
                {
                    Unit = new("tins", null),
                    Package = selected.Package with
                    {
                        CountUnit = new("containers", null), Capacity = selected.Package.Capacity with { Unit = new("grammes", null) }
                    }
                });
            selected = current.IngredientLines[2];
            Assert.Null(selected.Unit!.DefinitionId);
            Assert.Equal("tins", selected.Unit.Text);
            Assert.Null(selected.Package!.CountUnit.DefinitionId);
            Assert.Equal("containers", selected.Package.CountUnit.Text);
            Assert.Null(selected.Package.Capacity.Unit.DefinitionId);
            Assert.Equal("grammes", selected.Package.Capacity.Unit.Text);
            Assert.Equal(packageId, selected.Id);
            AssertDeclaredPackageUnrelatedFacts(before, current);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryDeclaredPackage_UnlikeCapacityBasisAndUnpackagedDemandStaySeparateAndStable()
    {
        await WithEditor(async (factory, before) =>
        {
            var unpackaged = DeclaredPackageRow("unpackaged") with { Package = null };
            var current = await SaveDeclaredPackageRows(factory, before,
                Row(before.IngredientLines[0]), Row(before.IngredientLines[1]),
                DeclaredPackageRow("net400-first"), DeclaredPackageRow("net400-second"),
                DeclaredPackageRow("net800", "800"), DeclaredPackageRow("drained400", "400", "drained"),
                DeclaredPackageRow("unspecified400", "400", "unspecified"), unpackaged);
            var monday = new DateOnly(2026, 10, 12);
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var date = monday.AddDays(3); // The seed has one selected recipe occurrence in this week, on Thursday.
                Assert.Equal(Id, (await db.CalendarEvents.SingleAsync(row => row.Date == date && row.MealSlot == 0)).RecipeId);
                db.SupperServings.Add(new RecipeApi.Models.SupperServing { Date = date, OverrideServings = 8 });
                await db.SaveChangesAsync();
            }
            async Task<GroceryLineItemDto[]> ReadTomatoes()
            {
                using var scope = factory.Services.CreateScope();
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
                var plan = await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking()
                    .SingleAsync(plan => plan.WeekStartDate == monday);
                return JsonSerializer.Deserialize<List<GroceryLineItemDto>>(plan.GroceryItems)!
                    .Where(row => row.NormalizedKey == "tomato" && row.RecipeIds.Contains(Id)).ToArray();
            }
            var rows = await ReadTomatoes();
            Assert.Equal(5, rows.Length);
            Assert.Equal(5, rows.Select(row => row.RowId).Distinct().Count());
            Assert.Equal(5, rows.Select(row => row.DemandIdentity).Distinct().Count());
            Assert.Equal(new[] { "4", "4", "4", "4", "8" }, rows.Select(row => row.ExactQuantity!.Value!.N).Order(StringComparer.Ordinal));
            Assert.All(rows, row =>
            {
                Assert.Equal("cans", row.UnitText);
                Assert.True(row.QuantityComplete);
                Assert.Equal("1", row.ExactQuantity!.Value!.D);
                Assert.Equal(new[] { Id }, row.RecipeIds);
            });
            var snapshot = JsonSerializer.Serialize(rows.OrderBy(row => row.RowId), Json);
            Assert.Equal(snapshot, JsonSerializer.Serialize((await ReadTomatoes()).OrderBy(row => row.RowId), Json));
            current = await SaveDeclaredPackageRows(factory, current, current.IngredientLines.Reverse().Select(row => Row(row)).ToArray());
            AssertDeclaredPackageUnrelatedFacts(before, current);
            Assert.Equal(snapshot, JsonSerializer.Serialize((await ReadTomatoes()).OrderBy(row => row.RowId), Json));
            Assert.Equal(new[]
            {
                "tomato", "tomato (400 g / cans; drained)", "tomato (400 g / cans; net)",
                "tomato (400 g / cans; unspecified)", "tomato (800 g / cans; net)"
            }.Order(StringComparer.Ordinal), rows.Select(row => row.DisplayName).Order(StringComparer.Ordinal));
            Assert.Equal(LegacyGroceryQuantity.Parse("8"), rows.Single(row => row.DisplayName == "tomato (400 g / cans; net)").ExactQuantity);
        });
    }

    private static async Task<JsonElement> ReadDeclaredPackageDatedLine(TestWebApplicationFactory factory, Guid lineId, int target)
    {
        var date = new DateOnly(2026, 10, 15); // Existing selected recipe occurrence; no new assignment or extra contributor.
        Guid occurrenceId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
            occurrenceId = (await db.CalendarEvents.SingleAsync(row => row.Date == date && row.MealSlot == 0 && row.RecipeId == Id)).Id;
            var serving = await db.SupperServings.SingleOrDefaultAsync(row => row.Date == date);
            if (serving is null) db.SupperServings.Add(new RecipeApi.Models.SupperServing { Date = date, OverrideServings = target });
            else serving.OverrideServings = target;
            await db.SaveChangesAsync();
        }
        using var client = factory.CreateAuthenticatedClient();
        using var response = await client.GetAsync($"/api/recipes/{Id}/ingredient-projection?supperDate={date:yyyy-MM-dd}&context=assigned&occurrenceId={occurrenceId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var content = await ReadDeclaredPackageContent(factory);
        var index = content.IngredientLines.Select((row, index) => (row, index)).Single(pair => pair.row.Id == lineId).index;
        var line = body.RootElement.GetProperty("lines")[index];
        Assert.Equal("tomatoes", line.GetProperty("name").GetString());
        Assert.False(line.TryGetProperty("groceryPackage", out _));
        Assert.False(line.TryGetProperty("groceryObservation", out _));
        return line.Clone();
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryDeclaredPackage_PublicProjectionScalesOnlyCountAndDisplaysExactFixedCapacity()
    {
        await WithEditor(async (factory, before) =>
        {
            var current = await SaveDeclaredPackageRows(factory, before,
                Row(before.IngredientLines[0]), Row(before.IngredientLines[1]), DeclaredPackageRow("projected-package"));
            var packageId = current.IngredientLines[2].Id;
            var state = await DeclaredPackageState(factory);
            foreach (var (target, count) in new[] { (8, "4"), (2, "1"), (1, "1/2"), (4, "2"), (8, "4") })
            {
                var line = await ReadDeclaredPackageDatedLine(factory, packageId, target);
                Assert.Equal($"{count} cans tomatoes (400 g / cans; net)", line.GetProperty("displayText").GetString());
                Assert.Equal("2 cans tomatoes (400 g / cans; net)", line.GetProperty("originalText").GetString());
                Assert.Equal("cans", line.GetProperty("unitText").GetString());
                Assert.Equal("scaled", line.GetProperty("status").GetString());
                Assert.Empty(line.GetProperty("issues").EnumerateArray());
                Assert.Equal(state, await DeclaredPackageState(factory));
            }
            using var client = factory.CreateAuthenticatedClient();
            foreach (var (target, count) in new[] { (2, "1"), (4, "2"), (6, "3") })
            {
                using var preview = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{Id}/ingredient-preview?targetServings={target}"));
                Assert.Equal($"{count} cans tomatoes (400 g / cans; net)", preview.RootElement.GetProperty("lines")[2].GetProperty("displayText").GetString());
                Assert.Equal(state, await DeclaredPackageState(factory));
            }
            using (var read = JsonDocument.Parse(await client.GetStringAsync($"/api/recipes/{Id}")))
                Assert.Equal("2 cans tomatoes (400 g / cans; net)", read.RootElement.GetProperty("recipe").GetProperty("ingredients")[2].GetString());
            foreach (var (amount, display) in new[] { ("2–3", "4–6"), ("0", "0") })
            {
                current = await SaveDeclaredPackageRows(factory, current,
                    current.IngredientLines.Select(row => row.Id == packageId ? Row(row, amount) : Row(row)).ToArray());
                state = await DeclaredPackageState(factory);
                var line = await ReadDeclaredPackageDatedLine(factory, packageId, 8);
                Assert.Equal($"{display} cans tomatoes (400 g / cans; net)", line.GetProperty("displayText").GetString());
                Assert.Equal(amount + " cans tomatoes (400 g / cans; net)", line.GetProperty("originalText").GetString());
                Assert.Equal(LegacyGroceryQuantity.Parse("400"), current.IngredientLines[2].Package!.Capacity.Amount);
                Assert.Equal(state, await DeclaredPackageState(factory));
                AssertDeclaredPackageUnrelatedFacts(before, current);
            }
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryDeclaredPackage_UnknownBasisDisplaysOriginalCountAndIndependentPackageLabelTruthfully()
    {
        await WithEditor(async (factory, before) =>
        {
            // Explicit missing-basis fixture; the package is still produced afterward through ordinary authenticated Save.
            var unknown = before with { Servings = null, ContentRevision = Guid.NewGuid().ToString("N") };
            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.SingleAsync(recipe => recipe.Id == Id);
                recipe.Servings = null;
                recipe.CanonicalContent = JsonSerializer.Serialize(unknown, Json);
                await db.SaveChangesAsync();
            }
            var current = await SaveDeclaredPackageRows(factory, unknown,
                Row(before.IngredientLines[0]), Row(before.IngredientLines[1]), DeclaredPackageRow("unknown-basis-package") with { Unit = null });
            var state = await DeclaredPackageState(factory);
            var line = await ReadDeclaredPackageDatedLine(factory, current.IngredientLines[2].Id, 8);
            Assert.Equal("2 tomatoes (400 g / cans; net)", line.GetProperty("displayText").GetString());
            Assert.Equal("2 tomatoes (400 g / cans; net)", line.GetProperty("originalText").GetString());
            Assert.Equal(JsonValueKind.Null, line.GetProperty("unitText").ValueKind);
            Assert.Equal(JsonValueKind.Null, line.GetProperty("quantity").ValueKind);
            Assert.Equal("unresolved", line.GetProperty("status").GetString());
            Assert.Equal(new[] { "missing_basis" }, line.GetProperty("issues").EnumerateArray().Select(issue => issue.GetString()));
            Assert.Null(current.Servings);
            Assert.Null(current.IngredientLines[2].Unit);
            Assert.Equal("cans", current.IngredientLines[2].Package!.CountUnit.Text);
            Assert.Equal(state, await DeclaredPackageState(factory));
            AssertDeclaredPackageUnrelatedFacts(unknown, current);
        });
    }

    [DeploymentCalendarPostgresTests.CalendarPostgresFact]
    public async Task OrdinaryDeclaredPackage_DefinitionClearChangesSemanticVersionEnlistsRefreshAndRetiresCheckedPurchase()
    {
        await WithEditor(async (factory, before) =>
        {
            // Retained validated references are fixture setup only, not a dictionary/definition producer.
            // The actual change under test is an ordinary authenticated Save clearing IDs without changing labels or quantities.
            var packageId = Guid.NewGuid();
            var retained = new RecipeIngredientLineDto
            {
                Id = packageId, Description = "tomatoes", Amount = LegacyGroceryQuantity.Parse("2"), AmountText = "2",
                Unit = new("cans", null), Scaling = "proportional",
                Package = new(new("cans", "count:can"), new(LegacyGroceryQuantity.Parse("400")!, new("g", "mass:g")), "net"),
                Shopping = new("tomatoes", null, null), Provenance = new("source", before.SourceRevision, [])
            };
            var baseline = before with { ContentRevision = Guid.NewGuid().ToString("N"), IngredientLines = [.. before.IngredientLines, retained] };
            var monday = new DateOnly(2026, 10, 12);
            string? metadataBefore;
            string? sourceUrlBefore;
            using (var scope = factory.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                var db = services.GetRequiredService<RecipeDbContext>();
                var recipe = await db.Recipes.SingleAsync(recipe => recipe.Id == Id);
                metadataBefore = recipe.RawMetadata;
                sourceUrlBefore = recipe.SourceUrl;
                recipe.CanonicalContent = JsonSerializer.Serialize(baseline, Json);
                recipe.Ingredients = JsonSerializer.Serialize(baseline.IngredientLines.Select(CanonicalRecipeContentStore.Render), Json);
                db.SupperServings.Add(new RecipeApi.Models.SupperServing { Date = monday.AddDays(3), OverrideServings = 8 });
                await db.SaveChangesAsync();
                await services.GetRequiredService<SupperProjectionInvalidation>().EnlistRecipeAsync(Id, default);
                await services.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
            }
            using var client = factory.CreateAuthenticatedClient();
            var oldRowId = await GroceryTestRows.CheckAsync(client, monday, "tomato");
            var pastaId = await GroceryTestRows.CheckAsync(client, monday, "pasta");
            var sauceId = await GroceryTestRows.CheckAsync(client, monday, "sauce");
            var previewBefore = await client.GetFromJsonAsync<JsonElement>($"/api/recipes/{Id}/ingredient-preview?targetServings=4");
            string inputBefore;
            Guid? workflowBefore;
            using (var scope = factory.Services.CreateScope())
            {
                var plan = await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking()
                    .SingleAsync(plan => plan.WeekStartDate == monday);
                inputBefore = plan.ServingInputVersion!;
                workflowBefore = plan.ServingRefreshWorkflowId;
                Assert.Equal(inputBefore, plan.ServingAppliedVersion);
                Assert.Equal("current", plan.ServingRefreshStatus);
            }
            var cleared = retained.Package! with
            {
                CountUnit = new("cans", null), Capacity = retained.Package.Capacity with { Unit = new("g", null) }
            };
            var current = await SaveDeclaredPackageRows(factory, baseline,
                Row(before.IngredientLines[0]), Row(before.IngredientLines[1]), Row(retained) with { Package = cleared });
            var previewAfter = await client.GetFromJsonAsync<JsonElement>($"/api/recipes/{Id}/ingredient-preview?targetServings=4");
            string? inputAfter;
            string? appliedAfter;
            string? statusAfter;
            Guid? workflowAfter;
            using (var scope = factory.Services.CreateScope())
            {
                var plan = await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().WeeklyPlans.AsNoTracking()
                    .SingleAsync(plan => plan.WeekStartDate == monday);
                inputAfter = plan.ServingInputVersion;
                appliedAfter = plan.ServingAppliedVersion;
                statusAfter = plan.ServingRefreshStatus;
                workflowAfter = plan.ServingRefreshWorkflowId;
            }
            output.WriteLine(JsonSerializer.Serialize(new
            {
                semanticVersionBefore = previewBefore.GetProperty("version").GetString(),
                semanticVersionAfter = previewAfter.GetProperty("version").GetString(),
                inputBefore, inputAfter, appliedAfter, statusAfter, workflowBefore, workflowAfter
            }, Json));
            Assert.NotEqual(baseline.ContentRevision, current.ContentRevision);
            Assert.Equal(previewBefore.GetProperty("lines")[2].GetProperty("displayText").GetString(),
                previewAfter.GetProperty("lines")[2].GetProperty("displayText").GetString());
            AssertDeclaredPackageUnrelatedFacts(before, current);
            using (var scope = factory.Services.CreateScope())
            {
                var saved = await scope.ServiceProvider.GetRequiredService<RecipeDbContext>().Recipes.AsNoTracking()
                    .SingleAsync(recipe => recipe.Id == Id);
                Assert.Equal(metadataBefore, saved.RawMetadata);
                Assert.Equal(sourceUrlBefore, saved.SourceUrl);
            }
            Assert.Equal(packageId, current.IngredientLines[2].Id);
            Assert.Equal(cleared, current.IngredientLines[2].Package);
            using (var scope = factory.Services.CreateScope())
                await scope.ServiceProvider.GetRequiredService<GroceryRecomputeService>().RecomputeForWeekAsync(monday, default);
            var schedule = await GroceryTestRows.ReadAsync(client, monday);
            var newRowId = GroceryTestRows.Id(schedule, "tomato");
            Assert.NotEqual(oldRowId, newRowId);
            Assert.False(schedule.GetProperty("groceryState").GetProperty(newRowId).GetBoolean());
            Assert.False(schedule.GetProperty("groceryState").TryGetProperty(oldRowId, out _));
            Assert.True(schedule.GetProperty("groceryState").GetProperty(pastaId).GetBoolean());
            Assert.True(schedule.GetProperty("groceryState").GetProperty(sauceId).GetBoolean());
            // ContentRevision alone is insufficient: unchanged captions still carry changed purchase operands.
            Assert.NotEqual(previewBefore.GetProperty("version").GetString(), previewAfter.GetProperty("version").GetString());
            Assert.NotEqual(inputBefore, inputAfter);
            Assert.Equal(inputBefore, appliedAfter);
            Assert.Equal("updating", statusAfter);
            Assert.NotEqual(workflowBefore, workflowAfter);
        });
    }
}
