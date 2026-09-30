# QUAL-03 — Processing language requirements

## Status

**Implemented capability baseline.**

## Outcome

Recipe processing retains source content and does not derive processing behavior from the browser interface locale.

## Implemented behavior

- **QUAL-03-R1.** Recipe import/capture stores source-derived recipe text and structured instructions; `stepParser` presents supplied English/French/generic section labels without translating source content.
- **QUAL-03-R2.** Interface strings use PWA locale resources independently of recipe text. Current import-report/reimport context is passed as source feedback, not a UI-locale instruction.
- **QUAL-03-R3.** Cook's Mode can display parsed source instructions or generic fallback text; it does not declare a detected processing-language field or offer language override.

## Boundaries and limitations

CAP-06/import workflows own extraction/model prompts; LIB-02 owns displayed recipe metadata; QUAL-02 owns re-import context. There is no durable per-recipe processing-language contract, detection result, or language-specific quality guarantee in the API.
