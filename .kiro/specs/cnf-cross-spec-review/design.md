# Design Document: CNF Cross-Spec Review

## Overview

This is a review-orchestration spec. It does not define runtime architecture. It defines how to continue the cross-spec review without relying on a single swollen conversation context.

The review process is intentionally sequential:

1. Open one branch in a fresh conversation.
2. Read only the branch's required context.
3. Verify claims against specs and code where possible.
4. Surface one blind spot or dead end.
5. Offer 2-3 concrete paths.
6. Recommend the best path and explain why.
7. Wait for the human decision.
8. Patch specs only after the human chooses.

## Review Protocol

Use these skills and prompts when applicable:

- `shared-understanding`: required for every branch.
- `.agents/prompts/mere-designer.md`: required for every branch involving UI, user-facing copy, warnings, settings, health nudges, or cognitive load.
- `prompt-planner`: useful when branch resolution changes task ordering or ownership.
- `create-prompt`: useful when a branch needs to produce launch-ready implementation prompts after decisions are made.

## Branch Manifest

| ID | Branch | Status | Primary Risk |
|---|---|---|---|
| R0 | Allergy reminders and ingredient-level matching ownership | Resolved | False safety or accidental planning blocks |
| R1 | Health guidance setting ownership and semantics | Open | One setting may hide too much or too little |
| R2 | FOP thresholds, raw nutrition, and CNF estimates | Open | Conflicting nutrition thresholds and trust issues |
| R3 | Alias expansion seam duplication | Open | Two expanders doing the same job differently |
| R4 | Search contract drift before new search behavior | Open | OpenAPI/DTO drift deepens |
| R5 | Grocery locale source and checked-state preservation | Open | Server cannot see client locale; checked state may reset |
| R6 | Meal attendance / family-member presence | Open | Warnings may be noisy when a member is not eating |
| R7 | Provider strategy scope and abstraction weight | Open | Overbuilding generic provider seams too early |
| R8 | CNF false-positive cache and operator correction | Open | Wrong trigram match becomes sticky |
| R9 | Unit/yield approximations and confidence propagation | Open | Estimated nutrition looks more precise than it is |
| R10 | Health nudge explainability contract | Open | Explanation metadata may clutter UI or drift from API |
| R11 | HEFI exactness, naming, and user trust | Open | Approximate score may be read as official precision |
| R12 | Cross-spec wave ordering after pulled-forward allergy matching | Open | Tasks may now be sequenced incorrectly |
| R13 | DTO shape risks: warnings, schedule records, search filters | Open | Positional records and nullable arrays may break clients |
| R14 | LLM recommendation safety, privacy, and opt-out | Open | Health agent may leak sensitive context or run when disabled |

## Resolved Branch R0 Summary

Decision:

- Pull ingredient-level allergy/intolerance matching forward into `family-health-profiles` before visible allergy badges.
- Keep allergy output as a non-blocking, member-specific reminder.
- Use copy like: `Check ingredients for Shellfish: possible match in shrimp`.
- Never claim a recipe is unsafe, safe, allergen-free, or allergy-safe.
- Never block planning, voting, grocery generation, or cooking flow because a warning exists.
- Dietitian Phase 2 reuses the family-health matching seam instead of owning the first allergy reminder surface.

Files already updated:

- `.kiro/specs/family-health-profiles/requirements.md`
- `.kiro/specs/family-health-profiles/design.md`
- `.kiro/specs/family-health-profiles/tasks.md`
- `.kiro/specs/cnf-health-orchestration/requirements.md`
- `.kiro/specs/cnf-health-orchestration/design.md`
- `.kiro/specs/cnf-health-orchestration/tasks.md`
- `.kiro/specs/cnf-health-orchestration/user-guide.md`
- `.kiro/specs/cnf-health-orchestration/user-flows.md`
- `.kiro/specs/cnf-health-orchestration/data-flows.md`
- `.kiro/specs/cnf-search-augmentation/requirements.md`
- `.kiro/specs/cnf-search-augmentation/design.md`
- `.kiro/specs/dietitian-agent-phase2/requirements.md`
- `.kiro/specs/dietitian-agent-phase2/design.md`
- `.kiro/specs/dietitian-agent-phase2/tasks.md`
- `HANDOVER.md`

## Review Output Shape

Every branch review should produce:

1. **Blind spot:** one concise statement.
2. **Why it matters:** product, UX, contract, or implementation risk.
3. **Options:** 2-3 concrete paths.
4. **Recommendation:** one path with rationale.
5. **Decision needed:** one yes/no or A/B/C question.
6. **After decision:** list affected specs to patch.

Do not move to the next branch until the current branch is decided or explicitly parked.
