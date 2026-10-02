# MarketMind AI -- Security Requirements (Phase 1.1)

Related: [overview.md](./overview.md) · [data-model.md](./data-model.md) · [testing-strategy.md](./testing-strategy.md)

Status: **Phase 1.1 -- Requirements finalised for implementation approval**. Each requirement has an ID so tests and reviews can reference it. Keywords: MUST / SHOULD / MAY.
Tags: **[Assumption]** unverified · **[Accepted]** closed in Phase 1.1 review.

---

## 1. Scope, assets and threats

### 1.1 Assets
| Asset | Why it matters |
|---|---|
| User accounts and sessions | Account takeover exposes portfolio data |
| Portfolio/transaction and watchlist data | Personal financial information |
| AI query history | May reveal financial interests |
| Provider API keys, LLM keys, DB credentials, auth secrets, AUDIT_PSEUDONYM_KEY | Cost abuse, data exposure, licence breach, pseudonym reversibility |
| Ingested data integrity | Wrong prices/news mislead users |
| Service availability and quotas (LLM, provider, DB) | Free-tier exhaustion is a denial-of-service vector |

### 1.2 Principal threats
1. Broken access control (IDOR) -- reading/modifying another user's portfolio, watchlists, AI history.
2. Injection -- SQL (mitigated by Prisma; raw SQL is the exception), XSS (stored via news text/notes), prompt injection via ingested content.
3. SSRF and abuse of the worker's outbound fetching.
4. Credential stuffing/brute force; session theft.
5. Cost/quota abuse (LLM, ingestion endpoints).
6. Secret leakage via repository, logs, client bundles, error messages.
7. Supply-chain compromise of dependencies.
8. Poisoned or malformed provider data.
9. Regulatory exposure: model output interpreted as personalised advice.

### 1.3 Out of scope for MVP
Payment data, brokerage credentials/trading, KYC documents, PII beyond email/name. MUST NOT collect these; introducing them requires a new security review.

---

## 2. Authentication and session management

| ID | Requirement |
|---|---|
| SEC-AUTH-01 | MUST use an established, actively maintained authentication library (selection pending, U-08); MUST NOT implement custom cryptography, password hashing or session token generation. |
| SEC-AUTH-02 | Sessions MUST use cookies with `HttpOnly`, `Secure` (production), and an appropriate `SameSite` attribute; session lifetime and idle timeout MUST be defined; sign-out MUST invalidate the server-side session. |
| SEC-AUTH-03 | If passwords are used: MUST use the library's recommended memory-hard hash; enforce a minimum length and a breached-password or common-password check **[validate feasibility without paid services -- see open items section 11]**; MUST NOT impose arbitrary composition rules that reduce usability. |
| SEC-AUTH-04 | Login, sign-up, password-reset and verification endpoints MUST be rate limited (per IP and per account identifier) and MUST return uniform responses that do not reveal whether an account exists. |
| SEC-AUTH-05 | Email verification SHOULD be required before access to portfolio/AI features if email/password sign-up is used. |
| SEC-AUTH-06 | **[Accepted: CSRF clarified]** CSRF protection applies differently per request type: (a) **Server Actions** -- Next.js App Router performs origin checking by default; no additional token required **[Assumption: verify on the installed Next.js version]**. (b) **Route Handlers (state-changing)** -- MUST use the auth library's CSRF token mechanism or be migrated to a Server Action; the CSRF mechanism for each state-changing Route Handler MUST be documented and tested in Phase 2. A test that submits a state-changing Route Handler without a valid origin/CSRF token MUST return rejection. |
| SEC-AUTH-07 | The `ADMIN` role MUST be assigned out-of-band (seed/CLI), never through a public endpoint. Admin routes MUST be separately guarded and audited. |
| SEC-AUTH-08 | Disabled users (`disabledAt` set) MUST be rejected at session resolution on every request. |

## 3. Authorisation and user-data isolation

