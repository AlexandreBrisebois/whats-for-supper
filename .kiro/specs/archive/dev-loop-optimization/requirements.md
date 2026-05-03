# Requirements: Dev Loop Optimization & Digital Twin Testing

## 1. Objective
Accelerate the development loop by modernizing testing infrastructure to support parallel execution, implementing a high-speed "gate" task for active development, and providing utilities to verify the "Digital Twin" architecture.

## 2. Functional Requirements

### 2.1 Dev Loop Efficiency
- **R1.1: Fast Feedback Gate**: The system SHALL provide a `task gate` command that validates current changes (lint, typecheck, drift, impacted tests) in under 30 seconds.
- **R1.2: Impact-Aware Testing**: The system SHALL identify and run only the E2E test files affected by changes in controllers, routes, components, or the OpenAPI spec.
- **R1.3: Parallel Acceleration**: The E2E suite SHALL utilize all available CPU cores locally and a fixed worker count (2) on CI to maximize throughput.

### 2.2 Security & Isolation
- **R2.1: Strict Mocking**: The system SHALL block all unhandled API requests to the backend during tests with a `403 Forbidden` error.
- **R2.2: Zero Leakage**: The E2E harness SHALL NOT use `route.continue()` for any `/api/` requests, ensuring 100% database isolation.
- **R2.3: Ghost Protection**: The system SHALL automatically terminate lingering Playwright workers or dev server instances before starting a test run to prevent port collisions and flakiness.

### 2.3 Digital Twin Testing (Future-Looking)
- **R3.1: Network Simulation**: The harness SHALL provide a helper to artificially delay API responses to verify optimistic state preservation.
- **R3.2: Store Verification**: The harness SHALL provide a mechanism to assert the internal state of Zustand stores (e.g., `todayStore`, `weekStore`) directly from E2E tests.
- **R3.3: Worker Atomicity**: Each parallel worker SHALL operate in a unique identity context (e.g., `familyMemberId`) to prevent state collisions between Digital Twins in concurrent tests.

## 3. Constraints
- **C1**: Must not require a running backend/database for E2E tests.
- **C2**: Must be fully compatible with the existing `Taskfile.yml` execution harness.
- **C3**: Must adhere to the `AGENT.md` protocol and vertical slicing doctrine.
