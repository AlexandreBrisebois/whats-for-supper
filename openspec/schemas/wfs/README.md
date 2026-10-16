# WFS planning schema

Forked from OpenSpec 1.14.2 `spec-driven`. The project default is `wfs`;
existing changes retain their declared schema. This schema configures feature
planning; harness maintenance is performed directly, without a tracking change.

The proposal captures outcome/scope, specs define observable behavior, design
records ownership and decisions, and tasks deliver tested vertical slices.
Design remains conditional. Its state/concurrency/recovery, persistence,
compatibility, diagnosis and UX sections are included only when relevant.
Documentation work uses artifact checks without invented behavior tests.

Shared policy remains in `AGENT.md`, `.agents/core/mission.md`,
`.agents/core/contract-testing.md` and `.agents/core/execution-harness.md`.
Templates request concrete decisions and evidence rather than repeating policy.
The schema is guidance, not proof that a design is correct or acceptance passed.

Use `openspec/config.yaml` for concise, additive engineering expectations;
keep templates for document structure. Preserve the upstream artifact IDs,
output paths, dependency graph, task syntax and apply tracking. Do not edit
generated skills or installed package files to encode WFS policy. Artifact
rules guide creation, so required acceptance must appear in the generated
artifacts rather than relying on rules to act as verification checks.

Keep iteration fluid: review interacting requirements in proportion to risk,
resolve consequential decisions, and reconcile affected artifacts when decisions
change. No additional phase approval gates or mandatory review document are added.

The fork is a snapshot. `openspec update` refreshes installed skills and commands;
it leaves project schemas untouched and does not merge upstream improvements.
For a deliberate OpenSpec upgrade:

1. Review the new release and align the repository's CLI version pin through its
   dependency-upgrade procedure. Run `openspec update` to refresh generated guidance
   and review those changes; preserve project-owned policy and configuration.
2. In a disposable project, fork the newly installed `spec-driven` schema under a
   distinct name. Compare it with this fork for parser, lifecycle, instruction and
   validation changes. Port applicable differences deliberately; do not overwrite
   the WFS templates or introduce a new workflow merely to match upstream examples.
3. Run `openspec schema validate wfs` and `task spec:check`.
4. In a disposable project, exercise default schema selection, artifact instruction
   generation, config rule injection, numbered checkbox progress and existing-change
   schema retention. This checks tool compatibility, not the quality of generated
   designs. Review a representative generated plan when authoring guidance changes.
5. Review the final diff and run the harness verification for the complete changed
   path set. Update the fork's baseline version above after reconciliation.

Official extension contracts:
[customization](https://openspec.dev/docs/customize),
[project configuration](https://openspec.dev/docs/project-config), and
[schema maintenance](https://openspec.dev/docs/customize-schemas).