| ID | Requirement |
|---|---|
| SEC-AUTHZ-01 | Authorisation MUST be enforced **server-side** in the service layer for every operation. UI hiding is never a control. |
| SEC-AUTHZ-02 | Deny by default: any route, Server Action or API handler without an explicit authentication/authorisation declaration MUST fail a CI check (e.g. a wrapper such as `withAuth()` required by lint/test that enumerates routes). |
| SEC-AUTHZ-03 | Repositories for user-owned data MUST require `userId` as a non-optional parameter, and queries MUST filter by it (or by a verified parent ownership join). Direct Prisma access from route handlers/components MUST be prohibited by lint rule. |
| SEC-AUTHZ-04 | Resource identifiers received from clients (watchlist id, portfolio id, transaction id, AI query id) MUST be re-verified against the caller's ownership before use. A non-owned resource MUST return `NOT_FOUND` (not `FORBIDDEN`) to avoid confirming existence. |
| SEC-AUTHZ-05 | Child resources MUST NOT be accessible by ID alone: transaction operations verify the parent portfolio's owner; watchlist-item operations verify the watchlist's owner. |
| SEC-AUTHZ-06 | **[Accepted: DM-04]** `Transaction.userId` is a **required** column. A composite FK `(portfolioId, userId) -> Portfolio (id, userId)` prevents a transaction from referencing a portfolio owned by a different user even through a bug. This is a required control, not a recommendation. |
| SEC-AUTHZ-07 | Responses MUST be explicit DTOs; ORM entities MUST NOT be serialised directly (prevents leaking columns such as hashes or internal flags). |
| SEC-AUTHZ-08 | Shared data subject to `licenseRestriction` MUST be filtered server-side according to that restriction (e.g. `LINK_ONLY` never returns stored text). |
| SEC-AUTHZ-09 | The worker MUST connect with credentials appropriate to its function. It MUST NOT be reachable via any public HTTP route. Any internal endpoint (e.g. a future cache revalidation endpoint) MUST require a secret and be rate limited. |
| SEC-AUTHZ-10 | Row-Level Security is NOT part of MVP (D-013). If adopted later, the authorisation test matrix MUST pass unchanged. |

## 4. Input validation and output handling

| ID | Requirement |
|---|---|
| SEC-VAL-01 | Every external input (HTTP body/query/params, Server Action arguments, environment variables, provider responses, LLM output, CSV uploads if added) MUST be parsed with a Zod schema using strict object parsing (unknown keys rejected or stripped by explicit policy). |
| SEC-VAL-02 | All schemas MUST bound sizes: string lengths, array lengths, numeric ranges, decimal precision/scale, date ranges (e.g. no future trade dates; no dates before a sane lower bound). |
| SEC-VAL-03 | Money/quantity inputs MUST be accepted as strings or validated decimals and parsed to Decimal; MUST NOT pass through JavaScript `number` arithmetic. |
| SEC-VAL-04 | Database access MUST use Prisma's parameterised API. Raw SQL (`$queryRaw`) MUST use tagged-template parameters; `$queryRawUnsafe`/`$executeRawUnsafe` MUST NOT be used with any user-influenced string (lint rule). |
| SEC-VAL-05 | User-supplied free text (notes, watchlist names, AI questions) MUST be rendered as escaped text. Use of `dangerouslySetInnerHTML` MUST be banned by lint, with exceptions only via a sanitiser reviewed in code review. |
| SEC-VAL-06 | A Content-Security-Policy, `X-Content-Type-Options`, `Referrer-Policy`, `Frame-Options`/`frame-ancestors`, and HSTS (production) SHOULD be configured; the CSP SHOULD avoid `unsafe-inline` where the framework allows (verify nonce support on the installed version **[Assumption]**). |
| SEC-VAL-06b | CORS MUST be closed by default (same-origin); no wildcard origins for authenticated endpoints. |
| SEC-VAL-07 | Pagination parameters MUST have enforced maximums to prevent unbounded queries. |
| SEC-VAL-08 | Errors returned to clients MUST come from the closed taxonomy; stack traces, SQL, provider payloads and file paths MUST NOT be exposed. |

## 5. Rate limiting and abuse control

| ID | Requirement |
|---|---|
| SEC-RATE-01 | Rate limits MUST exist by route class: authentication (strict), AI (strict, plus a per-user daily budget), writes (moderate), reads (generous). **[Accepted: TV-03 partially]** Exact values are configuration constants defined before Phase 2 integration tests are written. A testable baseline MUST exist before the rate limiter is considered done. Recommended starting values (all **[Provisional]**, to be refined after load observation): auth login = 5 attempts per 15 minutes per IP; AI queries = 20 per user per day, 3 per minute per user; writes = 60 per minute per user; reads = 300 per minute per user. |
| SEC-RATE-02 | Keys MUST combine user id (when authenticated) and IP; when behind a proxy, the trusted-proxy header handling MUST be explicit so clients cannot spoof their IP **[Assumption: depends on host]**. |
| SEC-RATE-03 | Responses MUST be `429` with `Retry-After`; limit hits MUST be audit-logged (aggregated, not per-request flood). |
| SEC-RATE-04 | **[Accepted: DR-07]** Storage for rate-limit counters MUST be PostgreSQL (`RateLimitBucket` table). In-memory storage is not permitted (invalid on multi-instance/serverless hosting). |
| SEC-RATE-05 | AI endpoints MUST cap input length, evidence size, output tokens and concurrent requests per user, and enforce a global daily ceiling aligned with provider quota so one user cannot exhaust it. |
| SEC-RATE-06 | Heavy operations (backfill, manual ingestion trigger) MUST be admin-only. |

