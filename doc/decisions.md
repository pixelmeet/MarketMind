# MarketMind AI -- Architecture Decisions, Cost Evaluation and Risks (Phase 1.1)

Related: [overview.md](./overview.md) · [data-model.md](./data-model.md) · [security.md](./security.md) · [testing-strategy.md](./testing-strategy.md)

Tags: **[Fact]** stated in the brief · **[Assumption]** unverified · **[Recommendation]** proposed here · **[Accepted]** closed in Phase 1.1 · **[Provisional]** placeholder requiring validation.

Status values: `Accepted` · `Open` (needs validation or a choice) · `Provisional` (placeholder, validation required).

---

## 1. Decision records

### D-001 -- Modular monolith with a separately runnable worker · Accepted
- **Context.** Solo developer, 10-12 weeks, Rs.0 infrastructure.
- **Decision.** One Next.js codebase organised into domain modules with enforced boundaries, plus a worker entrypoint from the same codebase.
- **Why.** One deployable unit, one test setup, no network boundaries between modules, no distributed-transaction problems.
- **Consequences.** Module discipline enforced by tooling. Extraction to services later is possible through public APIs.
- **Supersedes** the microservices/multi-store direction for the MVP only.

### D-002 -- PostgreSQL is the only datastore · Accepted
- **Decision.** PostgreSQL stores domain data, the job queue, full-text search, audit logs and rate-limit counters.
- **Why.** Every extra store is another thing to host, secure, back up and test. Scale is small **[Assumption -- validate with data-volume estimate once sources are known]**.
- **Revisit when.** A measured query or retrieval requirement fails on Postgres (see section 4 Deferred infrastructure).

### D-003 -- Prisma ORM with SQL escape hatch · Accepted
- **Decision.** Prisma for schema, migrations and typed queries. Hand-written SQL for features Prisma cannot express (partial unique indexes, GIN/tsvector, CHECK constraints, SKIP LOCKED queue claim via $queryRaw).
- **Note.** Prisma DateTime defaults to timestamp without time zone on PostgreSQL -- use @db.Timestamptz explicitly **[Assumption: verify against installed Prisma version]**.
- **Consequence.** Raw SQL parts need their own integration tests.

### D-004 -- Zod at every trust boundary · Accepted
- **Decision.** Zod schemas validate: HTTP/Server Action input, environment variables at startup, provider responses in adapters, and LLM structured output.
- **Why.** Provider data and LLM output are both untrusted; one validation tool for all keeps behaviour consistent.

### D-005 -- Provider ports and adapters · Accepted
- **Decision.** Define ports: MarketDataProvider, NewsProvider/DisclosureProvider, LlmProvider. Adapters translate provider shapes to canonical types.
- **Why.** Providers, terms and prices will change; the MVP viability hinges on swapping them cheaply.
- **Consequence.** Port design must be driven by at least two real provider shapes before it is frozen.

### D-006 -- Users never trigger live market-data calls · Accepted
- **Decision.** The request path reads only from PostgreSQL. Only the worker calls market-data/news providers.
- **Why.** Isolates users from provider outages, rate limits and per-call licence constraints.
- **Trade-off.** Data is only as fresh as the ingestion schedule; the UI must show as-of times.

### D-007 -- Daily bars only in MVP · Accepted
- **Decision.** Store daily OHLCV; no intraday.
- **Why.** Intraday data is where licensing cost and volume concentrate.

### D-008 -- Retrieval: PostgreSQL FTS first; pgvector deferred · Accepted
- **Decision.** Chunk documents; index with tsvector (GIN). Retrieval = FTS + metadata filters + structured facts. No separate vector database.
- **Why.** Corpus is small and instrument-scoped; lexical retrieval with strong filters is predictable and testable. A vector index adds an embedding-provider dependency without a demonstrated need.
- **Revisit when.** Retrieval evaluation set (testing-strategy section 6.4) shows FTS recall below an agreed bar. First option: pgvector extension in the same database **[Assumption: availability depends on chosen Postgres host]**.
- **FTS language config open detail.** The `english` configuration stems aggressively; `simple` may be safer for tickers/names. Decide with test data during Week 7-8.

### D-009 -- Grounding contract for AI answers · Accepted
- **Decision.** The model returns structured JSON: claims[], each with text and evidenceIds[]. Deterministic code validates (schema, IDs in retrieved set, verbatim quotes, numeric claims vs computed values). Failure -> bounded retries -> abstain.
- **Abstention is a first-class outcome** with enumerated reasons: UNSUPPORTED_REQUEST, INSUFFICIENT_EVIDENCE, CITATION_VALIDATION_FAILED, UPSTREAM_UNAVAILABLE.
- **Why.** "Cited" output that cannot be machine-verified is decoration. Verification must not depend on another LLM.
- **Known limit.** Code can verify that a claim cites existing text and quotes it faithfully; it cannot fully verify that the claim is a correct reading of that text. Residual risk accepted and mitigated by narrow claims, quote display, and eval sets.

