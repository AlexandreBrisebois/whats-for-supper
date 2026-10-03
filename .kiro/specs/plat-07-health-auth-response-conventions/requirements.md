# Health, Auth, and Response Conventions — Requirements

## Status

**Implemented capability baseline.**

## Current behavior

- **PLAT-07-R1.** `HealthController` exposes health response DTOs; operational health is distinct from authenticated household commands.
- **PLAT-07-R2.** family-member-sensitive controllers use `FamilyMemberIdModelBinder`; routes lacking that binder do not acquire member scoping by client headers alone.
- **PLAT-07-R3.** `SuccessWrappingFilter` provides the established response envelope except actions marked `SkipWrapping`, whose OpenAPI response shape is their authority.

## Limits and boundaries

Authentication, household isolation, and exact error semantics remain controller/route specific. Health success does not prove dependency, workflow, model, or data readiness. This packet defines conventions, not authorization policy for every feature.
