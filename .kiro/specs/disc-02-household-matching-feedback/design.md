# DISC-02 — Household matching feedback design

Discovery cards/store call generated/manual discovery vote APIs. `DiscoveryController` delegates to `DiscoveryService`, which persists `RecipeVote` state and publishes `vote_updated { recipeId, voteCount }`. Stream dispatch updates discovery and planner stores. Evidence: discovery store/card/page tests, schedule/discovery integration tests, `DiscoveryService` tests, and OpenAPI vote operations. This packet does not own candidate eligibility or weekly locking.