## 6. Secrets management

| ID | Requirement |
|---|---|
| SEC-SEC-01 | Secrets MUST NOT be committed. `.env*` files (except `.env.example` with placeholder values) MUST be git-ignored; a secret-scanning tool or hook SHOULD run in CI and pre-commit (select a free tool; validate -- see open items section 11). |
| SEC-SEC-02 | Secrets MUST be provided via the hosting platform's environment/secret store; each environment (dev/CI/prod) MUST have distinct credentials. |
| SEC-SEC-03 | Environment variables MUST be validated at startup with Zod; the process MUST fail fast on missing/invalid values. Server-only secrets MUST NEVER use the client-exposed prefix (`NEXT_PUBLIC_`) and MUST be imported only in server modules. |
| SEC-SEC-04 | Provider API keys MUST be scoped to least privilege where the provider supports it, and rotatable without code change. |
| SEC-SEC-05 | Logs, audit metadata, error reports and test snapshots MUST NOT contain secrets, tokens, session identifiers, full prompts containing secrets, or authorization headers. |
| SEC-SEC-06 | A documented rotation procedure and an incident step ("revoke, rotate, review audit log") MUST exist before any public launch. |
| SEC-SEC-07 | CI MUST use per-run, minimal-scope tokens; third-party actions/plugins SHOULD be pinned by version or hash. |
| SEC-SEC-08 | Dependencies: lockfile committed; automated dependency-vulnerability scanning (free tooling -- validate) SHOULD run in CI; licence scan MUST run (decisions section 5.1). |
| SEC-SEC-09 | `AUDIT_PSEUDONYM_KEY` is a dedicated secret used only for AuditLog pseudonym computation (HMAC-SHA256). It MUST be stored separately from other application secrets. Key rotation procedure MUST be documented before launch, including the implication that rotating the key breaks cross-period pseudonym correlation (see data-model.md section 4.9). |

## 7. Audit logging

| ID | Requirement |
|---|---|
| SEC-AUD-01 | The following MUST be audit-logged: sign-in success/failure, sign-out, password/email change, account disable/delete, every create/update/delete of portfolio/transaction/watchlist data, AI queries (metadata only), admin actions (re-queue, backfill, source enable/disable), authorisation denials, rate-limit trips (aggregated), ingestion run outcomes. |
| SEC-AUD-02 | Each entry MUST contain: time, actorType, actorPseudonym (keyed HMAC-SHA256 of userId -- [Accepted: DM-06]), action, entity type/id, outcome, request id. IP MUST be stored only as a salted hash (ipHash). |
| SEC-AUD-03 | Audit metadata MUST be an allow-listed set of keys per action; MUST NOT hold secrets, raw prompts/answers, or full financial details beyond what an investigation requires. |
| SEC-AUD-04 | The audit log MUST be append-only by application contract; SHOULD be enforced by DB privileges if available (U-14). Audit writes for mutations MUST be in the same transaction as the mutation, so a change cannot occur without a record. |
| SEC-AUD-05 | Audit failure policy: mutation endpoints MUST fail closed (no mutation without audit). Read-path audit failure MAY degrade with an alert-level log. |
| SEC-AUD-06 | A retention period and user-deletion behaviour MUST be defined (U-12). Audit rows survive user deletion; the actorPseudonym is privacy-preserving without key access. Key destruction implications on retention are documented in data-model.md section 4.9 and deferred to U-12. |

## 8. Safe handling of external content (news, disclosures, provider data)

External content is **untrusted input** at every stage.

### 8.1 Ingestion (worker)
| ID | Requirement |
|---|---|
| SEC-EXT-01 | Outbound requests MUST go through a single hardened HTTP client: allow-listed hostnames per DataSource, HTTPS only, DNS resolution checked against private/loopback/link-local/metadata ranges after resolution and on every redirect (SSRF defence), redirect cap, connect/read timeouts, response-size cap, content-type allow-list. |
| SEC-EXT-02 | Fetch URLs MUST come from provider responses only after validation against the allow-list; the system MUST NOT fetch URLs supplied by end users. |
| SEC-EXT-03 | HTML MUST be converted to plain text with a parser/sanitiser; scripts, styles, iframes, forms and event attributes removed; Unicode normalised; control/zero-width characters stripped; length capped. Raw HTML MUST NOT be stored or rendered. |
| SEC-EXT-04 | The worker MUST honour each source's licenseRestriction and robots.txt/terms; scraping requires explicit prior review. |
| SEC-EXT-05 | Provider payloads MUST be Zod-validated; structural surprises MUST fail the run rather than write partial garbage; reject ratios MUST be monitored. |
| SEC-EXT-06 | Dedupe by content hash to limit repeated injection payloads and storage waste. |

