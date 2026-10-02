# MarketMind AI — Backend Implementation Standards

Status: **Draft for approval** · Complements the architecture set in `docs/architecture/`:
[overview](../docs/architecture/overview.md) · [decisions](../docs/architecture/decisions.md) · [data-model](../docs/architecture/data-model.md) · [security](../docs/architecture/security.md) · [testing-strategy](../docs/architecture/testing-strategy.md) · UI companion: [design.md](./design.md)

> Link paths assume `doc/` and `docs/architecture/` are sibling folders under the project root.

---

## 0. How to read this document

### 0.1 Status labels

| Label | Meaning |
|---|---|
| **[SoT]** | Required by the existing architecture documents (cited). Those documents are marked *Proposed* pending review; [SoT] means "binding for consistency", not "all open decisions are closed". |
| **[Approved]** | Stated by the project owner in the brief or task instructions. |
| **[Provisional]** | A default proposed here to make the SoT implementable. Reversible. **Not approved** until recorded in §16. |
| **[Open]** | Unresolved. No default is silently chosen. Where work must proceed, an *interim rule* is stated that creates no lock-in. |

### 0.2 Non-goals and constraints

- **[Approved]** No new frameworks, dependencies, APIs or database-design decisions without documenting and approving them. §16 lists every dependency or decision this document *touches* but does not approve.
- This document specifies *how to implement* what the architecture documents *decide*. It does not add tables, columns, endpoints, providers or libraries. Code samples are **illustrative contracts**, not files to be created in this task.
- Open decisions from the architecture set (U-01 … U-14, D-015 … D-018) remain open here. New open items from this document are numbered **BD-xx**.

### 0.3 Where each concern is defined

| Concern | Primary source | This document |
|---|---|---|
| Modules, flows, lifecycle | overview §3–§7 | §1, §2, §10, §12 |
| Tables, constraints, precision, migrations | data-model | §7, §8 |
| Security requirements (SEC-*) | security | §3–§6, §9, §11, §13 |
| Tests | testing-strategy | §14 |
| Decisions and risks | decisions | §15, §16 |

---

## 1. Application layers and module boundaries

### 1.1 Layers — [SoT overview §3.2–3.3]

```
app/ (routes, actions)   ──►  modules/<name>/index.ts (public API)
                                   │
                         service.ts (use-cases, authorisation, orchestration)
                           │                    │
                  domain/ (pure logic)    repository.ts (Prisma)
                                                │
                                          platform/ (config, logger, errors, rate limit, audit, http client, clock)
```

| Layer | Responsibility | May import | Must not |
|---|---|---|---|
| **Edge** (`app/`: pages, Server Actions, Route Handlers) | Parse input (Zod), resolve user, rate limit, call **one** service function, map result/error to UI/HTTP | module **public APIs**, `platform` | Query Prisma; contain business rules; import another module's internals |
| **Service** (`service.ts`) | Use-cases; **authorisation**; transaction scope; calls domain + repositories; writes audit entries | own `domain/`, own `repository`, other modules' **public APIs**, `platform` | Touch HTTP/Next.js request objects; format for UI |
| **Domain** (`domain/`) | Pure functions and types: financial maths, indicators, validators, citation checks, freshness derivation, backoff schedule | nothing with I/O (no Prisma, Next.js, network, clock/random — these are passed in) | Perform I/O; read env; import Prisma types (see BD-03) |
| **Repository** (`repository.ts`) | Prisma queries; maps rows ↔ domain entities; user-scoped by signature | Prisma client, `platform` | Contain business rules; return Prisma entities to callers outside the module |
| **Platform** (`platform/`) | Cross-cutting infrastructure only | nothing from other modules | Know about any domain concept |

### 1.2 Module rules — [SoT overview §3.2]

1. Dependencies between modules follow the table in [overview §3.2](../docs/architecture/overview.md) (e.g. `ai` → `research`, `market-data`, `indicators`; `ingestion` → `market-data`, `research` write APIs; `platform` → none). A new dependency edge requires updating that table.
2. A module's **public API** is `index.ts`: use-case functions and DTO types. Repositories, Prisma types and `domain/` internals are not exported. (Exception: `domain/` pure functions may be exported where another module legitimately needs them — e.g. `indicators` consumed by `ai` — via the public API only.)
3. **No cyclic imports.** Cross-module needs that would create a cycle are resolved by moving shared pure logic to the lower module or by passing data in.
4. Each module owns its tables ([overview §3.2 "Owns"](../docs/architecture/overview.md)); only that module's repository writes them. The documented exception is ingestion writing shared market/research data through the **owning module's write API**.
5. Enforcement: a boundary check in CI ([decisions R-12](../docs/architecture/decisions.md)). The tool (`dependency-cruiser`, `eslint-plugin-boundaries`, or a no-dependency custom script) is **[Open BD-07]** because each adds a dev dependency. **Interim rule:** a small repository script that fails CI if a file imports another module's non-`index` path or imports `@prisma/client` outside `repository.ts`/`platform`.

### 1.3 File and naming conventions — [Provisional]

`modules/<name>/{index.ts, service.ts, repository.ts, schemas.ts, errors.ts, domain/}`; DTO types named `<Thing>Dto`; Zod schemas `<thing>Schema` with inferred types; one use-case per exported function named as a verb phrase (`addTransaction`, `listWatchlists`); no default exports in modules; strict TypeScript; no `any` without a justified comment.

---

## 2. Next.js server-side responsibilities and API conventions

### 2.1 Responsibilities by mechanism — [Provisional, BD-01]

The architecture says "Route Handlers / Server Actions" without allocating work. Proposed allocation:

| Mechanism | Use for | Notes |
|---|---|---|
| **Server Components** | Reads for page rendering: call module **query use-cases** directly (never via HTTP to itself) | Pass explicit `UserContext`; per-request, user data never shared-cached |
| **Server Actions** | User-initiated **mutations** from the app's own UI (add watchlist item, add transaction, ask AI question) | Treated as public HTTP endpoints: full authn, authz, Zod validation, rate limit, CSRF per security SEC-AUTH-06 |
| **Route Handlers** | (a) JSON endpoints needed by client components (e.g. chart series, instrument search typeahead), (b) health endpoint, (c) any **internal** secret-protected endpoint (cache revalidation, if adopted), (d) auth-library callback routes | Same pipeline as Server Actions |
| **Middleware** | Coarse, optimistic redirects only (e.g. no session cookie → sign-in). **Never the sole authorisation check** | [SoT security SEC-AUTHZ-01] |

Final split is **[Open BD-01]** until reviewed; the *pipeline* in §2.2 is not optional whichever mechanism is used.

### 2.2 The request pipeline — [SoT overview §4, security]

Every Server Action / Route Handler runs the same ordered steps via one shared wrapper (the "declared-auth wrapper" required by [security SEC-AUTHZ-02](../docs/architecture/security.md)):

