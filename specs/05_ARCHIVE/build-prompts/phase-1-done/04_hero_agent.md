# Task 4: Hero Agent (Gemini Image Pro 3.1)

**Context**: The second step of Phase 1 identifies the best photo and creates a high-quality thumbnail using Cloud AI.

**Requirements**:
1. Implement `RecipeHeroAgent` within the Agent Framework.
2. Logic: Use **Gemini Image Pro 3.1** (Google GenAI).
3. Input: The binary images from the NAS `originals/` folder.
4. Operation: Identify the "dish" photo and generate/crop a 1:1 high-resolution `hero.jpg`.
5. Action: Save `hero.jpg` directly to the `NAS/recipes/{id}/` folder.

**Acceptance Criteria**:
- `HeroAgent` successfully calls Gemini Image Pro 3.1.
- `hero.jpg` is persisted to the NAS recipe directory.
- Subject matter extraction correctly identifies the cooked dish.