### 8.2 Display
| ID | Requirement |
|---|---|
| SEC-EXT-07 | Document titles/snippets/text MUST be rendered as escaped text. Outbound links MUST use `rel="noopener noreferrer"`, show the destination domain, and only allow http(s) schemes. |
| SEC-EXT-08 | No remote images/embeds from external content in MVP (tracking and content-injection risk). |

### 8.3 AI and prompt injection
| ID | Requirement |
|---|---|
| SEC-AI-01 | Retrieved text MUST be placed in clearly delimited data blocks, with a system instruction that it is untrusted content and must never be followed as instructions. This reduces but does not eliminate injection; other controls below are mandatory. |
| SEC-AI-02 | The model MUST be given **no tools, function calling, network access, or access to user portfolio data** in MVP. A successful injection can then affect only the text of one answer. |
| SEC-AI-03 | Model output MUST be validated structurally (Zod), citations MUST pass deterministic validation (overview.md section 6), and any URL in output MUST be present in the evidence set. |
| SEC-AI-04 | Output MUST be rendered as escaped text/markdown subset with no raw HTML, no auto-loading images. |
| SEC-AI-05 | Prompts MUST NOT contain secrets, other users' data, or system configuration beyond what is needed. System prompts MUST be treated as not confidential (assume extractable). |
| SEC-AI-06 | **[Accepted: TV-04]** Requests seeking buy/sell/hold recommendations, price targets or predictions MUST be intercepted by the **keyword/regex policy gate** (deterministic, before retrieval or LLM call) and result in ABSTAIN(UNSUPPORTED_REQUEST). The gate is a required first-layer control, not a complete guarantee; output also checked by the citation validator's deny-list check (check 7). The deny-list categories and test corpus MUST be documented and version-controlled. |
| SEC-AI-07 | Every answer MUST display as-of dates for evidence and a standing disclaimer ("educational information, not investment advice"); exact wording subject to legal review (U-13). |
| SEC-AI-08 | Evidence with licenseRestriction = LINK_ONLY MUST never be sent to the LLM, and sources whose terms disallow AI processing (allowsAiProcessing = false) MUST be excluded from retrieval. |
| SEC-AI-09 | An adversarial test corpus (starter set of 10+ injection/advice-bypass strings) MUST be part of the automated suite. The corpus grows as new bypass patterns are discovered. |

## 9. Infrastructure and operational security

| ID | Requirement |
|---|---|
| SEC-OPS-01 | Database MUST be reachable only over TLS; separate DB credentials for web and worker where the host allows (least privilege). |
| SEC-OPS-02 | Production error output MUST be generic; detailed errors go to logs with request id. |
| SEC-OPS-03 | A `/health` endpoint MUST NOT expose versions, secrets or dependency detail publicly. |
| SEC-OPS-04 | Backups MUST exist and a restore MUST be rehearsed before launch (R-18). |
| SEC-OPS-05 | A short incident-response checklist (revoke sessions, rotate secrets, disable ingestion, preserve logs) SHOULD be written before launch. |
| SEC-OPS-06 | Privacy: collect only email/name; publish a minimal privacy notice; support account deletion and data export (design in Phase 2; U-12). Applicable Indian data-protection obligations require legal review before public launch **[Assumption: not assessed here]**. |

## 10. Verification mapping

Every requirement above is verified by at least one of: automated test (see testing-strategy.md), lint/CI rule, or documented manual review checklist before launch. Phase 2 creates a traceability table `SEC-ID -> test/lint/check`. Requirements without a verification mechanism are not accepted as done.

**Rate limit baseline -- [Accepted: TV-03 partially resolved]:** Rate-limit constants are defined as configuration before integration tests are written. The provisional values in SEC-RATE-01 are the testable baseline; integration tests assert that the rate limiter trips at the configured threshold, Retry-After is present, and (where Postgres-backed) counters accumulate correctly across simulated multiple instances.

## 11. Open security decisions

| ID | Question |
|---|---|
| U-08 | Authentication library and sign-in methods; CSRF behaviour for Route Handlers must be verified for the chosen library |
| U-12 | Retention, deletion and export; AuditLog pseudonym key destruction implications |
| U-13 | Legal review of disclaimers and advice boundary |
| U-14 | DB-level append-only audit enforcement via restricted role |
| -- | Breached-password check without paid services (candidates: hibp-downloader self-hosted, zxcvbn strength-only, or accept none for MVP) |
| -- | Free secret-scanning and dependency-audit tooling choice (candidates: gitleaks, trufflehog, GitHub secret scanning, npm audit) |
| -- | AUDIT_PSEUDONYM_KEY rotation schedule and operational procedure (define before launch) |
