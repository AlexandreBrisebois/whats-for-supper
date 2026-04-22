---
name: e2e-testing
description: Procedural guidance for Playwright E2E testing, Mock API management, and integration verification.
---

# Skill: E2E & Integration Testing

Procedural guidance for Playwright and Mock API testing.

## 1. Testing Hierarchy
1. **Mock API (Fast)**: Used for rapid PWA layout and flow verification.
2. **Live API (Slow)**: Used for final integration verification.

### Run PWA Tests (Mock)
```bash
cd pwa
task review
# or
npm run test:e2e
```

### Run PWA Tests (Live)
```bash
task test:pwa:live
```

## 2. Mock API Management
- The Stateful Mock API is located in `pwa/mock-api.js`.
- Any schema changes in the .NET API must be manually synchronized to the Mock API to maintain CI integrity.

## 3. Playwright Best Practices
- Use `IdentityValidator` logic for all authentication gates.
- Standard ports: Mock API (5001), Live API (5000), PWA (3000).
