# Synthetic evaluation — diagnostic baseline, not a relevance benchmark

## Predeclared cases and judgments

The 15 cases below were defined in `/tmp/similar-eval/Program.cs` before executing the current scorer. Proposed judgments derive from the owner's ingredient/execution intent, not family ratings. Source families are chicken-pepper-rice stir-fry, chickpea-spinach curry, potato omelette and roast salmon/potatoes. All recipe names/execution labels are synthetic human-readable labels: the scorer does not receive those names or instructions. C1 and C2 intentionally have identical supported facts, exposing the inability to distinguish execution without pretending a title is a feature.

Desired pairwise review cases: C2/C3 over C1; C10 over C9; C12 over C11; C14 over C13. Pantry-only C4 is not a useful alternative; C5 should not lose ingredient equivalence solely due to language; C6 tests quantity/preparation wording. C7/C15 are unknown, not evidence of novelty. C8 tests a pantry-only source where no core ingredient can be established. These are recommendations awaiting human review, not a fixed pass score.

## Measured actual scorer output

The temporary console project referenced the unchanged repository `api/RecipeApi.csproj` and called the actual `RecipeSimilarityScorer`, not a reimplementation. SDK 11.0.100-rc.2.26504.105. Raw cosine 0 mirrors the service's lexical fallback; 0.6 for every candidate is a controlled sensitivity check, **not a measured embedding**. No retrieval or service ordering is simulated by this table. All normal rows use category `main`, meal `dinner`, 30 minutes unless code below overrides them. Scores rounded to six decimals.

| Case | Ingredient Jaccard | Fallback total | Equal-vector total |
|---|---:|---:|---:|
| C1 stir-fry near-duplicate | 1.000000 | 0.800000 | 0.920000 |
| C2 baked chicken rice; same coarse metadata | 1.000000 | 0.800000 | 0.920000 |
| C3 stuffed peppers; extra tomato/cheese | 0.714286 | 0.598571 | 0.718571 |
| C4 unrelated salmon potatoes; salt/oil only | 0.285714 | 0.521429 | 0.641429 |
| C5 French chicken bake names | 0.000000 | 0.550000 | 0.670000 |
| C6 quantities/preparation in strings | 0.000000 | 0.550000 | 0.670000 |
| C7 sparse alternative metadata | 0.000000 | 0.200000 | 0.320000 |
| C8 pantry-only source | 1.000000 | 0.800000 | 0.920000 |
| C9 chickpea curry duplicate | 1.000000 | 0.800000 | 0.920000 |
| C10 chickpea spinach patties | 0.833333 | 0.758333 | 0.878333 |
| C11 potato omelette duplicate | 1.000000 | 0.800000 | 0.920000 |
| C12 baked potato egg casserole | 1.000000 | 0.785000 | 0.905000 |
| C13 roast salmon duplicate | 1.000000 | 0.800000 | 0.920000 |
| C14 salmon potato fishcakes | 0.833333 | 0.758333 | 0.878333 |
| C15 missing metadata both | 0.000000 | 0.200000 | 0.320000 |

Observed: the different-execution cases tie or lose to their same-dish controls. Extra ingredients, changed cuisine and longer time can reduce the score even where execution variety is desired. French ingredient names and quantity-bearing strings receive zero exact-set overlap. Salt/oil-only overlap gets positive credit; with pantry-only source/candidate lists it reaches full ingredient overlap. A constant fallback semantic contribution shifts totals but does not change the relative order. These results diagnose representation and objective limitations; **no scoring algorithm was changed and no quality improvement is claimed**.

## Candidate, constraint and list cases

| ID | Representative setup | Required judgment / existing constraint | Evidence status |
|---|---|---|---|
| R1 | 51 closer wrong-cuisine recipes plus one allowed alternative | Filter/source exclusion must happen before retrieval limit | Existing PostgreSQL Similar tests exercise this for lexical and semantic retrieval; see evidence.md for current run qualification. |
| R2 | Source missing, deleted or not ready; candidate deleted/unready | No invalid source or candidate should serve | Source/SQL trace established; original household state unavailable. |
| R3 | Ready dessert, supperSuitable=false, rotation off, sharing source ingredients | Current Similar library membership is not Discovery eligibility; changing suitability is a morning decision | Source/predicate inspection only for these suitability flags, not runtime qualification. |
| R4 | Only unrelated salt/oil-sharing recipes available | No invented claim of useful alternatives; empty versus related fallback needs decision | C4/C8 score measured; service has no usefulness threshold by inspection. End-to-end negative collection evaluation pending. |
| R5 | Only same-dish variants available | Strict empty versus labeled near-duplicate fallback needs decision | C1/C9/C11/C13 score measured; no threshold policy selected. |
| R6 | No eligible candidates after hard filters, or missing source | Retain valid empty state/recovery; never drop filters to fill results | Existing empty UI and source behavior traced. New Planner browser test uses successful empty response; no household case. |
| R7 | Useful alternative outside the first 50 vector/lexical candidates | Candidate recall must be measured independently of reranking | Not run: current bounded SQL and no semantic/lexical union established; real alternative pool absent. |
| R8 | Candidate already in requested week and day context | Retain -10.0 planned demotion, not exclusion; omit context only when not supplied | Existing API Similar-with-planner regression included in focused run. |
| R9 | Reported highest score, report-free next; review filters active | Preserve report/Top Pick rules independently of relevance | Source trace; no change in this slice. |
| R10 | Four equally scored alternatives over multiple pages, then facts change | Snapshot continuation order remains stable, no repeats/source return | Existing PostgreSQL Similar continuation test; see evidence.md. |
| R11 | Source unavailable/stale embedding, semantic failure or cancellation | Bounded lexical fallback; propagate caller cancellation | Existing focused PostgreSQL Similar cases; no external model invoked. |
| R12 | French title but canonical English ingredient values; French ingredient values with same title | Title language alone is not a scorer feature; ingredient normalization and retrieval must be separated | C5 isolates ingredient language. Bilingual retrieval recall not run. |
| R13 | Different technique candidates all share one new form (five casseroles) | Decide whether list diversity beyond source difference is needed | No list-level policy or household judgment; explicitly pending. |

