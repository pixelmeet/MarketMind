# MarketMind AI — Agent Instructions & Workflow Rules

**Project Root:** `D:\MarketMind`

All AI coding assistants and developers operating in this repository MUST strictly follow the documentation-first workflow and governance rules defined below. These rules are binding for all tasks and sessions.

---

## The Seven Architectural & Implementation Documents

The repository's architectural and implementation source of truth is contained in the following seven documentation files located in the `doc/` directory:

1. [doc/overview.md](file:///d:/MarketMind/doc/overview.md) — System architecture, MVP scope boundaries, module structure, request lifecycle, background worker model, and AI abstention flow.
2. [doc/data-model.md](file:///d:/MarketMind/doc/data-model.md) — Database entities, ownership boundaries, constraints, financial precision rules, indexes, and migration strategy.
3. [doc/decisions.md](file:///d:/MarketMind/doc/decisions.md) — Accepted and open architectural decisions, technology choices, trade-offs, and risk register.
4. [doc/security.md](file:///d:/MarketMind/doc/security.md) — Security requirements (`SEC-*`), authentication, authorization, rate limiting, secrets management, input sanitization, and audit logging.
5. [doc/testing-strategy.md](file:///d:/MarketMind/doc/testing-strategy.md) — Testing pyramid, precision tolerances, authorization matrix, unit/integration/E2E expectations, and definition of done.
6. [doc/design.md](file:///d:/MarketMind/doc/design.md) — UI/UX design standards, Tailwind CSS conventions, token definitions, typography, layout, components, and accessibility (WCAG 2.2 AA).
7. [doc/backend.md](file:///d:/MarketMind/doc/backend.md) — Backend implementation standards, layer boundaries, Next.js server conventions, error taxonomy, worker lifecycle, and provider ports.

---

## Mandatory Workflow Rules

### Rule 1: Documentation first
* **Read all seven documentation files** at the beginning of every new task or session before taking any action or modifying code.
* Before each implementation change, review the relevant sections of the documentation in detail.
* Treat these documentation files as the project's architectural and implementation source of truth.

### Rule 2: Follow documented decisions
* Follow approved architecture, design, backend, data-model, security, and testing decisions.
* Respect labels such as `[Approved]`, `[Accepted]`, `[SoT]`, `[Provisional]`, and `[Open]`/`[Unresolved]`.
* **Never silently convert an unresolved or provisional decision into an approved one.**
* If a decision blocks the current task, stop immediately and ask the project owner for approval.
* If documentation files conflict, identify the exact files and sections, explain the conflict clearly, and stop before making affected changes.

### Rule 3: Update documentation when decisions change
* If an implementation requires a new architectural or technical decision, propose it first to the user.
* Obtain explicit approval before introducing decisions that affect architecture, dependencies, security, data handling, UI standards, or external providers.
* After approval is received, update the appropriate documentation before or alongside the implementation.
* Do not modify documentation merely to justify an unapproved implementation.

### Rule 4: Security and data integrity
* Review and follow `doc/security.md` and `doc/data-model.md` before implementing any related functionality.
* Never expose secrets, commit credentials or `.env*` files, bypass authorization, or disable security checks to make a feature work.
* Preserve user-data isolation (`userId` scoped repositories, composite foreign keys) and financial calculation requirements (Decimal arithmetic, never JavaScript `Number` for money).

### Rule 5: Testing and verification
* Follow `doc/testing-strategy.md`.
* Run relevant tests, type-checks, lint checks, and builds after changes.
* Never report a test, build, or lint check as passing unless it actually passed with verified command output.
* Report failures honestly and investigate them without weakening or bypassing required checks.

### Rule 6: Design consistency
* Follow `doc/design.md` for all UI work (semantic tokens, no raw arbitrary styling, accessible native components, no unapproved component libraries).
* Follow `doc/backend.md` for all backend work (layered architecture, closed error taxonomy, request pipeline).
* Follow the existing architecture and decisions for all cross-layer work.
* Do not introduce unapproved component libraries (e.g., shadcn/ui), frameworks, or dependencies.

### Rule 7: Small, reviewable changes
For every task, execute the following step-by-step workflow:
1. Inspect the current project and Git status.
2. Read the relevant documentation.
3. State the intended scope and affected files.
4. Identify blockers and unresolved decisions.
5. Implement only the approved scope.
6. Verify the changes (lint, type-check, build, test).
7. Review the diff (`git diff`) and report the result.
8. Stop for approval before moving to the next major task.
* Do not perform broad refactors or unrelated changes.

### Rule 8: Git safety
* Preserve existing history, branches, and remotes.
* Never force-push, reset, or rewrite history without explicit approval.
* Do not commit or push unless the user explicitly authorizes it.
* Keep secrets and generated files (`.next`, `node_modules`, etc.) out of commits.
