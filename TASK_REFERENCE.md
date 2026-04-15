# Task Reference Guide

Quick reference for common development tasks.

## Installation

```bash
# macOS
brew install go-task

# Linux
curl -sL https://taskfile.dev/install.sh | sh

# Windows (Chocolatey)
choco install task

# Verify
task --version
```

---

## Essential Commands

### First Time Setup
```bash
task init           # Installs deps, starts services, seeds data (one command!)
```

### Daily Development
```bash
task work           # Guided workflow with next steps
task dev            # Start all services in Docker
task dev:api        # API with hot reload (fast!)
task dev:pwa        # PWA with hot reload (fast!)
task dev:db         # Only database (for local API/PWA)
task logs           # Watch all logs in real-time
task health         # Check if services are healthy
```

### Before Committing
```bash
task review         # Format + Lint + Test (pre-commit checks)
```

### Testing
```bash
task test           # Run all tests
task test:api       # API tests
task test:api:watch # API tests in watch mode (auto-rerun)
task test:pwa       # PWA tests
task test:pwa:watch # PWA tests in watch mode
```

### Cleanup
```bash
task stop           # Stop containers (keep data)
task clean          # Delete everything (fresh start)
```

---

## All Available Tasks

View all tasks:
```bash
task -l       # List all tasks
task          # Shows help
```

---

## Troubleshooting with Task

### Port conflicts
```bash
task stop          # Stop all services
# or
lsof -i :5000     # Find process on port 5000
kill <PID>        # Kill the process
```

### Database issues
```bash
task db:backup     # Backup database
task db:restore    # Restore from backup
task clean         # Complete reset
task seed          # Repopulate test data
```

### Service issues
```bash
task health        # Check which services are running
task logs          # View all logs
task logs:api      # View just API logs
task shell:db      # Connect to database
task restart       # Restart all services
```

### Code quality issues
```bash
task format        # Auto-format all code
task lint          # Check for linting errors
task typecheck     # Type check TypeScript
```

---

## Tips & Tricks

### Run multiple tasks in parallel
```bash
# Terminal 1
task dev:api

# Terminal 2
task dev:pwa

# Terminal 3
task logs
```

### Use watch mode for development
```bash
task dev:api       # API auto-recompiles on save
task test:pwa:watch # Tests auto-run on file changes
```

### Quick database access
```bash
task shell:db      # Opens psql directly
```

### Check what changed
```bash
task logs:tail     # Last 50 lines from all services
```

---

## Understanding Task Output

### When you run `task dev:`
```
task: [dev] docker-compose up -d
task: [health] 
Checking services...

API health:
{
  "status": "healthy",
  "checks": {
    "api": "ok",
    "database": "ok",
    "schema": "ok"
  }
}
✓ API running
...
```

### When you run `task test:`
```
task: [test:api] dotnet test
  Starting test run...
  Test run summary: 42 tests, 42 passed, 0 failed

task: [test:pwa] npm run test
  PASS  src/components/capture.test.ts
  PASS  src/hooks/useHintTour.test.ts
  ...
✓ All tests passed!
```

---

## File Organization

- `Taskfile.yml` - All task definitions
- `LOCAL_DEV_LOOP.md` - Detailed development guide
- `.env.example` - Environment variables template
- `.env.local` - Your local overrides (gitignored)

---

## Next Steps

1. Install Task: `brew install go-task`
2. Verify: `task --version`
3. Setup project: `task init`
4. Start developing: `task work`
5. Before committing: `task review`

---

## Common Workflows

### Feature Development
```bash
# Start
task work
task dev:api
task dev:pwa
task logs

# Edit code and test in browser

# Before pushing
task review
git commit -m "feature: ..."
git push
```

### Bug Fixing
```bash
task logs:api       # Find the error
task shell:db       # Check database state
task dev:api        # Fix code with hot reload
task test:api:watch # Run tests as you fix
task review         # Full check before commit
```

### Testing
```bash
task test:pwa:watch # Write tests with auto-rerun
task logs:pwa       # Debug test failures
```

---

## Pro Tips

1. **Favorite workflow:** Bind keyboard shortcut to `task work` for guided development
2. **Git hooks:** Use `task hooks:install` to auto-format before commits
3. **Health checks:** Run `task health` before reporting "API down" issues
4. **Database snapshots:** Use `task db:backup` before major changes
5. **Log colors:** Task output is color-coded for easy scanning

---

## Getting Help

```bash
task -h             # Show task help
task <task-name> -h # Show help for specific task
task -l             # List all tasks with descriptions
```

For more: https://taskfile.dev
