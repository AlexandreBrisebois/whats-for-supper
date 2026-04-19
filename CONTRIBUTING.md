# Contributing

Please read this document before contributing.

Commit messages
- Use Conventional Commits (e.g., `feat: add recipe parser`, `fix(api): handle null input`).

Branching
- `main` — protected, releasable.
- `develop` — integration branch for the next release.
- Feature branches: `feature/<short-descriptor>`.
- Hotfix branches: `hotfix/<issue-number>-desc`.

Pull requests
- Link related issue.
- Include testing steps and screenshots where applicable.
- Ensure all CI checks pass: lint, unit tests, security scanning.

Code review
- Require at least one approving review from a code owner for critical areas.
- Keep PRs small and focused.

Local testing
- Document how to run unit/integration/E2E tests locally.

Reporting security issues
- See `SECURITY.md`. Do not open public issues for vulnerabilities.

Style & linters
- Run linters before creating PRs. CI will run the same linters.

Thank you for contributing.