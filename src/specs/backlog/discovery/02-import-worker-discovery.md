# Discovery Prompt: Import Worker Pipeline & Models

## Background
You are an AI Infrastructure Engineer. You are in the "Discovery & Design" phase for the **Recipe Import Worker** of "What's For Supper". Your goal is to finalize the AI model selection and processing logic.

## Objective
Review the following documents and define the missing technical details:
- [recipe-import.spec.md](file:///Users/alex/Code/whats-for-supper/src/specs/recipe-import.spec.md)
- [007-recipe-import-worker-architecture.md](file:///Users/alex/Code/whats-for-supper/src/specs/decisions/007-recipe-import-worker-architecture.md)

## Missing Definitions to Resolve
1. **Model Selection**: Lock in the specific local model for Pass 1 (e.g., specific Gemma 2b/7b quantized version) and the embedding model for the `Vector(1536)` column.
2. **OCR vs. Multi-Modal**: Determine if Pass 1 should use traditional OCR + LLM or a purely multi-modal approach (lava/gemma-vision) given the NAS hardware constraints (Synology DS723+).
3. **Thumbnail Aesthetic**: Define the "What's For Supper" aesthetic prompt parameters for the Gemini 3.1 hero image generation.

## Deliverable
Do NOT write code. Instead, produce:
1. An **Update** to `recipe-import.spec.md` with the finalized model names and Pass 1/2 logic.
2. A **New ADR** (`009-import-ai-model-selection.md`) documenting the hardware-to-model compatibility.
