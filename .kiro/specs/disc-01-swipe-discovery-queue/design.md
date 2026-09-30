# DISC-01 — Swipe discovery queue design

Discovery page/cards call `discoveryStore` and `lib/api/discovery`; `DiscoveryController` delegates ranking/candidate work to `DiscoveryService` and search services. Vote events update discovery state, and fill-the-gap invalidation removes stale planner-context candidates. Evidence: discovery store/page/card tests, discovery API mocks/contracts, controller/service integration tests and stream tests. Candidate presentation does not duplicate server eligibility/ranking policy.
