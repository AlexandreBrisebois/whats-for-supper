# Audit input identity

Commit `04a1c4570f9bbb01b47436790d4248635ac3179a`; 2026-10-16. Starting inventory captured1910 tracked/untracked file hashes and all staged/unstaged patches privately before edits. The existing staged patch is byte-identical at the preservation check. Only the pre-existing baseline index was changed by this audit; all other starting file contents matched. New work is isolated to backlog documentation and two new change directories.

## Starting status summary

426 status records; `{'M ': 55, 'A ': 371}`. Existing modifications include all baseline plans/main specs/active change promotions and execution-harness/Taskfile/CI/scripts. They are input, not this audit work.

## Domain content digest

SHA256 over sorted `path + NUL + fileSHA256 + newline` of the starting inventory. This includes only actual files, not a runtime environment guarantee.

| Domain | Files | SHA256 |
| --- | --- | --- |
| `api/` | 385 | `867b36166e10158a208fdc91372e42e6e8395676511fdcc80d9d620d5ea7f532` |
| `pwa/` | 788 | `c297a6095387d97d5a60d799b04e86957891666eb5e7535089fa53fbcf069e00` |
| `specs/` | 17 | `82ad96439fea96af88c267a906c5035e58f3a69eb3e4e154acf7bab69dfe3ad8` |
| `openspec/` | 511 | `5ac067bb9a266b83ad4b1be41af3243861fccada3dea9d3cf37d52b116cc4b97` |
| `docs/openspec-baseline/` | 20 | `226028f66e57cad5c6be78eba25b82239a1801ebd30caa2798c2937058469d38` |
| `.agents/` | 51 | `22287641b526224158b5ea1a3d6bcec7a707aa7aaf94151f14c60ff6d2442de4` |
| `scripts/` | 37 | `5885df8e308020f6c93a4eded023f7de9db11cd556fbb6920d5ef332b4e6eb9b` |

Executable entry paths and source symbols are in lane reports. Exact final documentation input identity belongs to the scoped task verify run record; source/test passes apply to unchanged source content, not arbitrary future edits. No production database/seeded definitions/browser device identity was supplied.