1. Assign a **request id** (§9.1).
2. **Rate-limit check** by route class (§9.2) — cheap rejection first.
3. **Parse and validate** input with Zod (§3).
4. **Resolve user** → `UserContext` or `UNAUTHENTICATED` (§5).
5. Call exactly one **service** use-case with `(userContext, validatedInput)`; the service authorises (§5–6).
6. Map the result to a **DTO** and the error to the closed taxonomy (§4).
7. Emit an access log line (§9.1).

The wrapper requires each route/action to declare its access level (`public` | `authenticated` | `admin`) explicitly; **a route without a declaration fails a CI check** (deny-by-default, [security SEC-AUTHZ-02]).

> Order note: validate-before-session is permitted for cheap rejection ([overview §4 rule 1](../docs/architecture/overview.md)), but **no data access occurs before authorisation**.

### 2.3 Runtime and server-only code — [Provisional, BD-11]

- Prisma-using code runs in the **Node.js runtime** (not Edge). **Interim rule** until verified against the installed versions.
- Server modules import a `server-only` guard so secrets and Prisma cannot reach client bundles ([security SEC-SEC-03](../docs/architecture/security.md); exact mechanism **[validate for installed Next.js]**).
- Caching defaults of data fetching and route handlers differ between Next.js versions; **do not rely on defaults** — set caching behaviour explicitly on every route that could be cached, and never cache user-scoped responses (§9.3). **[Assumption: verify against the installed version.]**

### 2.4 HTTP/JSON API conventions — [Provisional, BD-14]

Applies to Route Handlers returning JSON. Server Actions return the equivalent result type (§4.3).

| Topic | Convention |
|---|---|
| Path prefix/versioning | `/api/...`; whether to version (`/api/v1`) is **[Open BD-14]** — internal-only API, so unversioned is the interim rule |
| Methods | `GET` safe/idempotent reads; `POST` create/commands; `PATCH` partial update; `DELETE` delete; no state change on `GET` |
| Content type | `application/json; charset=utf-8`; requests with other types rejected for JSON routes |
| IDs | UUID strings; never sequential integers ([data-model §1](../docs/architecture/data-model.md)) |
| Instants | ISO-8601 UTC with `Z` (`2026-10-02T09:30:00.000Z`) |
| Trade dates | `YYYY-MM-DD` (IST trading date, no time or zone) |
| Money, price, quantity, ratios | **Decimal strings** (`"1234.5600"`), never JSON numbers ([security SEC-VAL-03](../docs/architecture/security.md)) |
| Pagination | Cursor-based where ordering is stable, otherwise bounded `limit` (hard maximum) + `cursor`; max page size enforced in the schema ([security SEC-VAL-07]) |
| Sorting/filtering | Allow-listed fields only |
| Idempotency | `Idempotency-Key`-style key on retryable mutations where defined (§9.4) |
| Freshness metadata | Responses containing market data include `asOf` / `dataDate` ([overview §4 rule 3](../docs/architecture/overview.md)) |
| Caching headers | Explicit per route: user-scoped → `private, no-store`; public market data → explicit `revalidate` policy (§9.3) |
| CORS | Closed (same-origin) ([security SEC-VAL-06b]) |
| Unknown routes/methods | `404`/`405` with the standard error body |

---

## 3. Input validation — [SoT security §4, decisions D-004]

1. **Zod at every trust boundary:** HTTP/Action input, env vars (§13), provider payloads (§11), LLM output (§12), and CSV uploads if added. Schemas live in the owning module's `schemas.ts`; **types are inferred, never hand-duplicated**.
2. **Strict objects.** Unknown keys are rejected (default) or stripped by an explicit, commented policy. Client-supplied `userId`, `role`, `createdAt` etc. are never accepted as input (mass-assignment protection, [testing §5.2](../docs/architecture/testing-strategy.md)).
3. **Bounds everywhere** ([security SEC-VAL-02]): max string length, array length, numeric range, decimal precision/scale (matching `NUMERIC(18,4)`/`(18,8)` — [data-model §1](../docs/architecture/data-model.md)), date ranges (no future trade dates; sane lower bound).
4. **Shared schema helpers** (own code, in `platform` or a shared `schemas` area): `decimalString({ precision, scale, min, max })`, `tradeDate()`, `uuid()`, `boundedText(max)`, `pageParams()`. They parse to the domain type (Decimal, date-only) so downstream code never re-parses.
5. **Normalisation at the boundary:** trim; Unicode-normalise names; lower-case emails; reject control characters in free text.
6. **Validation errors** convert to `VALIDATION` with per-field details (§4.2) — never leak schema internals or provider payloads.
7. **Domain-rule validation is not Zod's job.** Rules that need state (e.g. a SELL exceeding holdings at that date) live in the service/domain and also return `VALIDATION` with a `rule` code.
8. **Client-side validation is a convenience** and duplicates nothing authoritative ([design §8.3](./design.md)).

---

## 4. Response and error formats

### 4.1 Success shape — [Provisional, BD-02]

```jsonc
// illustrative contract — not code to create in this task
{
  "data": { /* DTO */ },
  "meta": { "asOf": "2026-10-02T09:30:00.000Z", "dataDate": "2026-10-01", "requestId": "…" }
}
```
`meta` is present only when relevant; lists add `meta.nextCursor`/`meta.limit`.

### 4.2 Error shape and taxonomy — [SoT overview §4 for the codes; Provisional for the envelope]

The code set is **closed** by the architecture: `VALIDATION`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `UPSTREAM_UNAVAILABLE`, `INTERNAL`. This document does **not** add codes. Finer distinctions go in `details.rule` (machine-readable sub-codes), not new top-level codes.

```jsonc
// illustrative
{ "error": { "code": "VALIDATION", "message": "Some fields are invalid.", "requestId": "…",
             "details": { "fields": [{ "path": "quantity", "issue": "must be greater than 0" }],
                          "rule": "SELL_EXCEEDS_HOLDINGS" } } }
```

| Code | HTTP | Notes |
|---|---|---|
| `VALIDATION` | 400 (422 acceptable; pick one — BD-02) | Includes domain-rule violations and idempotency-key misuse (§9.4) |
| `UNAUTHENTICATED` | 401 | No/expired/invalid session |
| `FORBIDDEN` | 403 | **Role** failures only (e.g. non-admin on admin route) |
| `NOT_FOUND` | 404 | Also returned for resources the caller does not own ([security SEC-AUTHZ-04]) — never 403 for ownership |
| `RATE_LIMITED` | 429 | `Retry-After` header |
| `UPSTREAM_UNAVAILABLE` | 503 | LLM/provider dependency on the request path |
| `INTERNAL` | 500 | Generic message + `requestId`; details only in logs |

Rules: messages are safe for display; no stack traces, SQL, file paths, provider payloads ([security SEC-VAL-08]); `FORBIDDEN` vs `NOT_FOUND` must not become an existence oracle; authentication failures return uniform responses ([security SEC-AUTH-04]).

### 4.3 Errors in code — [Provisional]

