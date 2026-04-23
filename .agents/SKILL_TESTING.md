---
name: e2e-testing
description: Procedural guidance for Playwright E2E testing, Mock API management, and integration verification.
---

# Skill: E2E & Integration Testing

Procedural guidance for Playwright and Mock API testing.

## 1. The TDD Mandate (Mandatory)
All new features and fixes MUST follow the TDD workflow:
1. **Plan & Spec**: Update specifications in `specs/`.
2. **Write Tests**: Create or update tests (E2E for PWA, xUnit for API) before code.
3. **Mock Contract**: Update `mock-api.js` to reflect the new API behavior.
4. **Implement**: Write code to satisfy the tests.

## 2. Testing Hierarchy
1. **Mock API (Fast)**: Used for rapid PWA layout and flow verification. **Always run with `task review`**.
2. **Live API (Slow)**: Used for final integration verification.

### Run PWA Tests (Mock)
```bash
cd pwa
task review
```

### Run API Tests (Unit/Integration)
```bash
cd api
dotnet test
```

## 3. Specialized Guidance
- [Next.js Testing Best Practices](SKILL_NEXTJS_TESTING.md) — Mandatory `data-testid` and Playwright rules.
- [Next.js Developer](SKILL_NEXTJS_DEVELOPER.md) — Frontend TDD and Next.js 15 patterns.
- [Senior .NET Developer](SKILL_DOTNET_DEVELOPER.md) — Backend TDD and .NET 10 patterns.

## 4. Mock API Management
- The Stateful Mock API is located in `pwa/mock-api.js`.
- **High-Fidelity**: It is a contract for frontend development. Update it *before* implementing the real backend.
