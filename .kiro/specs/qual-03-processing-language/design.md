# QUAL-03 — Processing language design

Language is implicit in source recipe fields and extraction prompts, not a browser/API model. UI localization (`common.json`) affects labels only; `stepParser` preserves instruction text and source section titles. Re-import invokes existing source workflows and has no language parameter. Evidence: import prompt/source tests where present, `stepParser.test.ts`, and detail/Cook tests. CAP-06 and PLAT-02 own source/workflow behavior; this packet records the boundary only.