- A single `AppError` base (in `platform`) carrying `code`, `publicMessage`, optional `details`, and `cause`. Services throw `AppError` subclasses; **only the edge wrapper** converts them to HTTP/Action results. Unexpected exceptions become `INTERNAL`, logged with `requestId`.
- **Server Actions return a discriminated result** `{ ok: true, data } | { ok: false, error }` for expected failures rather than throwing across the client boundary; truly unexpected errors surface the generic error UI.
- Prisma errors are mapped in repositories (§7.5), never leaked upward.
- **AI abstention is not an error** (§12.6): it is a successful domain result with `status: "ABSTAINED"` and a `reason`.

---

## 5. Authentication and server-side authorisation

### 5.1 Authentication — [SoT security §2; library OPEN U-08/D-015]

The library is **not chosen**. This document therefore specifies only the **seam** that keeps the choice replaceable ([decisions R-15](../docs/architecture/decisions.md)):

- The `identity` module exposes `getUserContext(request) → UserContext | null` and `requireUser()`; nothing outside `identity` imports the auth library.
- `UserContext` (illustrative): `{ userId, role: 'USER' | 'ADMIN', sessionId, … }` — minimal; no password hashes or tokens.
- Session cookie, CSRF, hashing, lifetimes follow SEC-AUTH-01…08; **no custom cryptography** (SEC-AUTH-01).
- Disabled users (`disabledAt`) are rejected at context resolution on every request (SEC-AUTH-08).
- Sign-in methods and email-verification gating are **[Open U-08]**.

### 5.2 Authorisation — [SoT security §3]

1. **Server-side, in the service layer, for every operation** (SEC-AUTHZ-01). UI hiding and middleware are conveniences.
2. **Deny by default:** every edge handler declares `public | authenticated | admin`; undeclared fails CI (SEC-AUTHZ-02).
3. **Two checks, in order:** (a) *role/access level* (edge wrapper), (b) *resource ownership* (service, via scoped repository calls — §6).
4. **Ownership failures → `NOT_FOUND`**; role failures → `FORBIDDEN` (SEC-AUTHZ-04).
5. **Admin ≠ data access.** `ADMIN` can operate ingestion and sources; it does **not** automatically read other users' portfolios/watchlists/AI history ([testing §5.1](../docs/architecture/testing-strategy.md)). Any such capability would be a new, approved, audited feature.
6. **Shared data** (market data, documents) is readable by any authenticated user but filtered by `licenseRestriction` / `allowsDisplay` server-side (SEC-AUTHZ-08, SEC-AI-08).
7. **Worker authority:** the worker is not reachable through any public route that grants its privileges; internal endpoints require a secret and are rate limited (SEC-AUTHZ-09).
8. Every authorisation denial is audit-logged (SEC-AUD-01).

---

## 6. User-data isolation and tenant-scoping rules

"Tenant" = the individual user; there are no organisations in the MVP.

### 6.1 Rules — [SoT security SEC-AUTHZ-03…07, data-model §2]

1. **Classification first.** Every table is *shared*, *user-owned*, *operational*, or *security* ([data-model §2](../docs/architecture/data-model.md)). A new table must be classified in the same change.
2. **`userId` is a mandatory parameter** of every repository function touching user-owned data; there is no overload without it. Queries filter by it directly or through one documented parent join (watchlist → items; portfolio → transactions; query → answer → citations).
3. **Child resources are never addressed by ID alone.** Operations on a `WatchlistItem` or `Transaction` verify the parent's `userId` in the same query (e.g. `where: { id, portfolio: { userId } }`) — not a separate "check then act" that can race.
4. **Client-provided IDs are untrusted.** Re-verify ownership even if the ID came from a page you rendered.
5. **Composite-FK defence in depth** ([data-model §4.5](../docs/architecture/data-model.md)): `Transaction(portfolioId, userId)` referencing `Portfolio(id, userId)` is **recommended** there; adoption is a data-model decision to be confirmed — this document does not add it.
6. **DTO-only responses** (SEC-AUTHZ-07): repositories map to domain entities, services to DTOs with explicit field lists; never serialise Prisma rows.
7. **No cross-user aggregation endpoints** in the MVP. Any statistic computed across users would need a new design review.
8. **AI isolation:** prompts contain **no user data** in the MVP (SEC-AI-02, SEC-AI-05); AI history is user-owned; cached AI answers are keyed by (instrument, normalised question, evidence-set hash) and **never cross users if user data is involved** ([overview §7.4](../docs/architecture/overview.md)).
9. **Raw SQL** touching user-owned tables must include the `userId` predicate and is code-reviewed against this section.
10. **Account deletion** cascades to user-owned rows; audit rows survive using a pseudonymous reference ([data-model §4.8](../docs/architecture/data-model.md); retention U-12 open).

### 6.2 Repository signature pattern (illustrative)

```ts
// illustrative — shows the shape the rule enforces, not a file to create
listWatchlists(userId: UserId): Promise<WatchlistEntity[]>
getTransaction(userId: UserId, portfolioId: PortfolioId, id: TransactionId): Promise<TransactionEntity | null>
// there is intentionally no getTransactionById(id)
```
A compile-time test confirms user-owned repository functions cannot be called without `userId` ([testing §5.2](../docs/architecture/testing-strategy.md)).

### 6.3 Required verification
The authorisation matrix tests in [testing §5.1](../docs/architecture/testing-strategy.md) enumerate each operation for anonymous / user A / user B / disabled / admin. A new user-owned operation without a matrix entry is not "done" ([testing §10](../docs/architecture/testing-strategy.md)).

---

## 7. Prisma and database access conventions

### 7.1 Client and connections
- **One `PrismaClient` per process**, created in a single module and reused (guarding against duplicate instances during development hot reload).
- Connection pooling/limits depend on the hosting reality — **[Open U-09, BD-12]**. **Interim rule:** configure explicit connection limits; run migrations over a **direct (non-pooled)** connection ([data-model §7.9](../docs/architecture/data-model.md)); the web app and worker use separate DB credentials where the host allows (SEC-OPS-01).
- Database access only through **repositories** (SEC-AUTHZ-03). Edge handlers and components never import the client.

### 7.2 Query conventions
- **Explicit `select`** of needed columns (avoid fetching hash columns, large `text`, or `tsv`).
- **No N+1**: use relation queries or batched `where: { id: { in: [...] } }`; review any query inside a loop.
- **Bounded results**: every list query has a maximum `take` (SEC-VAL-07); no unbounded `findMany` on `PriceBar`, `Document`, `DocumentChunk`, `AuditLog`.
- **Deterministic ordering** on every paginated query (include a unique tiebreaker).
- **Time-series reads** use the PK range `(instrumentId, tradeDate)` ([data-model §4.2](../docs/architecture/data-model.md)); no per-row queries for charts.
- `deleteMany`/`updateMany` always have an explicit `where` including `userId` for user-owned data.
- **Indexes are added for measured or catalogued access paths only** ([data-model §5](../docs/architecture/data-model.md)).