The existing `HybridRecipeSearchSimilarityEvaluationTests` uses hand-assigned semantic groups with cosine 1 or 0 and source-fact pairwise expectations. It is a regression fixture for the former objective, not a household benchmark for this intent. Its name/location does not establish live model or PostgreSQL evaluation.

## Reproduction

Create a temporary net11.0 console project with a ProjectReference to the checked-out `api/RecipeApi.csproj`; run `dotnet run --project <temporary-project>`. Use the repository pinned SDK. The exact program below records every input and all score components as JSON lines; use it unchanged for the baseline. Do not silently recast its controlled vectors as model observations.

```csharp
using System.Text.Json;
using RecipeApi.Services;

// Synthetic diagnostic cases, not household-approved rankings or model outputs.
RecipeSimilarityInput Input(string[]? ingredients, string? category = "main", string? cuisine = "Chinese", bool? vegetarian = false, string? time = "PT30M", string[]? meals = null)
    => new(ingredients is null ? null : JsonSerializer.Serialize(ingredients), category, cuisine, meals ?? ["dinner"], vegetarian, time);
var chicken = Input(["chicken", "peppers", "rice", "salt", "oil"]);
var chickpea = Input(["chickpeas", "spinach", "tomato", "salt", "oil"], cuisine: "Indian", vegetarian: true);
var egg = Input(["eggs", "potatoes", "onion", "salt", "oil"], cuisine: "Spanish", vegetarian: true);
var salmon = Input(["salmon", "potatoes", "lemon", "salt", "oil"], cuisine: "French");
var cases = new (string Id, RecipeSimilarityInput Source, RecipeSimilarityInput Candidate)[] {
 ("C1 stir-fry near-duplicate", chicken, chicken),
 ("C2 baked chicken rice; same coarse metadata", chicken, chicken),
 ("C3 stuffed peppers; extra tomato/cheese", chicken, Input(["chicken","peppers","rice","salt","oil","tomato","cheese"], cuisine: "Mediterranean", time: "PT60M")),
 ("C4 unrelated salmon potatoes; salt/oil only", chicken, Input(["salmon","potatoes","salt","oil"], cuisine: "French")),
 ("C5 French chicken bake names", chicken, Input(["poulet","poivrons","riz","sel","huile"], cuisine: "Chinese")),
 ("C6 quantities/preparation in strings", chicken, Input(["200 g chicken, diced","2 peppers","1 cup rice","1 tsp salt","1 tbsp oil"])),
 ("C7 sparse alternative metadata", chicken, new(null,null,null,null,null,null)),
 ("C8 pantry-only source", Input(["salt","oil"]), Input(["salt","oil"])),
 ("C9 chickpea curry duplicate", chickpea, chickpea),
 ("C10 chickpea spinach patties", chickpea, Input(["chickpeas","spinach","tomato","salt","oil","flour"], cuisine: "Indian", vegetarian:true)),
 ("C11 potato omelette duplicate", egg, egg),
 ("C12 baked potato egg casserole", egg, Input(["eggs","potatoes","onion","salt","oil"], cuisine: "Spanish", vegetarian:true, time:"PT45M")),
 ("C13 roast salmon duplicate", salmon, salmon),
 ("C14 salmon potato fishcakes", salmon, Input(["salmon","potatoes","lemon","salt","oil","breadcrumbs"], cuisine: "French")),
 ("C15 missing metadata both", new(null,null,null,null,null,null), new(null,null,null,null,null,null)),
};
var scorer = new RecipeSimilarityScorer();
foreach (var c in cases) {
 var fallback = scorer.Score(c.Source,c.Candidate,0);
 var equalVector = scorer.Score(c.Source,c.Candidate,0.6);
 Console.WriteLine(JsonSerializer.Serialize(new {c.Id,c.Source,c.Candidate,Fallback=fallback,ControlledEqualVector=equalVector}));
}
```

## Remaining qualification

No original family recipe/result list, production request/context, live embeddings, retrieval-recall labels or human pairwise/list judgments were supplied. The table covers diagnostic categories but is intentionally synthetic and small, not a representative sample of household preferences. After morning decisions, collect owner-reviewed examples, hold some out from tuning, compare candidate membership and rank separately on semantic/fallback paths and constraints, and retain counterexamples. Do not tune until the intended judgment and actual fields are agreed.
