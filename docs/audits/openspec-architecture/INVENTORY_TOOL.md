# Canonical inventory tool — approved P0

Run from the repository:

```sh
task spec:audit
```

The default prints a compact capability/size/count table to stdout. It reads canonical `openspec/specs/**/spec.md` files in stable POSIX path order, excluding active/archived changes. No specification, index, cache or report file is written. The tool resolves the repository from its own installed path rather than caller working directory.

```sh
task spec:audit -- --format json
task spec:audit -- --capability meal-planning --capability deployment-calendar
task spec:audit -- --format json --output /tmp/wfs-inventory-new.json
```

`--capability` is an exact repeatable ID (including nested paths), with no fuzzy fallback. `--output` requires an explicit new destination with an existing parent directory. Existing files/symlinks, Git metadata, tracked paths and OpenSpec paths are rejected; missing parent directories are not created. Publication uses a sibling temporary file and atomic no-clobber hard link, then removes that temporary file. This implements the design's no-overwrite guarantee without a rename that could replace a competing file. Filesystems that do not support hard links return an error rather than fall back to partial or overwriting writes.

JSON schema version 1 contains `complete`, `totals`, `files`, `diagnostics`, discovery scope and selected capability IDs. Each file preserves exact UTF-8 text, hashes, Purpose/preamble, ordered headings, requirement descriptions/blocks and scenarios. Spans are one-based inclusive physical lines; raw text and hashes preserve Unicode/newline conventions. Empty spans in malformed inputs have `end_line = start_line - 1`. Duplicate titles retain occurrence ordinals and distinct identities. Large raw evidence belongs in machine-readable output, not automatic model context.

Exit 0 means the inventory is structurally complete under this tool's supported parser, possibly with warnings. Exit 1 means invalid arguments or output failure. Exit 2 means unreadable, invalid UTF-8 or malformed/incomplete canonical input; JSON retains partial records and diagnostics. Repeated headings are navigation warnings, not semantic duplication findings.

The parser supports ATX headings outside backtick/tilde fenced and indented code; lower-level nested headings remain in bodies. It is not a complete CommonMark parser or a replacement for the pinned validator. Use `task spec:check` for canonical OpenSpec validation.

No `--overlaps` or `--benchmark` option is installed in P0. No tokenizer, dependencies, canonical ownership edits, requirement consolidation or context-loading policy changes are included. The full relevant-spec review rule remains in effect.

## Acceptance

Focused tests: `.venv/bin/python -B -m unittest scripts.agent.tests.test_openspec_audit` — 15 passed. Fixtures cover raw Unicode/CRLF spans, fenced/nested headings, duplicate names, malformed specs, exact path filtering, zero default writes, explicit atomic output behavior and process/cwd determinism.

All 34 canonical file metrics/hashes and all 808 requirement / 2,165 scenario raw blocks matched the audited evidence. Selected counts match pinned OpenSpec 1.14.3. Strict validation passed 34/34. Five local JSON subprocess runs were byte-identical, median 0.062 seconds (maximum 0.068). The observed cumulative child RSS bound was 85.125 MiB, including an earlier pinned CLI subprocess; it is not isolated inventory-only memory telemetry. Exact evidence and red/green observations: [inventory-tool-acceptance.json](evidence/inventory-tool-acceptance.json).

Final scope review and harness verification are recorded in AUDIT_TRACKER.md and the completion reply. Application/API/database/browser checks are not applicable to this inventory-only harness change.