### D-010 -- Money, quantity and percentage handling · Accepted
- **Decision.** Database: NUMERIC columns (never float). Application: Decimal.js throughout domain/; convert to JS number only at the presentation edge (charts). Rounding rules explicit, centralised and tested.
- **Note.** Indicators over price series may use floats internally if documented and golden-tested to a stated tolerance; money/portfolio maths may not.

### D-011 -- Portfolio holdings derived from a transaction ledger · Accepted
- **Decision.** Store BUY/SELL transactions only; compute holdings and cost basis on read.
- **Why.** Single source of truth; no drift between "holdings" and "transactions".
- **Trade-off.** Recompute cost per read; fine at personal-portfolio scale.

### D-012 -- Caching without Redis · Accepted
- **Decision.** PostgreSQL as source of truth; Next.js time-based revalidation for public data; in-process memoisation for indicators; no shared cache service.
- **Resolved (C-01):** Cache invalidation after ingestion uses time-based `revalidate` in MVP (e.g. revalidate=3600). Accepted staleness trade-off: data may lag ingestion by the revalidation period. Tag-based revalidation from the worker is deferred to a later phase.

### D-013 -- Authorisation lives in the service layer, scoped repositories · Accepted
- **Decision.** Every user-owned query takes `userId`. Route handlers/Server Actions never query Prisma directly. Optional PostgreSQL Row-Level Security is **not** in MVP (complexity vs. Prisma pooling/session variables); revisit after authorisation test matrix exists.

### D-014 -- Provider registry with licence gate · Accepted
- **Decision.** DataSource rows carry licenseNote, licenseReviewedAt, and per-document licenseRestriction (FULL_TEXT, SNIPPET_ONLY, LINK_ONLY). Ingestion and AI retrieval honour the restriction.
- **Why.** Licensing is the largest hidden risk to the Rs.0 goal. Making it a data-model concept forces the question to be answered per source.

