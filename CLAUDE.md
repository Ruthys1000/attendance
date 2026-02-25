# CLAUDE.md — AI Assistant Guide for `attendance`

> **Repository state as of 2026-02-25:** This is a freshly initialized repository with no committed code yet. This file establishes conventions and context for AI assistants (and human contributors) working on this project.

---

## Project Overview

**Repository:** `Ruthys1000/attendance`
**Purpose:** Attendance tracking application (details to be defined as the project grows)
**Primary branch for AI work:** branches prefixed with `claude/`

---

## Repository Status

| Area | Status |
|------|--------|
| Source code | Not yet created |
| Dependencies | Not yet defined |
| Tests | Not yet created |
| CI/CD | Not yet configured |
| Database schema | Not yet defined |

---

## Git Workflow

### Branch Naming

- **AI/Claude feature branches:** `claude/<task-slug>-<session-id>` (e.g., `claude/claude-md-mm2i4dpzhf1bhpq0-GLMdD`)
- **Human feature branches:** `feature/<short-description>`
- **Bug fixes:** `fix/<short-description>`
- **Never push directly to `main` or `master`** without a pull request.

### Commit Style

Use short, imperative commit messages:

```
Add attendance tracking model
Fix date parsing for weekly reports
Update README with setup instructions
```

- One logical change per commit.
- Reference issue numbers when applicable: `Fix off-by-one in date range (#42)`.

### Push Commands

Always push with tracking:

```bash
git push -u origin <branch-name>
```

---

## Development Setup (To Be Defined)

Once the technology stack is chosen, document setup steps here. Common starting points:

### Node.js / TypeScript

```bash
npm install        # Install dependencies
npm run dev        # Start development server
npm test           # Run tests
npm run build      # Production build
npm run lint       # Lint code
```

### Python

```bash
pip install -r requirements.txt   # Install dependencies
python manage.py runserver        # Start dev server (Django)
# or
uvicorn main:app --reload         # Start dev server (FastAPI)
pytest                            # Run tests
```

---

## Code Conventions (Defaults — Override Once Stack Is Chosen)

### General

- **Indentation:** 2 spaces (JS/TS) or 4 spaces (Python)
- **Line length:** 100 characters max
- **Trailing newlines:** Always end files with a newline
- **No trailing whitespace**

### Naming

| Entity | Convention |
|--------|-----------|
| Files | `kebab-case` (JS/TS) or `snake_case` (Python) |
| Variables | `camelCase` (JS/TS) or `snake_case` (Python) |
| Constants | `UPPER_SNAKE_CASE` |
| Classes | `PascalCase` |
| Database tables | `snake_case`, plural (e.g., `attendance_records`) |
| API endpoints | `kebab-case`, RESTful (e.g., `/api/attendance-records`) |

### Comments

- Write comments for non-obvious logic only — avoid restating what the code does.
- Use `TODO:` and `FIXME:` prefixes for known issues.

---

## Testing Conventions (To Be Defined)

- Unit tests should live alongside source files or in a dedicated `__tests__` / `tests/` directory.
- Integration tests should cover API endpoints and database interactions.
- Aim for tests that document intent, not just cover lines.

---

## AI Assistant Guidelines

### When Working on This Repository

1. **Read before editing:** Always read existing files before modifying them.
2. **Minimal changes:** Only change what is explicitly requested or clearly necessary. Do not refactor unrelated code.
3. **No guessing:** If the task is ambiguous, ask for clarification rather than assuming.
4. **Security:** Never introduce SQL injection, XSS, or other OWASP vulnerabilities. Validate user input at system boundaries.
5. **No unnecessary abstractions:** Prefer simple, direct code over premature abstractions.
6. **Commit and push:** After completing implementation tasks, commit with a clear message and push to the designated `claude/` branch.

### Branch Protocol for AI

- Develop on the branch specified in the task description (always a `claude/` branch).
- Never push to `main` or `master` directly.
- Use `git push -u origin <branch-name>`.

### What to Update in This File

When new architectural decisions are made, update the relevant sections:

- [ ] Add chosen technology stack to "Development Setup"
- [ ] Add database schema overview when defined
- [ ] Add API endpoint list when routes are established
- [ ] Add CI/CD pipeline description when configured
- [ ] Add environment variable documentation when `.env` is needed
- [ ] Add deployment instructions when ready

---

## Environment Variables

Document required environment variables here as they are introduced. Example format:

```
DATABASE_URL=         # Connection string for the database
PORT=3000             # Port the server listens on
SECRET_KEY=           # Application secret (never commit the actual value)
```

---

## Directory Structure (To Be Populated)

```
attendance/
├── CLAUDE.md          # This file — AI assistant guide
├── README.md          # Human-facing project documentation (add when ready)
├── src/               # Application source code
├── tests/             # Test files
├── docs/              # Additional documentation
└── ...
```

---

*This file should be kept up to date as the project evolves. When in doubt about a convention, check here first.*