### 7.3 Schema-type mappings — [SoT data-model §1, decisions D-003]
- Instants: `DateTime @db.Timestamptz(3)` (the Prisma default is timezone-less **[verify on installed version]**).
- Trade dates: `@db.Date`; treat as **date-only (IST trading date)**. Prisma returns a JS `Date`; convert via one helper (`toTradeDate`/`fromTradeDate`) that never applies the process timezone. Tests run under a non-IST timezone ([testing §1.5, §4.1](../docs/architecture/testing-strategy.md)).
- Money/price/quantity: `Decimal` mapped to `NUMERIC(p,s)` per the data model; never `Float`.
- `tsvector`, partial unique indexes, CHECK constraints: **hand-written SQL in migrations** (D-003); raw queries use **tagged-template parameters only**; `$queryRawUnsafe`/`$executeRawUnsafe` are banned with user-influenced input (SEC-VAL-04).

### 7.4 Transactions — [Provisional unless noted]
1. **Mutation + audit entry in one transaction** — no state change without its audit record; mutation endpoints fail closed if the audit write fails ([SoT SEC-AUD-04/05]).
2. Use **interactive transactions** for multi-step invariants; keep them **short**: no network calls (LLM, providers, HTTP) and no heavy computation inside a transaction.
3. **Ingestion batch upserts** (idempotent by natural key) run in transactions sized in bounded batches ([overview §5 step 6](../docs/architecture/overview.md)).
4. **Ledger invariant under concurrency [Open BD-05]:** "cumulative SELL ≤ cumulative BUY at every point in time per instrument" ([data-model §4.5](../docs/architecture/data-model.md)) is checked in the service. Two concurrent writes could each pass the check individually. Options to decide: (a) lock the `Portfolio` row (`SELECT … FOR UPDATE` via tagged raw SQL) during ledger writes; (b) `Serializable` isolation with bounded retry; (c) accept and re-verify on read. **Interim rule:** option (a) is the leading candidate **[Recommendation]**; do not implement ledger writes until this is approved.
5. **Idempotent retries inside transactions** are forbidden to hide errors; a serialization/deadlock failure is retried by wrapper code a bounded number of times, then surfaces as `INTERNAL`.
6. Queue claiming uses `FOR UPDATE SKIP LOCKED` via tagged `$queryRaw` ([data-model §4.7](../docs/architecture/data-model.md); implementation choice D-016/U-05 open).

### 7.5 Error mapping (in repositories)
| Prisma condition | Maps to |
|---|---|
| Unique-constraint violation (`P2002`) | Domain conflict → `VALIDATION` with `rule` (e.g. `DUPLICATE_NAME`) — or idempotent success for ingestion upsert paths |
| Record not found for update/delete (`P2025`) | `NOT_FOUND` |
| FK violation | `VALIDATION` (`rule: UNKNOWN_REFERENCE`) |
| Connection/timeout | Retryable → `INTERNAL`/`UPSTREAM_UNAVAILABLE` per path; never expose messages |
**[Assumption: Prisma error codes confirmed against installed version.]**

### 7.6 Migrations — [SoT data-model §7]
Prisma Migrate forward-only, expand→migrate→contract, hand-written SQL for non-expressible features, backup before production migration, CI fresh+upgrade+drift checks, synthetic dev seeds only. Not repeated here.

---

## 8. Decimal precision for financial calculations

### 8.1 Rules — [SoT data-model §6, decisions D-010]
1. **Storage:** `NUMERIC`, never float.
2. **Application:** Decimal objects end to end in `domain/` and services for money, price, quantity, cost basis, weights, P&L.
3. **No JS `number` arithmetic on money.** `Number(decimal)` is permitted **only** at the chart/presentation edge ([design §9.3](./design.md)).
4. **Over the wire:** decimals are strings (§2.4); parsed by Zod helpers (§3.4).
5. **Rounding:** one shared helper; mode applied **only at presentation or persistence of a displayed value**; intermediates keep full precision. Rounding mode (half-even vs half-up) is **[Open]** (data-model §6.2, testing §11) — **interim rule:** centralise it behind a single function so changing the decision is a one-line change; do not pick implicitly.
6. **Comparisons** use Decimal methods (`eq`, `lt`, …), never `==`/`<` on mixed types.
7. **Division safety:** guard zero denominators explicitly (empty portfolio, zero total market value) and return a defined "not computable" state, not `NaN`/`Infinity` ([testing §3.2](../docs/architecture/testing-strategy.md)).
8. **Missing prices:** unpriced positions are excluded and **flagged**, never valued at zero ([data-model §6.3](../docs/architecture/data-model.md)).
9. **Indicators** may use floats internally if documented and golden-tested to a stated tolerance (D-010 note); their outputs cross to the UI as numbers at the presentation edge. Portfolio/money maths may not.
10. **Formulas** (position quantity, average cost, market value, weights, top-N, HHI) are exactly those in [data-model §6.3](../docs/architecture/data-model.md); the cost-basis method is **[Open U-11]** — implement behind a strategy interface and do not hard-code average cost as final.

### 8.2 Decimal library and the domain-purity tension — [Open BD-03]
[decisions D-010](../docs/architecture/decisions.md) says to use `Decimal.js` "already a Prisma dependency", while [overview §3.2](../docs/architecture/overview.md) says `domain/` imports **nothing from Prisma**. Importing `Prisma.Decimal` would couple `domain/` to Prisma; relying on a *transitive* dependency directly is fragile. Options:
- (a) Declare `decimal.js` as a **direct** dependency (same library Prisma uses; keep versions compatible) and use it in `domain/` — a **new direct dependency requiring approval**.
- (b) Define a thin `Money`/`Decimal` abstraction in `platform` backed by whichever library is approved, with repositories converting Prisma decimals at the boundary.
**Interim rule:** do not write financial `domain/` code until BD-03 is decided.

---

## 9. Logging, rate limiting, caching and idempotency

### 9.1 Logging — [SoT overview §7.5, security SEC-SEC-05, SEC-AUD]
- **Structured JSON** logs to stdout; fields: `ts`, `level`, `msg`, `requestId`, `module`, `route`/`action`, `userRef` (pseudonymous; no email), `jobId`, `providerKey`, `durationMs`, `errorCode`.
- **Request id:** generated server-side per request/job and propagated through services; an incoming `x-request-id` is recorded as a *separate untrusted* field, never trusted as the id **[Provisional BD-15]**.
- **Never log:** secrets, tokens, session ids, auth headers, full prompts/answers, raw provider payloads, passwords, financial amounts beyond what a defined event needs. A **redaction layer** plus a test with sample secrets ([testing §5.2]) enforces this.
- Levels: `error` (unexpected failure), `warn` (degraded: stale data, retry, rate limit), `info` (lifecycle: job started/finished, request summary), `debug` (off in production).
- **Logger implementation [Open BD-06]:** no logging library is approved. **Interim rule:** a minimal in-house wrapper over the platform logging primitive in `platform`; a library (e.g. a structured logger) needs approval.
- Logging is not auditing: security-relevant events additionally go to `AuditLog` per [security §7](../docs/architecture/security.md) (allow-listed metadata, same transaction for mutations).