### D-015 -- Authentication library · Open (U-08)
- **Requirements.** Maintained, App Router compatible, secure session cookies, CSRF protection (verified per request type -- see overview.md section 4), Prisma adapter or equivalent, email+password or OAuth, rate-limit hooks, no custom crypto.
- **Phase 1.2 ecosystem update (2026-10-02).** Auth.js (NextAuth) has merged into Better Auth (announced September 22, 2025; source: https://better-auth.com/blog/authjs-joins-better-auth). Auth.js now receives security patches only; the Auth.js maintainers explicitly recommend new projects use Better Auth. The two candidates are no longer independent -- Better Auth is the forward path.
- **Phase 1.2 findings -- Better Auth.**
  - Latest stable version: **1.7.7** (verified in sidebar at https://www.better-auth.com/docs/adapters/prisma, 2026-10-02).
  - First-party Prisma adapter: `@better-auth/prisma-adapter`; documents Prisma 7 + PostgreSQL support.
  - Prisma 6 and earlier also supported (driver adapter optional).
  - Schema generation via `npx auth@latest generate`; migration via `npx prisma migrate dev`.
  - App Router: explicitly documented target.
  - Query joins: supported since v1.4.0.
  - CSRF for Server Actions: Next.js App Router origin-checking handles this at the framework level.
  - CSRF for Route Handlers: **NOT confirmed** -- the dedicated CSRF docs page returned 404 during this session. This must be verified by reading the source or retrying docs before the identity module is committed.
  - Session cookie flags (httpOnly, Secure, SameSite): **NOT confirmed in this pass** -- defer to implementation test.
- **Phase 1.2 recommendation:** Use Better Auth. Cannot close U-08 until Route Handler CSRF behaviour is demonstrated by a minimal implementation test.
- **Decision owner/time.** Before Phase 2 starts; CSRF verification part of Week 1 identity skeleton test.

### D-016 -- Queue implementation · Accepted (leaning; confirm in Phase 2)
- **Leaning.** Hand-rolled IngestionJob table with SKIP LOCKED claim (approx 100-200 lines, fully understood, testable), because the job semantics needed (dedupe key, FIFO, lockExpiresAt reclaim) are domain-specific and small.
- **Alternative.** A Postgres-backed queue library -- validate maintenance, Prisma compatibility, pooler compatibility before committing.
- **Confirm.** Final choice made at repository bootstrap in Week 1.

### D-016a -- Worker scheduling mode · Accepted
- **Context.** Whether to build a long-running poll loop or a drain-and-exit mode first.
- **Decision.** Build **drain-and-exit mode only** for MVP. An external scheduler (cron, CI schedule, or hosting platform scheduler) invokes the worker on a defined interval. A long-running polling loop is added only after U-09 (hosting) confirms that an always-on background process is available.
- **Why.** Drain-and-exit is simpler, testable without concurrency, and works under any hosting model. Building the loop before the hosting decision is confirmed adds complexity that may never be exercised.
- **Trade-off.** Minimum schedule interval on free CI/cron is typically 1 minute; nightly price ingestion is fine; near-real-time news ingestion is not possible. Acceptable for an MVP with daily-bar data.

### D-017 -- Hosting model · Open (U-09)
- See section 3. Least-determined decision with highest cost impact.

### D-018 -- Rate-limit storage · Accepted
- **Decision.** Store rate-limit counters in PostgreSQL RateLimitBucket table.
- **Why.** Works under any hosting model (serverless, multi-instance, single-instance). In-memory counters are invalid on multi-instance/serverless hosting (no shared state). No additional service required.
- **Revisit when.** Measured write latency on auth endpoints becomes a problem, or multi-instance rate limiting becomes unmanageable.

---

## 2. Accepted decisions register

### Phase 1.1 review

The following decisions were accepted during the Phase 1.1 review. Each is implemented in the architecture documents. All are internal design choices requiring no external evidence.

| Decision ID | Description | Accepted in | Blocks impl? |
|---|---|---|---|
| DR-08 | Cost-basis method: weighted-average cost for MVP. FIFO deferred to later phase. | Phase 1.1 | No (resolves before Week 6) |
| DR-09 | Uncited AI text: reject the entire answer (not strip). Simpler, safer, forces full citation through prompt design. | Phase 1.1 | Yes (must be in place before citation validator is built) |
| DR-10 | UUID strategy: UUIDv4 for MVP. At expected data volumes, index fragmentation is not measurable. UUIDv7 noted as future option. | Phase 1.1 | No (low, but must be set before schema creation) |
| DR-06 / D-016a | Worker mode: drain-and-exit first. Long-running loop only after U-09 hosting is confirmed. | Phase 1.1 | Medium |
| DR-07 / D-018 | Rate-limit storage: PostgreSQL RateLimitBucket. Not in-memory. | Phase 1.1 | Medium (depends on U-09 but Postgres is correct in all cases) |
| DM-01 | Add lockExpiresAt to IngestionJob. Reclaim query documented. | Phase 1.1 | Yes (must be in first ingestion migration) |
| DM-02 | DataFreshness.state is a worker-written cache only. Authoritative fields: lastSuccessAt, lastDataDate, consecutiveFailures. Recomputation rules documented. | Phase 1.1 | No |
| DM-03 | Abstained and failed AiQuery rows have no AiAnswer row. AiQuery.status is the authoritative outcome. | Phase 1.1 | Yes (must be in AI module design before implementation) |
| DM-04 | Transaction.userId is a required column (not optional recommendation). Composite FK enforces ownership. Must be implemented in Week 6 portfolio migration. | Phase 1.1 | Yes (must be before Week 6 migration) |
| DM-05 | Document versioning: re-fetch with changed contentHash creates a new Document row (status=ACTIVE); old row set to status=REMOVED with supersededById pointing to new row. Old chunks retained (read-only). AiCitation rows remain valid. | Phase 1.1 | No |
| DM-06 | AuditLog user reference: keyed HMAC-SHA256 pseudonym using AUDIT_PSEUDONYM_KEY secret. No FK to User. Key rotation implications documented. | Phase 1.1 | No (implement before Week 7-8 research/audit migration) |
| DM-07 | IngestionRun -> PriceBar lineage: optional FK, ON DELETE SET NULL. Bars retained when run records are purged. | Phase 1.1 | No |
| C-01 | Cache invalidation: time-based revalidate for MVP. Worker does not call internal endpoint. Accepted staleness trade-off documented. | Phase 1.1 | No |
| TV-02 | Abnormal price movement: +-75% single-day move triggers a warning (not auto-rejection). Threshold is Provisional; must be validated against historical data. | Phase 1.1 | No |
| TV-04 | Advice classifier: deterministic keyword/regex deny-list (not LLM-based). Not a complete safety guarantee; documented limitation. Second-layer defence in citation validator. | Phase 1.1 | Yes (must be designed before AI module) |
| TV-07 / DR-09 | Uncited text in AI output: reject the whole answer. (Same as DR-09 above.) | Phase 1.1 | Yes |
| SIMPL-01 | Boundary lint (dependency-cruiser) deferred to Phase 2 after module structure stabilises. TypeScript path aliases used in the interim. | Phase 1.1 | No |
| SIMPL-02 | Queue ordering: FIFO (ORDER BY runAfter ASC) for MVP. Per-source fairness deferred; add priority column only if starvation is observed. | Phase 1.1 | No |
| SIMPL-06 | DocumentChunk.tsv: managed via hand-written SQL migration; all FTS queries use $queryRaw; query locations documented centrally. Trigger vs application-side approach decided in Week 7-8. | Phase 1.1 | No |
| Quote-at-write | AiCitation.quote populated at citation-write time; never null for CHUNK evidence. | Phase 1.1 | Yes (must be in AI module) |
| CSRF-clarification | Server Actions: origin checking built-in. Route Handlers: require explicit CSRF mechanism per endpoint; document each during Phase 2. | Phase 1.1 | Yes (document during auth skeleton Week 1) |

---

## 3. Open decisions requiring external verification

| Decision ID | What must be verified | Where to look | Blocks impl? |
|---|---|---|---|
| DR-01 (U-01) | Market-data source: terms permitting storage + display + commercial + AI use at Rs.0 | Each provider official ToS page (record URL + date read) | **Yes -- hard gate** |
| DR-02 (U-02) | News/disclosure source: same for text storage and AI processing rights | Same method | **Yes -- hard gate for AI module** |
| DR-03 (U-09) | Hosting: free-tier limits for web (commercial use, bandwidth), worker (always-on vs cron, schedule interval), Postgres (storage, connections, sleep behaviour, extensions pgvector/pg_trgm, restricted role capability, backups) | Each platform official pricing/limits page | **Yes** |
| DR-04 (U-08) | Auth library: current maintenance status, App Router + Prisma version compatibility, CSRF behaviour for Route Handlers, session cookie flags | Library repository, release history, official docs | **Yes -- before Phase 2** |
| DR-05 (U-03) | LLM provider: commercial use on free tier, data-retention terms, structured JSON output reliability, context window size, daily quota | Provider API ToS and docs | Yes for AI milestone |
| U-04 | Adjusted versus raw prices and corporate-action data source: whether source provides split/bonus adjusted series or raw OHLCV with corporate actions | Candidate market-data provider specs / corporate-action feeds (resolved with U-01) | Medium |
| U-05 | PostgreSQL queue implementation versus a queue library: evaluate maintenance, Prisma compatibility, pooler compatibility (leaning hand-rolled SKIP LOCKED, D-016) | Queue library docs/benchmarks vs hand-rolled IngestionJob (confirm at Week 1 bootstrap) | Medium |
| U-06 | Sector/industry classification source: availability of free, reliable sector/industry mapping; otherwise drop sector allocation | Exchange instrument master / public classification datasets | Low |
| U-07 | Exchange holiday calendar: source, licence, IST market close time confirmation, freshness threshold values | NSE/BSE official holiday calendar pages | Medium |
| U-11 | Corporate actions and their effect on portfolio quantities: treatment of splits/bonuses on ledger quantities and whether they auto-adjust Transaction records | Portfolio accounting rules and corporate-action event design (resolve before Week 6 portfolio migration) | Medium |
| U-12 | Data retention, deletion, and export: retention policies for IngestionRuns, RateLimitBucket, removed documents, and AI queries; user account deletion and export flows; AuditLog pseudonym key destruction implications | Storage budget under free tier (U-09), privacy obligations, and system operational requirements | Medium |
| U-13 | Legal review of "educational, not advice" framing and Indian data-protection obligations | Legal counsel; SEBI guidelines | Medium -- before public launch |
| U-14 | DB-level append-only audit enforcement via restricted role | Confirmed after DR-03: check whether chosen Postgres host allows GRANT INSERT, SELECT on specific tables | Low |
| TV-02 provisional | Abnormal price movement +-75% threshold: validate against NSE/BSE historical data including corporate actions | Historical OHLCV data (once U-01 source is available) | Low (threshold is informational only until validated) |
| SEC-AUTH-03 | Breached-password check without paid services | Evaluate hibp-downloader (self-hosted HIBP list), zxcvbn strength-only, or accept no breach check for MVP | Low |
| SEC-SEC-01 | Free secret-scanning and dependency-audit tooling | gitleaks, trufflehog, GitHub secret scanning, npm audit -- verify CI minutes impact | Low |

---

## 4. Rejected / deferred infrastructure

| Candidate | Status | Justification | Revisit trigger |
|---|---|---|---|
| Microservices | Rejected for MVP | One developer; no independent scaling or team boundaries; adds deployment and consistency cost | Independent scaling need or a second team |
| Graph database | Deferred | No MVP feature needs multi-hop relationship queries | A concrete feature requiring graph traversal that SQL cannot express acceptably |
| Dedicated vector database | Deferred | See D-008; corpus is small and instrument-scoped | Retrieval eval fails and pgvector is insufficient or unavailable |
| Redis / external cache | Deferred | Postgres + Next caching suffices at expected scale **[Assumption]** | Measured latency failure, or distributed rate limiting becomes unmanageable |
| Kafka/RabbitMQ/SQS | Rejected | Postgres queue handles expected job volume | Sustained throughput beyond Postgres queue capacity |
| Time-series database | Deferred | Daily bars fit a plain indexed table | Intraday/tick ingestion enters scope |
| Separate search engine (Elasticsearch/Meilisearch) | Deferred | Postgres FTS meets MVP needs | FTS relevance/latency inadequate on real data |
| Worker long-running poll loop | Deferred | Start with drain-and-exit (D-016a); add loop only after U-09 resolves | U-09 confirms always-on background process available |
| pgvector | Deferred | FTS sufficient until retrieval eval shows otherwise (D-008) | Retrieval eval set (Week 9-10) shows FTS recall below agreed bar |
| Per-source fair scheduling | Deferred | FIFO adequate at MVP source count (SIMPL-02) | Observable starvation of one source by another |

---

## 5. Cost, free-tier and licensing evaluation (Rs.0/month target)

**Method.** Costs and limits below are **not** claimed. Each row states what is known by definition, what is assumed, and exactly what must be verified.

### 5.1 Software (build-time dependencies)

| Component | Known | Cost risk | Validation task |
|---|---|---|---|
| Next.js, Prisma ORM, Zod, PostgreSQL (the software) | **[Assumption]** Open-source with permissive licences | Licence of each dependency; hosted/commercial add-ons are separate products | Read each package LICENSE at install time; run a licence scan in CI |
| Auth library | Depends on choice (U-08) | Hosted auth services can have user-count or feature limits | Per D-015 |
| Testing tools | **[Assumption]** Open-source | CI minutes if run on hosted CI | See CI row below |

### 5.2 Runtime hosting (all unresolved -- U-09)

| Need | Why it is hard at Rs.0 | Validation questions |
|---|---|---|
| Web app hosting | Free tiers may restrict commercial use, bandwidth, or execution time | Is commercial/revenue-generating use permitted? Request/bandwidth limits? Cold-start behaviour? |
| Always-on or scheduled worker | Many free hosts do not provide persistent background processes | Can a long-running process run on the free tier? If not: can scheduled cron jobs invoke drain-and-exit mode? Minimum schedule interval? |
| PostgreSQL | Free tiers commonly limit storage, connections, compute hours; may pause when idle; may lack PITR | Storage cap vs. estimated data volume? Connection limit vs. serverless + worker concurrency? Inactivity pausing? Backups/restore guarantees? Extension availability (pgvector, pg_trgm)? Can a restricted role be created (U-14)? |
| CI | Free allowances are limited and change | Minutes/month vs. test-suite duration; database service containers supported? |
| Domain/TLS | Custom domain usually costs money | Is a provider-supplied subdomain acceptable for MVP? |
| Error/log monitoring | Paid beyond small free allowances | Use platform logs + IngestionRun table in MVP |

**[Recommendation]** The worker is designed in drain-and-exit mode (D-016a), which is viable under any hosting model. Long-running loop added only after U-09 is resolved.

### 5.2.1 Vercel Hobby plan permitted-use distinctions (U-09)

Official terms (`https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage` and `https://vercel.com/legal/terms`, verified 2026-10-02) restrict the Hobby plan to **non-commercial personal use only**. To ensure regulatory and contractual compliance, the architecture establishes an explicit three-way distinction:

1. **Private, non-commercial learning project:** **Permissible** on the Hobby plan. A single developer building, testing, and running personal prototypes with no financial gain, no client compensation, and no business intent falls within the permitted non-commercial personal scope.
2. **Publicly accessible, non-revenue-generating project:** **Unresolved / High terms risk.** While Vercel defines "commercial usage" primarily around financial gain (payment processing, product advertising, monetisation/fees, affiliate links, display ads like AdSense) and explicitly notes donations are not commercial, the Hobby plan is restricted to *personal use*. A publicly accessible web application with open user registration or public audience may not qualify as personal use even if zero revenue is generated. The absence of revenue does not automatically make public deployment permissible. **This is recorded as an open question requiring written clarification from Vercel Support before any public launch.**
3. **Commercial or revenue-generating service:** **Strictly prohibited** on the Hobby plan. Any deployment used for the financial gain of anyone involved in the production of the project (including accepting fees, displaying ads, promoting commercial products, or paid developer engagements) mandates a paid plan (Vercel Pro at $20/user/month or Enterprise).

### 5.3 Market data -- the dominant risk

| Question | Why it matters |
|---|---|
| Is there any source whose terms permit storing historical prices, displaying them to users, and doing so in a commercial or public product? | Many providers license "personal/non-commercial" or "display-only" use; storing and redistributing is often a distinct paid right |
| Does the licence permit derived data (indicators) and LLM processing? | AI features may count as a distinct use |
| NSE/BSE exchange data | **[Assumption]** Exchanges have their own data-distribution and licensing policies and may restrict redistribution and automated scraping. Verify each exchange's current terms directly. |
| Unofficial community wrappers | Commonly depend on undocumented endpoints; terms frequently restrict to personal use. **[Assumption]** -- verify; treat as development-only until proven otherwise |

**Gate (week 2-3):** produce a one-page source evaluation per candidate recording: exact terms URL and read date, permitted uses (store/display/derive/redistribute/commercial/AI), quotas, coverage, data quality, ToS-compliant access method, and cost.

**Fallbacks if no free, permitted source exists:**
1. Reduce scope to what is legally obtainable (e.g. user-uploaded CSVs for their own portfolio and charts).
2. Run as a private/non-commercial learning project where the chosen provider's terms allow it.
3. Accept a small paid data tier, which breaks the Rs.0 constraint and requires an explicit decision.

### 5.3.1 Provider implementation hold (U-01 / U-02)

**Implementation hold:**
- **No live market-data provider adapter may be implemented before U-01 is resolved.**
- **No live news/disclosure provider adapter may be implemented before U-02 is resolved.**
- **No ingestion job may target a live provider whose required licence has not been reviewed.**
- **No provider-sourced prices or disclosures may be displayed to users before the applicable permissions are verified.**
- **The corresponding `DataSource` must have `licenseReviewedAt` set and `enabled = true` only after the required rights have been confirmed.**
- **A database flag is not proof of legal permission; the rights must be supported by documented terms or written provider approval.**

**Permitted unblocked work:**
This implementation hold does **not** block provider-independent interfaces (e.g. `MarketDataProvider`, `NewsProvider`, `LlmProvider` port definitions), database schema work and migrations, mock fixtures, synthetic test data generators, or unit, integration, and E2E tests that do not use real provider data.

### 5.4 News and disclosures

| Question | Why it matters |
|---|---|
| Does the source permit storing text, or only linking/headlines? | Drives licenseRestriction and whether the AI may read the text |
| Official regulatory/exchange announcements | **[Assumption]** May have public access terms distinct from redistribution rights; verify per source |
| Publisher RSS feeds | Terms vary; some prohibit commercial reuse or AI processing |
| Scraping | Needs explicit terms review and robots.txt compliance; fragile and legally risky |

### 5.5 LLM provider

| Question | Why it matters |
|---|---|
| Is there a free tier permitting commercial/production use? | Free tiers often have usage-policy or data-use caveats |
| Rate limits and daily quotas vs. per-user AI budget | Defines how many answers the MVP can serve |
| Are prompts/outputs retained or used for training? | We send third-party news text, not personal data; still record the terms |
| Structured-output support and context size | Citation contract depends on reliable JSON output |

**[Recommendation]** The MVP must be fully functional with a deterministic FakeLlmProvider for tests and with graceful abstention when the real provider is unavailable or over quota. Never make the LLM a hard dependency of non-AI pages.

### 5.6 Cost summary

| Area | Rs.0 feasibility | Status |
|---|---|---|
| Open-source software | Likely, subject to licence scan | Needs verification |
| Web/DB hosting | Unknown | **Validate (U-09)** |
| Worker hosting | Unknown, structurally difficult | **Validate (U-09)** |
| Market data | Unknown, **highest risk** | **Gate (U-01)** |
| News/disclosures | Unknown, high risk | **Gate (U-02)** |
| LLM | Unknown | Validate (U-03) |
| CI | Unknown | Validate |

The Rs.0 target is **not confirmed achievable**. It is a constraint to test; a failed test changes scope rather than invalidating the architecture.

---

## 6. Architectural risks

| # | Risk | Likelihood | Impact | Mitigation | Owner/Trigger |
|---|---|---|---|---|---|
| R-01 | No legally usable free market-data source | High | Critical | Week 2-3 gate; scope fallbacks (section 5.3) | Developer |
| R-02 | News/disclosure licences prohibit text storage or AI use | High | High | licenseRestriction; link-only mode; AI abstains when evidence is link-only | Developer |
| R-03 | Worker cannot run on free hosting | Medium-High | High | Drain-and-exit mode (D-016a); validate early | U-09 |
| R-04 | Free-tier DB limits (storage, connections, pausing) | Medium | High | Volume estimate; pooled connections; Prisma connection limits; retention policy | U-09 |
| R-05 | Incorrect financial maths (floats, rounding, corporate actions) | Medium | High | Decimal-only money; golden tests; property tests; documented formulas | Testing strategy |
| R-06 | Unadjusted prices after splits/bonus produce false charts and indicators | High if unhandled | High | Corporate-action table; adjusted-series computation or source-adjusted data; sanity checks flagging abnormal single-day moves (+-75% provisional) | U-04 |
| R-07 | LLM hallucination despite citations (valid citation, wrong inference) | Medium | High | Narrow claim schema; verbatim quotes shown; eval set; abstain on weak evidence; "not advice" framing | D-009 |
| R-08 | Prompt injection via news/disclosure text | Medium | High | Untrusted-content delimiting; no model tools/network; output validation; URL allow-list from evidence | security.md |
| R-09 | Cross-user data leakage (IDOR) | Medium | Critical | Scoped repositories; authorisation matrix tests in CI; DTO-only responses | D-013 |
| R-10 | Regulatory exposure (acting as unregistered adviser) | Medium | High | No recommendations/targets; keyword/regex policy gate + deny-list + abstention; disclaimers; legal review (U-13) | Pre-launch |
| R-11 | Scope creep from the larger PRD | High | High | Written MVP boundary; out-of-scope list enforced in review | Developer |
| R-12 | Module-boundary decay in the monolith | Medium | Medium | Boundary lint in CI (deferred to Phase 2; TypeScript path aliases in interim) | D-001 |
| R-13 | Ingestion silently produces bad data | Medium | High | Zod + domain sanity checks; reject counters; run records; freshness states | Overview section 5 |
| R-14 | LLM cost/quota abuse by users | Medium | Medium | Per-user daily AI budget; rate limits (PostgreSQL-backed); input length caps | security.md |
| R-15 | Auth library choice becomes unmaintained or mismatched | Low-Medium | Medium | Isolate behind identity module; evaluate maintenance before adoption | D-015 |
| R-16 | Time-zone/market-calendar bugs (IST vs UTC, holidays) | Medium | Medium | tradeDate as DATE in IST semantics; UTC for instants; holiday source decision (U-07); tests around midnight/holidays | U-07 |
| R-17 | Solo-developer schedule risk | High | Medium | Strict milestone gating; stretch items last; week-12 buffer | Overview section 8 |
| R-18 | Backups/restore not available on free DB | Medium | High | Periodic logical dump job to developer-controlled storage; document restore drill | U-09 |

---

## 7. Explicit trade-offs

| Choice | Gains | Costs |
|---|---|---|
| Modular monolith | Simplicity, one test setup, cheap hosting | Weaker isolation; needs boundary discipline |
| Postgres for everything | One thing to run and secure | Queue/FTS/rate-limit load on one DB |
| Worker-only provider access | Resilience, licence control | Staler data; freshness UX required |
| Daily bars only | Lower cost and licence exposure | No intraday features |
| Drain-and-exit worker first | Simpler, testable, hosting-agnostic | Nightly cadence only; cannot do near-real-time |
| FIFO queue ordering | Simplest correct implementation | No fairness guarantee across sources |
| FTS before vectors | Predictable, no extra provider | Weaker semantic recall on paraphrased questions |
| Weighted-average cost | Simple, no lot tracking | Less tax-correct than FIFO for Indian equities (FIFO deferred) |
| Derived holdings | Single source of truth | Recompute on read |
| Abstain-first AI | Safer and more honest | Users see "can't answer" more often |
| Keyword/regex policy gate | Deterministic, fast, free, testable | Incomplete coverage; paraphrased advice requests may pass |
| Time-based revalidate cache | No inter-process communication needed | Data may lag ingestion by the revalidation period |
| Keyed HMAC pseudonym in AuditLog | Privacy-preserving; audit rows survive user deletion | Key rotation breaks historical-to-current correlation; key management overhead |
| Reject whole answer on uncited claim | Simplest validator; forces full citation | More abstentions on early prompts |
| Compute indicators on read | No storage drift, free parameter changes | CPU per request (mitigated by memoisation) |

---

## 8. Validation log

Records external facts verified during Phase 1, Phase 1.1, and Phase 1.2. The log is append-only. All entries must record the exact source URL and the date read.

**Validation log instructions:** When validating an item, add a row with: the date, the item ID, the exact URL of the official source you read, the specific finding (free-tier limit, permitted use, or equivalent), and the decision it enables. Do not paraphrase remembered information; always read the current official page and record that URL.

| Date | Item | Source URL + date read | Finding | Decision taken |
|---|---|---|---|---|
| -- | DR-01 (U-01) Market-data licence | -- | Not yet verified | **Open** |
| -- | DR-02 (U-02) News/disclosure licence | -- | Not yet verified | **Open** |
| -- | DR-05 (U-03) LLM provider terms | -- | Not yet verified | Open |
| -- | U-07 Exchange holiday calendar | -- | Not yet verified | Open |
| -- | U-13 Legal review | -- | Not yet commenced | Open |
| -- | U-14 DB restricted role | -- | Depends on U-09 hosting choice | Open |
| -- | TV-02 +-75% threshold validation | -- | Provisional; validate against historical data once U-01 source available | Provisional |
| **2026-10-02** | DR-04 (U-08) Auth library -- Auth.js ecosystem | https://better-auth.com/blog/authjs-joins-better-auth (read 2026-10-02) | Auth.js (NextAuth) is now maintained by the Better Auth team (Sep 2025). Auth.js receives security patches only. Official recommendation: new projects use Better Auth. | D-015 updated; Better Auth recommended; U-08 remains **Open** pending CSRF verification |
| **2026-10-02** | DR-04 (U-08) Better Auth version + Prisma adapter | https://www.better-auth.com/docs/adapters/prisma (read 2026-10-02) | Latest stable version 1.7.7. First-party `@better-auth/prisma-adapter`. Documented for Prisma 7 + PostgreSQL. Prisma 6 also supported. | Supports proposed stack; closes compatibility question for Prisma. CSRF for Route Handlers NOT confirmed (docs page 404). U-08 **Open**. |
| **2026-10-02** | DR-03 (U-09) Vercel Hobby terms & commercial use | https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage (read 2026-10-02); https://vercel.com/legal/terms (read 2026-10-02) | Vercel Hobby plan is restricted to non-commercial personal use only. Commercial use (financial gain of anyone involved, payments, ads, affiliate links, paid hosting/creation) strictly requires Pro ($20/user/mo). Donations are excluded from commercial use. Private non-commercial learning project is permitted; commercial service is prohibited; whether a publicly accessible non-revenue project qualifies as personal use is unverified and recorded as an open question. | Rs.0 + Vercel Hobby is not viable for commercial service. Public non-revenue use requires clarification from Vercel Support. U-09 remains **Open**. |
| **2026-10-02** | DR-03 (U-09) Neon PostgreSQL Free tier evaluation | https://neon.tech/docs/introduction/plans (read 2026-10-02) | Free plan evaluated: 1 GB Postgres storage/project (up to 20 GB across all projects); 100 CU-hours/project/month (~400 hours with 0.25 CU compute; autoscaling up to 2 CU / 8 GB RAM); 5 GB public network transfer/month. Scale-to-zero is mandatory and cannot be disabled (suspends after 5 min inactivity; wakes on incoming connection with cold-start latency). Point-in-time recovery (instant restore) includes 6-hour history window (capped at 1 GB change history on root branches); 1 manual snapshot; no automated scheduled backups. Connection pooling supports up to 10,000 pooled connections via built-in pgBouncer. Commercial use: targeted at prototypes/side projects/small teams, no explicit ban, but production directed to paid tiers. Unverified/unknown: restricted DB role capability (U-14 GRANT permissions), direct non-pooled connection limits, latency impact of cold starts on web requests, long-term project inactivity deletion policy. | Neon Free is viable for development and initial prototyping, but 100 CU-hr/month cap, mandatory 5-min scale-to-zero, and 6-hour PITR window mean production and worker viability at Rs.0 is not established. U-09 remains **Open**. |
| **2026-10-02** | DR-03 (U-09) Railway pricing + AUP | https://railway.com/pricing (read 2026-10-02); https://railway.com/legal/fair-use (read 2026-10-02) | No free tier for sustained compute. Hobby plan: $5/mo includes $5 usage credit. Per-second billing. Commercial use permitted (AUP only prohibits illegal activity). | Railway Hobby is $5/mo minimum, not Rs.0. Commercial use permitted. D-016a (drain-and-exit) confirmed viable. U-09 **Open**. |
| **2026-10-02** | DR-01 (U-01) Polygon.io / Massive Individual ToS | https://polygon.io/legal/individuals-terms-of-service (read 2026-10-02; ToS last updated July 18 2025) | Polygon.io has rebranded as "Massive". Individual plan: permits "personal, non-commercial, and non-business purposes" only. Commercial use explicitly prohibited under Individual terms. Business plan terms unknown (requires contacting sales). | Free Individual plan NOT viable for commercial or public product. Business plan terms unknown. U-01 **Open**. |
| **2026-10-02** | DR-01 (U-01) Alpha Vantage ToS | https://www.alphavantage.co/terms_of_service/ (PDF downloaded 2026-10-02; not fully parsed) | ToS returned as a PDF file. Pricing page confirms free tier exists (~25 calls/day limit). Specific clauses on storage, redistribution, commercial use, AI/LLM processing not extracted from this pass. | U-01 **Open** -- Alpha Vantage ToS must be read from the PDF before any decision. |
| **2026-10-02** | DR-02 (U-02) News/disclosure sources | No source evaluated in Phase 1.2 | No evaluation completed. | U-02 **Open**. |

---

## 9. Next recommended step

**Before writing any application code:**

1. Resolve U-08 (auth library): select library, verify App Router + Prisma compatibility, confirm CSRF behaviour for Route Handlers.
2. Resolve U-09 (hosting): select candidates, verify free-tier limits, worker process model, Postgres extensions, restricted role capability.
3. Start U-01/U-02 source evaluations: produce a one-page evaluation per candidate market-data and news source. This is the Week 2-3 gate.
4. All architecture document changes from Phase 1.1 are already applied (overview.md, data-model.md, decisions.md, security.md, testing-strategy.md).

**First code written (Week 1 deliverable):**
A repository with: passing CI pipeline (type-check -> lint -> unit tests -> integration tests against a disposable Postgres -> migration check -> build -> trivial E2E smoke), the `platform` module (config, logger, error types, Clock), the `identity` module skeleton wired to the chosen auth library, the initial Prisma migration (User + auth-library tables + AuditLog + RateLimitBucket), and a documented, passing test that: (a) creates a user, (b) signs in, (c) calls a protected route as an authenticated user and receives data, (d) calls the same route as an unauthenticated user and receives 401, (e) calls the same route as a disabled user and receives 401.

**This milestone is the foundation gate. No feature module is started until it passes.**