### 9.2 Rate limiting — [SoT security §5; storage OPEN U-10/D-018]
- A **`RateLimiter` port** in `platform`; the edge wrapper consults it by **route class**: `auth` (strict), `ai` (strict + daily budget), `write` (moderate), `read` (generous), `admin`. Numeric limits are configuration decided in Phase 2.
- **Key** = user id (when authenticated) + IP; trusted-proxy header handling is explicit so IPs cannot be spoofed (SEC-RATE-02; depends on host).
- **Response:** `429` + `Retry-After`; trips audit-logged in aggregate (SEC-RATE-03).
- **Storage is open:** an in-memory adapter is allowed **only for tests/local development** because it is invalid on multi-instance/serverless hosting (SEC-RATE-04). The Postgres-backed adapter (`RateLimitBucket`, [data-model §4.8](../docs/architecture/data-model.md)) is the portable candidate, adopted only after U-09/U-10.
- **AI budget:** per-user daily cap plus a **global** ceiling aligned with provider quota (SEC-RATE-05). The counting source (count `AiQuery` rows vs. bucket counters) and the **day boundary timezone** (IST vs UTC) are **[Open BD-16]**.
- Heavy operations (backfill/manual ingestion) are admin-only (SEC-RATE-06) and **only enqueue jobs**; they never call providers on the request path (D-006).

### 9.3 Caching — [SoT decisions D-012, overview §7.4]
| Data | Rule |
|---|---|
| User-scoped responses (watchlists, portfolio, AI history) | **Never shared-cached**; `private, no-store`; per-request |
| Public instrument/price data | Next.js caching with an **explicit** `revalidate` policy; invalidation after ingestion via time-based revalidation (**interim default**) |
| Worker → web invalidation | **[Open BD-10]**: the worker is a separate process; options: time-based `revalidate` only, or an authenticated internal revalidation endpoint (SEC-AUTHZ-09). Do not implement the endpoint without approval |
| Indicator series | Compute on read; in-process memoisation keyed by `(instrumentId, params, lastBarDate)`; memo is bounded in size and tolerant of process restarts |
| AI answers | Optional cache by `(instrumentId, normalisedQuestion, evidenceSetHash)`; never when user data is in the prompt |
No Redis or external cache in the MVP ([decisions §2](../docs/architecture/decisions.md)).

### 9.4 Idempotency — [SoT overview §7.3; data-model §4.5; semantics Provisional, BD-08]
- **Ingestion:** idempotent by natural key (`PriceBar(instrumentId, tradeDate)`, `Document(sourceId, canonicalUrlHash)`, `CorporateAction(instrumentId, type, exDate)`); re-running a job never duplicates (testing §4.2).
- **User mutations that can double-submit** (e.g. add transaction): accept an optional client-generated key stored as `Transaction.clientRequestId` with `UQ(portfolioId, clientRequestId)` ([data-model §4.5](../docs/architecture/data-model.md)). Semantics proposed:
  - same key + same payload → return the original result (no new row);
  - same key + different payload → `VALIDATION` with `rule: IDEMPOTENCY_KEY_REUSED`;
  - key retention matches the row's lifetime (no separate key store).
- Generalising idempotency keys to other mutations would need a data-model decision (not made here).
- UI protection (disable-on-submit) is complementary ([design §8.3](./design.md)).
- **LLM calls:** retry only idempotent generation requests, bounded (overview §7.3).

---

## 10. Worker lifecycle, queue processing, retries and recovery

Sources: [overview §5](../docs/architecture/overview.md), [data-model §4.7](../docs/architecture/data-model.md), [decisions §3.2 (dual-mode recommendation)](../docs/architecture/decisions.md), [security SEC-AUTHZ-09, §8.1](../docs/architecture/security.md). Queue implementation (hand-rolled vs library) is **[Open D-016/U-05]**; the leaning is hand-rolled — this section is written to be implementable either way.

### 10.1 Process model
- Separate entrypoint (`worker/main`) in the same codebase, sharing module code; **no HTTP routes with privileges** (SEC-AUTHZ-09).
- **Two run modes [SoT decisions §3.2 recommendation]:** (1) long-running loop; (2) **drain-once** — run all due jobs, then exit — for scheduled invocation on hosts that cannot keep processes alive (U-09). Mode is a config flag; behaviour is otherwise identical.
- Uses its own DB credentials where possible and the same env validation as the web app (§13).

### 10.2 Startup
1. Validate environment (fail fast).
2. Connect to the database; verify migration version compatibility.
3. Register job handlers per `type`; unknown job types are failed as non-retryable, not silently ignored.
4. **Recover:** reclaim jobs whose lock expired (§10.6).
5. Start scheduler and runner (loop mode) or runner only (drain-once).

### 10.3 Scheduling
- The scheduler **enqueues** jobs with a `dedupeKey` (partial unique index prevents duplicate active jobs); it never executes work.
- Cadences are configuration. Market-calendar awareness (exchange holidays, close time 15:30 IST) depends on **[Open U-07]**; until resolved, schedules run on trading-day *candidates* and handlers tolerate "no new data" without marking failure.
- Backfills are separate, lower-priority job types with their own request budgets so they cannot starve incremental updates or exhaust provider quotas (overview §5 step 9).

### 10.4 Claiming and concurrency
- Claim with `SELECT … FOR UPDATE SKIP LOCKED` ordered by `runAfter`, filtered `status='QUEUED' AND runAfter <= now()`; set `RUNNING`, `lockedAt`, `lockedBy` in the same statement/transaction.
- **Per-source fairness and isolation:** concurrency limits per `DataSource`; one failing provider must not block others ([testing §4.2 "Provider isolation"](../docs/architecture/testing-strategy.md)).
- Claim batch size, poll interval (with jitter) and concurrency are configuration **[values Open BD-09]**.

### 10.5 Handler contract
Every handler is: **idempotent**; **time-bounded** (hard timeout via an abort signal); **side-effect-scoped** (writes only through owning modules' write APIs); **transactional per batch**; and records an `IngestionRun` (counts, duration, outcome, sanitised error) and updates `DataFreshness` on success.

Handler steps (from overview §5): fetch (hardened client) → Zod-validate → domain sanity checks (OHLC ordering, non-negative volume, no future dates, abnormal-jump flagging) → idempotent upsert → record run → update freshness. Rows failing validation are **counted and recorded**; exceeding the reject-ratio threshold fails the run (threshold **[Open BD-09]**).

### 10.6 Retries, dead-letter and recovery
| Concern | Rule |
|---|---|
| Retryable | Network errors, timeouts, `429`, `5xx` → status back to `QUEUED`, `attempts+1`, `runAfter = now + backoff` |
| Non-retryable | Schema breaks, auth/`4xx` (other than 429), licence-gate failure → `DEAD` immediately |
| Backoff | **Exponential with jitter**; honour a provider's `Retry-After` when present; ceiling configured. Parameters **[Open BD-09]**; the schedule function lives in `domain/` and is unit-tested ([testing §3.4]) |
| Exhaustion | `attempts >= maxAttempts` → `DEAD`; visible in the admin view; operator may re-queue after fixing the cause (audited) |
| Crash recovery | Jobs `RUNNING` with `lockedAt` older than the **visibility timeout** are reclaimed to `QUEUED` **exactly once** per expiry (tested). Whether a reclaim counts as an attempt is **[Open BD-09]** |
| Poison payloads | Payload validated on claim; invalid payload → `DEAD` with a sanitised `lastErrorCode` |
| Long jobs | Heartbeat extends `lockedAt` periodically (so a healthy long job is not reclaimed mid-run) |

### 10.7 Shutdown
On `SIGTERM`/`SIGINT`: stop claiming; let in-flight handlers finish within a grace period; for those that do not finish, **release the lock** (`QUEUED`, no attempt penalty) or rely on visibility-timeout recovery; flush logs; exit non-zero only on unrecoverable startup/runtime errors.

### 10.8 Observability and safety
- Every run has a `jobId`/`runId` in logs; `IngestionRun` is the operator's history; rolling retention (U-12).
- `lastErrorCode` stores **sanitised** codes — never URLs containing tokens or provider payloads (data-model §4.7).
- No handler ever runs on the request path; user/admin actions only **enqueue**.

---

## 11. Provider-independent adapters (market data, news/disclosures)

Sources: [decisions D-005, D-006, D-014, §3](../docs/architecture/decisions.md), [security §8.1](../docs/architecture/security.md), [overview §5](../docs/architecture/overview.md). **No provider is named, selected or assumed to be free or permitted** (U-01, U-02 open). Interfaces below are **illustrative and Provisional**: per D-005 they must be validated against **at least two real provider shapes** before being frozen.

### 11.1 Ports (illustrative)

```ts
// illustrative contracts — not a decision on provider capabilities
interface MarketDataProvider {
  readonly key: string;                       // matches DataSource.key
  fetchInstruments(...): Promise<ProviderResult<CanonicalInstrument[]>>;
  fetchDailyBars(...):   Promise<ProviderResult<CanonicalDailyBar[]>>;
  fetchCorporateActions?(...): Promise<ProviderResult<CanonicalCorporateAction[]>>; // optional: depends on U-04
}
interface DocumentProvider {                  // news and disclosures
  readonly key: string;
  fetchDocuments(...): Promise<ProviderResult<CanonicalDocument[]>>;
}
```
`ProviderResult` carries data, rejected-record info, provider-reported limits, and a **classified error** (retryable / non-retryable / rate-limited with `retryAfter`). Which optional operations a provider supports is **declared by the adapter, never assumed** — no capability is invented in this document.

### 11.2 Adapter responsibilities
1. Authenticate and call the vendor **only through the hardened HTTP client** (SEC-EXT-01): allow-listed host per `DataSource`, HTTPS, post-DNS private-range checks including on redirects, timeouts, size and content-type caps.
2. **Respect provider limits** (rate, quota, pagination) with an internal limiter; surface quota exhaustion as rate-limited, retryable errors.
3. **Zod-parse** every response into vendor-shaped types, then **map** to canonical types. **Vendor types never leave the adapter.**
4. **Classify errors** (§10.6); never throw raw HTTP/SDK errors upward.
5. Attach **provenance** (`sourceId`, `ingestionRunId`) so rows carry lineage ([data-model §4.2](../docs/architecture/data-model.md)).
6. Perform **no database writes** — adapters return data; the ingestion handler persists it through module write APIs.

### 11.3 Canonical types — [SoT data-model]
`CanonicalInstrument`, `CanonicalDailyBar`, `CanonicalCorporateAction`, `CanonicalDocument` mirror the columns of `Instrument`, `PriceBar`, `CorporateAction`, `Document` (+ `licenseRestriction`). Prices/quantities are Decimal strings from the adapter on (§8). Adding a canonical field is a data-model change requiring approval.

### 11.4 Licence gate — [SoT D-014]
- A `DataSource` is usable only if `enabled = true`, which requires `licenseReviewedAt` (DB CHECK) and the explicit `allowsStorage` / `allowsDisplay` / `allowsAiProcessing` flags.
- Ingestion refuses to schedule disabled sources; documents inherit `licenseRestriction`; `LINK_ONLY` content is **never stored as text or sent to the LLM** (SEC-AI-08).
- A new provider is **not** wired into production code until its source-evaluation record exists (decisions §3.3 gate).

### 11.5 News and disclosure pipeline specifics
1. Fetch → validate → **canonicalise URL** and hash → dedupe by `(sourceId, canonicalUrlHash)` and content hash.
2. **Sanitise to plain text** (strip scripts/styles/iframes/forms, normalise Unicode, drop zero-width/control characters, cap length) — raw HTML is **not retained** (SEC-EXT-03).
3. **Entity linking** to instruments by ticker/name/ISIN/source tag; the method is recorded in `DocumentInstrument.matchedBy` for auditability (data-model §4.3). False-positive handling and thresholds **[Open]** (needs real data).
4. **Chunk** text into immutable `DocumentChunk` rows with `textHash` and `tsv` (chunk size/overlap **[Open]**, to be tuned against the evaluation set — testing §6.4).
5. Honour each source's terms and `robots.txt`; **no scraping without explicit prior review** (SEC-EXT-04; decisions §3.4).

### 11.6 Testing
Each adapter has recorded-fixture contract tests (fixtures licence-safe or synthetic — testing §1.3) and shares a **conformance suite** with its fake ([testing §9](../docs/architecture/testing-strategy.md)). SSRF, oversize, wrong-content-type and schema-break cases are covered at the client and adapter level.

### 11.7 Adding a provider — checklist
Source evaluation recorded (terms URL + read date, permitted uses, quotas, coverage, cost) → `DataSource` row with licence fields → adapter + Zod schemas + fixtures + conformance tests → documented error classification → reviewed for SEC-EXT requirements → approved dependency list unchanged (or approved additions).

---

## 12. AI evidence retrieval, citation validation and abstention

Sources: [overview §6](../docs/architecture/overview.md), [decisions D-008, D-009](../docs/architecture/decisions.md), [data-model §4.3, §4.6](../docs/architecture/data-model.md), [security §8.3](../docs/architecture/security.md), [testing §6](../docs/architecture/testing-strategy.md). This section defines implementation structure; it does not alter the flow.

### 12.1 Module structure — [Provisional]
`ai/` contains: `intent` (classify answerable vs. advice/prediction/out-of-scope), `retrieval` (evidence assembly), `evidence` (types, ID assignment), `prompt` (versioned templates), `provider` (`LlmProvider` port + fake), `validator` (pure, deterministic), `orchestrator` (the flow), `repository` (`AiQuery`/`AiAnswer`/`AiCitation`). The validator and intent rules are `domain/`-pure.

### 12.2 Orchestration steps (as in overview §6)
Validate/auth/rate-limit/budget → classify intent → retrieve evidence → sufficiency check → generate → deterministic citation validation → (one regeneration on failure) → persist → return. **Abstain at any gate**, recording the reason.

### 12.3 Retrieval — [SoT D-008]
- **Scoped** to the instrument and date window; PostgreSQL FTS over `DocumentChunk.tsv` with metadata filters (instrument via `DocumentInstrument`, `kind`, `publishedAt`).
- **Always excludes** documents whose source has `allowsAiProcessing = false` or whose `licenseRestriction` is `LINK_ONLY` (SEC-AI-08).
- **Structured evidence** (price statistics, indicator values) is produced by `market-data`/`indicators` with **as-of dates**, as evidence items of kind `STRUCTURED`.
- Each evidence item gets a **request-local stable ID** (e.g. `E1…En`); the retrieved set is the **only** valid citation universe for that request (cross-request/cross-user IDs are invalid by construction).
- Retrieval is **deterministic for the same inputs** (stable ordering/tie-breaks) to keep tests reliable.
- **No vector search** in MVP; `pgvector` only per the D-008 trigger (retrieval evaluation failure).
- FTS language configuration (`english` vs `simple`) **[Open — decide with test data, D-008]**.

### 12.4 Sufficiency gate
Abstain (`INSUFFICIENT_EVIDENCE`) **without calling the LLM** when evidence is below the minimum count, relevance score or recency window. **Thresholds are [Open]** and are set from the evaluation set ([testing §6.4, §11](../docs/architecture/testing-strategy.md)); until then, implement them as configuration parameters with no hard-coded defaults claimed as final.

### 12.5 Generation contract
- The `LlmProvider` port (illustrative): `generateStructured({ system, evidence, question, schema, timeoutMs }) → { output, usage, model }`. Provider and model are **[Open U-03]**.
- Evidence is passed in **delimited, untrusted data blocks**; the system prompt states retrieved text is data, not instructions (SEC-AI-01). The model has **no tools, no network, no user data** (SEC-AI-02/05).
- Output schema: `claims[]`, each `{ text, evidenceIds[] }`, plus optional verbatim `quote` per citation. Parsed with Zod (SEC-VAL-01).
- Strict timeout, bounded idempotent retry, in-process circuit breaker; on failure → `UPSTREAM_UNAVAILABLE` abstention ([overview §7.2](../docs/architecture/overview.md)).
- Prompt templates are **versioned**; `promptVersion`, provider, model, tokens and latency are stored on `AiQuery` ([data-model §4.6](../docs/architecture/data-model.md)).
- System prompts are assumed extractable and contain nothing secret (SEC-AI-05).

### 12.6 Citation validation — deterministic, no LLM involved
Implemented as pure functions returning a structured **violation report** (stored in `AiAnswer.validatorReport`). Checks (overview §6):
1. Output parses against the answer schema.
2. Every claim has ≥ 1 `evidenceId`; every ID ∈ this request's retrieved set.
3. Quotes are **verbatim substrings** of the cited evidence after whitespace normalisation.
4. Numeric claims tied to structured evidence match the computed values within a tolerance (**tolerance [Open]** — testing §11).
5. Evidence respects the question's recency window; stale evidence is labelled with its date.
6. Uncited free text is rejected or stripped — **policy [Open]** (testing §11); until decided, treat uncited text as a **validation failure**, the safer behaviour.
7. Any URL in the output exists in the evidence set (SEC-AI-03).
8. No recommendation/prediction language (secondary defence to intent classification, SEC-AI-06).

On failure: **one** regeneration with the violation list; if still failing → abstain `CITATION_VALIDATION_FAILED`.

### 12.7 Abstention — first-class
- Reasons are exactly: `UNSUPPORTED_REQUEST`, `INSUFFICIENT_EVIDENCE`, `CITATION_VALIDATION_FAILED`, `UPSTREAM_UNAVAILABLE` ([data-model §4.6](../docs/architecture/data-model.md)).
- Abstention is a **successful domain result** returned with HTTP 200 / `ok: true` and `status: "ABSTAINED"` **[Provisional]** — *not* an error code — so UIs treat it as a designed outcome ([design §10.7](./design.md)). Genuine failures (`RATE_LIMITED`, `UNAUTHENTICATED`, `INTERNAL`) remain errors.
- `UNSUPPORTED_REQUEST` is decided by **code** (classifier + output check), not only prompt wording (SEC-AI-06); no LLM call is made for clearly unsupported requests.
- Every outcome persists an `AiQuery` (status, reason, provider/model/promptVersion, usage); answered queries also persist `AiAnswer` + `AiCitation` with `chunkTextHash` and `quote`.

### 12.8 Output handling
Return DTOs with answer claims, citation details (quote, source, publisher, published date, link-out domain), evidence as-of dates and the standing disclaimer. Never return raw model text outside validated structure. Rendering rules: [design §10.7](./design.md), SEC-AI-04, SEC-EXT-07/08.

### 12.9 Testing
Fake `LlmProvider` for all CI tests; validator unit tests; orchestration integration tests; adversarial/injection corpus; abstention tests; optional manual evaluation harness not gating CI — all per [testing §6](../docs/architecture/testing-strategy.md).

---

## 13. Secrets handling and environment variables — [SoT security §6]

1. **Single env module** in `platform/config`: Zod schema parses `process.env` **once at startup**; the process fails fast on missing/invalid values (SEC-SEC-03). All other code imports the typed config object — **no scattered `process.env` reads**.
2. **Server-only secrets never use the client-exposed prefix** (`NEXT_PUBLIC_`) and live only in server modules guarded by `server-only`. Only non-secret, deliberately public values may be client-exposed.
3. **Variable categories** (names are indicative, final names are decided at implementation): database URLs (pooled and direct), auth secrets/session keys (shape depends on U-08), provider credentials (per `DataSource`), LLM provider key, internal-endpoint secret (if BD-10 adopts one), rate-limit/budget settings, feature flags, log level, run mode for the worker.
4. **`.env.example`** with placeholders is committed; real `.env*` files are git-ignored (SEC-SEC-01). Secret scanning in CI and pre-commit (tool selection **[Open]**).
5. **Distinct credentials per environment** (dev/CI/prod); **test mode refuses production hosts** ([testing §9](../docs/architecture/testing-strategy.md)).
6. **Least privilege & rotation:** provider keys scoped where supported; rotation without code change; documented rotation and incident procedure before public launch (SEC-SEC-04/06).
7. **No secrets in logs, audit metadata, error output, snapshots** (§9.1; SEC-SEC-05).
8. Secrets never appear in prompts or evidence blocks (SEC-AI-05).

---

## 14. Testing expectations — [SoT testing-strategy]

The strategy, tooling candidates, matrices and E2E workflows are in [testing-strategy.md](../docs/architecture/testing-strategy.md). Backend work is **"done"** only when ([testing §10](../docs/architecture/testing-strategy.md)):

| Change | Required |
|---|---|
| Pure/financial logic (`domain/`) | Unit tests incl. edge cases; golden/independent expected values; property tests where listed (§3 of testing doc) |
| Repository/migration/SQL | Integration tests on real PostgreSQL: constraints, precision round-trip, timezone independence, raw-SQL assets present |
| New user-owned operation | Authorisation matrix entry (anonymous, A, B, disabled, admin); mass-assignment and DTO-leak checks |
| New external input | Zod schema with bounds + rejection tests |
| Ingestion/handler | Idempotency, retry/non-retryable classification, crash recovery, concurrency, provider isolation, sanitisation, SSRF guards |
| AI changes | Validator cases, orchestration scenarios, abstention, injection corpus; fake LLM only in CI |
| Error/logging | Error-taxonomy mapping, redaction test |
| Any security requirement touched | Mapped SEC-ID → test/lint/check ([security §10](../docs/architecture/security.md)) |

No test may hit a real provider or LLM; no licensed data in fixtures; clock/ID/random injected; suite also run under a non-IST timezone.

---

## 15. Consistency review against the architecture documents

### 15.1 Alignment (no conflict found)
Layer and module rules, request pipeline order, closed error taxonomy, ownership classes, dual-mode worker, provider ports, licence gate, AI flow, abstention reasons, secret rules, and test requirements are consistent with the cited sections.

### 15.2 Tensions and ambiguities discovered (not silently resolved)

| # | Finding | Where | Handling here |
|---|---|---|---|
| T1 | **Domain purity vs Decimal library.** Overview §3.2 forbids Prisma imports in `domain/`; decisions D-010 says to use Prisma's bundled `Decimal.js`. | overview §3.2 vs decisions D-010 | Open **BD-03**; no financial `domain/` code until decided (§8.2) |
| T2 | **Audit actor FK ambiguous.** Data-model §4.8 says "no FK cascade" *or* "FK with `SET NULL` and retain `actorRef`". | data-model §4.8 | Not resolved; audit-write code waits on this data-model clarification. Needs approval |
| T3 | **Internal inconsistency on VWAP.** Overview §2.2 lists "ATR, ADX, VWAP" as stretch, while noting VWAP needs intraday data and is out of MVP. | overview §2.2 | Treated as **out of MVP**; recommend correcting the table |
| T4 | **Ledger concurrency unspecified.** The SELL ≤ BUY invariant is stated, but not how concurrent writes are serialised. | data-model §4.5 | Open **BD-05** (§7.4) |
| T5 | **Reclaim and attempts.** Overview/data-model say expired locks are reclaimed "exactly once" but not whether a reclaim consumes an attempt. | overview §5, data-model §4.7 | Open **BD-09** |
| T6 | **AI daily budget counting.** "Per-user daily budget" lacks a counting source and day-boundary timezone. | overview §6, security SEC-RATE-05 | Open **BD-16** |
| T7 | **Layout assumptions.** Planned `src/` layout and a separate `docs/architecture/` folder vs. the `doc/` folder requested for these two documents; the actual Next.js initialisation (use of `src/`, `app/` location) was not inspected. | overview §3.3 | Flagged for confirmation; links assume sibling folders |
| T8 | **UI components not placed in the planned layout.** | overview §3.3 vs design §6.2 | Proposal needs approval (UD-08) |
| T9 | **Decimal over the wire.** Security SEC-VAL-03 mandates string/Decimal input; no document says decimals are *output* as strings. | security vs (none) | Provisional: strings both ways (§2.4); needs approval |
| T10 | **Manual ingestion trigger** is admin-only (SEC-RATE-06) while request path must never call providers (D-006). | security vs decisions | Reconciled as **enqueue-only** (§9.2, §10.8); stated for approval |
| T11 | **Audit `action` CHECK list** forces a migration for each new action. | data-model §4.8 | Noted; consider text+CHECK vs. free text at implementation |

No contradiction required modifying any original document; all originals are preserved unchanged.

---

## 16. Dependency and decision register

### 16.1 Dependencies touched but **not approved** (nothing is installed by this task)

| Item | Why it came up | Status |
|---|---|---|
| Auth library | Authentication | Open (U-08/D-015) |
| `decimal.js` as a direct dependency | Decimal arithmetic in `domain/` | Open (BD-03) |
| Logging library | Structured logging | Open (BD-06) |
| Boundary-lint tool (`dependency-cruiser` / `eslint-plugin-boundaries`) | Module boundaries | Open (BD-07) |
| Queue library | Worker queue | Open (D-016/U-05); hand-rolled leaning |
| Rate-limit library / Redis | Rate limiting | Not planned; Postgres-backed adapter candidate (U-10) |
| Chart library | Charts | Open (UD-01) |
| Headless UI primitives / any component library (incl. shadcn/ui) | Dialog, combobox, tabs | **Not approved** (UD-05) |
| Icon library | Icons | Not approved (UD-06) |
| Class helpers (`clsx`, `tailwind-merge`, `cva`), Tailwind lint/format plugins | Styling ergonomics | Open (UD-07) |
| Test tooling, `fast-check`, Playwright, Testcontainers, axe | Testing | Candidates in testing-strategy; install requires approval |
| Secret scanner, dependency/licence scanners | CI | Open (security SEC-SEC-01/08) |

### 16.2 Open backend decisions

| ID | Decision | Interim rule |
|---|---|---|
| BD-01 | Allocation of work among Server Components, Server Actions and Route Handlers (§2.1) | Provisional allocation; pipeline mandatory regardless |
| BD-02 | Success/error envelope and `VALIDATION` HTTP status (400 vs 422) | §4 provisional |
| BD-03 | Decimal library / domain-purity (§8.2) | No financial domain code until decided |
| BD-05 | Ledger concurrency control (§7.4) | Leaning: lock `Portfolio` row; do not implement ledger writes yet |
| BD-06 | Logger implementation | Minimal in-house wrapper |
| BD-07 | Boundary-enforcement tool | Small repository script |
| BD-08 | Idempotency key semantics beyond `Transaction.clientRequestId` | §9.4 proposal |
| BD-09 | Worker numeric parameters: poll interval, batch size, concurrency, backoff, max attempts, visibility timeout, reject-ratio threshold, reclaim-attempt accounting | Configuration; values set in Phase 2 |
| BD-10 | Worker → web cache invalidation mechanism | Time-based `revalidate` only |
| BD-11 | Node.js runtime for all Prisma code | Interim rule |
| BD-12 | Prisma connection pooling/limits (depends on U-09) | Explicit limits; direct URL for migrations |
| BD-14 | API path prefix/versioning | Unversioned `/api/...` |
| BD-15 | Request-id handling for incoming headers | Server-generated; incoming recorded separately |
| BD-16 | AI daily-budget counting source and day-boundary timezone | Decide with U-10 |

### 16.3 Open items inherited from the architecture set (still open, still unresolved)
U-01 market-data source · U-02 news/disclosure sources · U-03 LLM provider · U-04 adjusted prices/corporate actions · U-05 queue implementation · U-06 sector source · U-07 holiday calendar/cadence · U-08 auth library · U-09 hosting · U-10 rate-limit storage · U-11 cost-basis method · U-12 retention/deletion/export · U-13 legal review · U-14 audit append-only enforcement · rounding mode · uncited-text policy · evidence thresholds · numeric tolerance · FTS language configuration.

### 16.4 Approval log
| Date | Item | Approved by | Notes |
|---|---|---|---|
| — | No new frameworks/dependencies/APIs/DB decisions without documentation and approval | Project owner | Stated in task instructions |
