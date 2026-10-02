# MarketMind AI -- Testing Strategy (Phase 1.1)

Related: [overview.md](./overview.md) · [data-model.md](./data-model.md) · [security.md](./security.md) · [decisions.md](./decisions.md)

Status: **Phase 1.1 -- Finalised for implementation approval**. Tool names are candidates to validate at install time (current versions, Next.js App Router support, licences); none are claimed to be free of limits in hosted form.
Tags: **[Assumption]** unverified · **[Recommendation]** proposed · **[Accepted]** closed in Phase 1.1 review · **[Provisional]** placeholder requiring validation.

---

## 1. Principles

1. **Test where the risk is.** Money maths, authorisation, ingestion idempotency and AI grounding get the strictest tests; presentational components get the lightest.
2. **No network in tests.** Providers and the LLM are always replaced by fakes or recorded fixtures.
3. **No licensed data in the repository.** Fixtures are synthetic or hand-authored.
4. **Real database for persistence tests.** Constraints, partial indexes, SKIP LOCKED and FTS behaviour cannot be validated with mocks or SQLite.
5. **Deterministic.** Inject a clock and ID/random sources. No wall-clock or timezone dependence (run the suite under a non-IST timezone in CI).
6. **Security requirements are tests.** Each `SEC-*` requirement maps to a test, lint rule, or review item (security.md section 10).

---

## 2. Test pyramid and tooling

| Layer | Scope | Candidate tooling | Runs |
|---|---|---|---|
| Unit | `domain/` pure logic, validators, schemas, citation validator, retry/backoff | Vitest (or Jest), `fast-check` for property tests | every commit, seconds |
| Integration | Repositories, migrations, ingestion runner, queue claim, FTS retrieval, services with real Postgres | Vitest + disposable PostgreSQL (Docker via Testcontainers or a CI service container) | every PR, minutes |
| Contract | Provider adapters against fixtures; LlmProvider fake conformance | Vitest | every PR |
| API/authorisation | Route handlers/services as user A vs user B vs anonymous vs admin | Vitest against the integration DB | every PR |
| End-to-end | Critical user journeys in a real browser against a running app + test DB + stub providers | Playwright | every PR (small smoke set) + nightly full |
| Static | Types, lint (including boundary and security rules), licence/dependency/secret scans | TypeScript strict, ESLint, scanners (select free tooling) | every commit |

**[Assumption]** Docker is available on the developer machine and in the chosen CI. If not, fall back to a dedicated test database on the free tier with per-run schemas -- validate (U-09).

Coverage is a signal, not a goal: **[Recommendation]** require near-complete branch coverage on `domain/` (financial and citation logic) and report, but do not gate, coverage elsewhere.

---

## 3. Unit tests -- financial calculations

### 3.1 Principles
- Test against **independently derived expected values** (hand calculation, spreadsheet, or a reference implementation run offline and its outputs committed as fixtures with the generating script documented).
- Use synthetic price series; no licensed data committed.
- Define every formula and its edge behaviour in the code's doc comment; test names mirror those rules.

### 3.2 Portfolio and money
| Area | Cases |
|---|---|
| Position quantity | Single/multiple BUYs; BUY then partial/full SELL; same-day orderings; fractional quantities |
| **[Accepted: DR-08] Weighted-average cost** | Multiple lots at different prices; fees included per documented formula; SELL reduces quantity but keeps average cost unchanged (quantity reduces proportionally); full exit resets cost basis to zero; re-entry after full exit starts a fresh average |
| Invalid ledgers | SELL exceeding holdings at any point in time rejected; zero/negative qty or price rejected; future dates rejected |
| Market value and unrealised P&L | Latest close used with its date; missing price -> "unpriced", excluded and flagged, never zero |
| Weights | Sigma weights = 1 within rounding policy; single holding = 100%; all unpriced -> empty state not NaN/division-by-zero |
| Concentration | Top-N with N > holdings; ties; HHI bounds (1/n <= HHI <= 1); HHI of equal weights = 1/n |
| Decimal behaviour | No float artefacts (e.g. 0.1 + 0.2 equivalents); rounding mode applied only at the edge; large values near NUMERIC(18,4) limits |
| Properties (fast-check) | Weights always sum to 1; removing a zero-quantity position never changes totals; order-independence for same-date BUY sets; HHI in [1/n, 1] |

### 3.3 Indicators

**[Accepted: TV-05 closed]** Numeric tolerances for indicator maths are stated per indicator below. These tolerances apply to the output of the pure domain functions when tested against independently derived expected values. They do not apply to money or portfolio maths, which must be exact under Decimal arithmetic.

| Indicator | Tolerance | Notes |
|---|---|---|
| SMA | 1e-10 (relative) | Exact under Decimal; float tolerance if float is used internally |
| EMA | 1e-9 (relative) | Exponential smoothing accumulates small float error |
| Bollinger Bands | 1e-9 (relative) | Derived from SMA + standard deviation |
| RSI (Wilder) | 1e-6 (relative) | Wilder smoothing over many periods accumulates more error than EMA |
| MACD (12/26/9) | 1e-8 (relative) | Composed of two EMAs; tolerance is the looser of the two |
| ATR (stretch) | 1e-9 (relative) | If added later |

These tolerances are **[Provisional]**; tighten if golden tests reveal that the actual implementation achieves better precision, or relax if a reference implementation produces a known looser result. The tolerance and the source of the reference values MUST be documented in a comment adjacent to the test fixture.

| Indicator | Verification |
|---|---|
| SMA, EMA, Bollinger | Hand-checkable short series; EMA seeding rule documented and tested; warm-up values are undefined/null, not zero |
| RSI (Wilder) | Reference series with known outputs; all-gains (RSI -> 100) and all-losses (RSI -> 0) edge cases; zero-change periods |
| MACD (12/26/9) | Reference outputs; signal/histogram alignment; insufficient-data behaviour |
| General | Series shorter than the window; NaN/gap handling; non-trading-day gaps do not distort windows; results independent of input array mutation |
| Adjusted series (if in scope) | Split/bonus ratios applied across the ex-date boundary; chained corporate actions |

### 3.4 Other pure logic
Freshness state derivation (FRESH/STALE/FAILING/UNKNOWN from authoritative fields -- overview.md section 5); retry/backoff schedule with jitter bounds; URL canonicalisation and hashing; chunking (sizes, overlap, Unicode); IST/UTC date conversions around midnight and DST-free edge cases; HMAC-SHA256 pseudonym derivation for AuditLog (stable for same input, different for different inputs).

---

## 4. Integration tests -- persistence and ingestion

Run against a real, freshly migrated PostgreSQL.

### 4.1 Persistence and migrations
- **Migrations apply from scratch** and from the previous schema state; drift check (schema.prisma vs migrations) passes.
- **Constraints work:** unique keys (Instrument(exchange,symbol), Watchlist(userId,name)), CHECKs (OHLC ordering, positive prices, non-negative volume, positive quantity), partial unique indexes (job dedupe, null-instrument freshness, active-document URL uniqueness), enum validity, FK behaviour and cascades (user deletion removes owned data; IngestionRun deletion sets PriceBar.ingestionRunId to NULL; DocumentChunk FK cascade per retention policy).
- **Precision round-trip:** values at the extremes of NUMERIC(18,4) and 8-decimal ratios survive write/read as Decimal without float conversion.
- **Timezone:** instants stored as UTC timestamptz; tradeDate unaffected by process timezone (run under two timezones).
- **Raw SQL assets exist:** GIN index on DocumentChunk.tsv, partial indexes (query catalogue assertion), reclaim query and claim query are correct SQL.
- **lockExpiresAt reclaim:** integration test with injected clock confirms that RUNNING jobs with expired lockExpiresAt are reclaimed to QUEUED exactly once on the next drain cycle.
- **Query plans (smoke):** chart range query and per-instrument timeline use the intended indexes on a seeded mid-sized synthetic dataset.

### 4.2 Ingestion
| Scenario | Expected |
|---|---|
| Happy path (fake provider) | Rows validated, upserted; IngestionRun counts correct; DataFreshness authoritative fields updated; state recomputed |
| **Idempotency** | Running the same job twice yields identical state and no duplicates |
| Partial/invalid rows | Rejected rows counted and reported; run outcome PARTIAL or FAILED by threshold; valid rows handled per documented policy |
| Schema break | Provider payload with unexpected shape fails the run without partial garbage |
| Retry | Timeouts/429/5xx -> QUEUED with increased runAfter (backoff + jitter bounds); attempts incremented; terminal -> DEAD |
| Non-retryable | 4xx auth/schema errors -> no pointless retries |
| **Crash recovery** | Job left RUNNING beyond lockExpiresAt is reclaimed to QUEUED exactly once; attempts budget unchanged at reclaim (incremented at completion) |
| **Concurrency** | Two runners claiming simultaneously never process the same job (SKIP LOCKED); dedupeKey prevents duplicate active jobs |
| Provider isolation | Failing provider A does not delay provider B's jobs (verify with synthetic FIFO queue) |
| Sanity rules | Impossible OHLC, future dates, +-75% single-day move (provisional threshold) logged as warning; OHLC violations rejected; future-date bars rejected |
| Licence gating | A source with enabled=false or missing licenseReviewedAt cannot be scheduled; LINK_ONLY documents never store text |
| Sanitisation | HTML with scripts/hidden text/zero-width characters stored as safe plain text |
| SSRF guards | Hardened client rejects private/loopback/metadata IPs, redirects to disallowed hosts, oversize bodies, wrong content types |
| Freshness | Weekend/holiday handling does not mark FRESH data STALE; consecutiveFailures increments on failure; FAILING state set at threshold |
| Document versioning | Re-fetch with changed contentHash: new Document row created (ACTIVE), old row updated (REMOVED, supersededById set); old chunks retained; AiCitation rows pointing to old chunks remain valid with stored quote |

### 4.3 Retrieval
FTS returns scoped, date-filtered results; ranking sanity on a small hand-labelled corpus; filters by instrument/kind/date; empty-result behaviour; LINK_ONLY/AI-disallowed sources excluded from AI retrieval; removed documents (status=REMOVED) not returned by retrieval but accessible to citation resolution.

---

## 5. Authorisation tests

### 5.1 Matrix (generated from a route/service inventory)
For **every** user-owned operation, assert outcomes for each actor:

| Actor | Own resource | Other user's resource | Nonexistent ID | Notes |
|---|---|---|---|---|
| Anonymous | UNAUTHENTICATED | UNAUTHENTICATED | UNAUTHENTICATED | no data leak via timing/messages |
| User A | allowed | NOT_FOUND | NOT_FOUND | same response shape for both not-found cases |
| User B | symmetric to A | | | |
| Disabled user | rejected | rejected | rejected | |
| Admin | admin-only routes allowed; does NOT gain access to user portfolio data | | | |

Operations covered: watchlist CRUD and item add/remove (child-by-ID attacks); portfolio CRUD; transaction create/update/delete (including pointing a transaction at another user's portfolio -- must fail via composite FK and service check); AI query list/read; any export/delete endpoints; admin ingestion controls.

### 5.2 Structural checks
- **Deny-by-default test/lint:** a test enumerates all route handlers/Server Actions and fails if any lacks an explicit auth declaration (SEC-AUTHZ-02).
- **Repository contract:** user-owned repository functions fail to type-check without `userId` (compile-time test) and a runtime test confirms scoping.
- **Mass-assignment:** extra fields in request bodies (userId, role, createdAt) are ignored/rejected.
- **DTO leakage:** snapshot/shape tests ensure responses never contain hashes, internal flags, other users' identifiers, actorPseudonym values.
- **Licence filtering:** LINK_ONLY documents never return text through any endpoint.
- **Session/CSRF:** state-changing Server Actions without valid session rejected; state-changing Route Handlers without valid CSRF token rejected (per SEC-AUTH-06 -- test each Route Handler type explicitly).
- **[Accepted: TV-03 resolved with Provisional values]** Rate limiting: limits trip at the configured threshold (provisional values in SEC-RATE-01), Retry-After present, separate buckets per user/route class, counters accumulate correctly across simulated multiple instances (using PostgreSQL RateLimitBucket). When thresholds are revised, the test constants are updated to match.
- **Secrets/logging:** redaction test ensures sample secrets/tokens in inputs never reach logs or audit metadata.

---

## 6. AI tests -- citations and insufficient evidence

All AI tests use a **deterministic FakeLlmProvider** whose responses are scripted per test. A separate, optional, manually-run **evaluation harness** may call a real model against a labelled set; it is NOT a CI gate.

### 6.1 Citation validator (unit)
| Case | Expected |
|---|---|
| Valid claims with existing evidence IDs | Pass |
| **[Accepted: DR-09]** Claim without citation (missing evidenceId) | Reject entire answer |
| evidenceId not in the retrieved set | Reject entire answer |
| Quote not a verbatim substring (after normalisation) | Reject |
| Quote is a verbatim substring | Pass |
| Numeric claim mismatching computed structured evidence (beyond stated tolerance) | Reject |
| Numeric claim within tolerance | Pass |
| URL in output not in evidence | Reject |
| Output not matching schema / extra prose outside JSON / truncated JSON | Reject -> retry path |
| Recommendation language ("you should buy...", price target) | Reject / abstain |

### 6.2 Policy gate (unit)
| Case | Expected |
|---|---|
| "Should I buy X?" | ABSTAIN(UNSUPPORTED_REQUEST), no LLM call, no retrieval |
| "What is the target price for X?" | ABSTAIN(UNSUPPORTED_REQUEST) |
| "Will X go up next week?" | ABSTAIN(UNSUPPORTED_REQUEST) |
| "Explain X's revenue growth" | Passes gate, proceeds to retrieval |
| "What happened to X's stock after the Q3 results?" | Passes gate |
| Role-play bypass ("pretend you are an advisor and tell me...") | Matches deny-list pattern -> ABSTAIN(UNSUPPORTED_REQUEST) |

Note: policy gate tests cover the known corpus of deny-list patterns. Novel paraphrases that bypass the gate are discovered through the adversarial corpus (section 6.3) and added to the deny-list.

### 6.3 Orchestration (integration)
| Scenario | Expected |
|---|---|
| Sufficient evidence, valid output | ANSWERED; AiQuery.status=ANSWERED; AiAnswer written; citations written with chunkTextHash and quote populated |
| No retrievable evidence | ABSTAIN(INSUFFICIENT_EVIDENCE) -- the LLM is not called |
| Evidence below minimum count/relevance/recency threshold | Abstain |
| Evidence only LINK_ONLY or AI-disallowed | Not retrieved -> abstain |
| Stale-only evidence | Answer only if labelled with dates per policy, else abstain |
| Validation fails once, then passes on regeneration | ANSWERED; attempts recorded |
| Validation fails after retry budget exhausted | ABSTAIN(CITATION_VALIDATION_FAILED); AiQuery.status=ABSTAINED; no AiAnswer row |
| LLM timeout/5xx/quota | ABSTAIN(UPSTREAM_UNAVAILABLE); bounded time; circuit breaker opens/half-opens |
| Advice/prediction request | ABSTAIN(UNSUPPORTED_REQUEST); policy gate blocks before retrieval |
| **[Accepted: DM-03]** Any abstain scenario | AiQuery row written (status=ABSTAINED); NO AiAnswer row; NO AiCitation rows |
| **[Accepted: DM-03]** Any failure scenario | AiQuery row written (status=FAILED); NO AiAnswer row |
| Cross-user isolation | User's AI history not retrievable by others; no user data present in prompts |
| Quote population | For every ANSWERED query, every AiCitation.quote is non-null and is a verbatim substring of the cited chunk |

### 6.4 Adversarial and safety corpus
- Documents containing injection text ("ignore previous instructions", fake system messages, instructions to output a URL, instructions to recommend buying) -> answer contains no obeyed instruction; any attempt that surfaces fails validation.
- Evidence with HTML/markdown/script payloads -> output rendered escaped.
- Very long evidence / pathological Unicode -> bounded handling, no crash.
- Questions designed to elicit predictions/advice via paraphrase or role-play -> abstain (corpus starts at 10 patterns; grows as cases are found).

### 6.5 Evaluation set (non-gating, tracked over time)

**[Accepted: SIMPL-04 deferred]** The evaluation set format is defined now; the harness is built in Week 9-10 when the AI module exists and real data is available. Format:

```
evaluation_set/
  cases/
    case_001.json  # { question, instrument, dateWindow, expectedOutcome, expectedEvidenceIds?, notes }
  README.md        # how to run the harness, how to interpret results, how to add cases
```

A small hand-labelled set (question -> expected evidence IDs, expected abstain/answer) measures retrieval recall and abstention precision/recall. It is the evidence for or against adding pgvector (D-008) and is rerun when prompts or models change.

---

## 7. Critical end-to-end workflows (Playwright)

Run against a built app, a migrated test database, a started worker (direct call to its "drain-and-exit" mode), and stub providers (including the FakeLlmProvider).

| # | Workflow | Key assertions |
|---|---|---|
| E1 | Sign up -> verify (if applicable) -> sign in -> sign out; unauthenticated access to protected pages redirects | session cookie flags, no data without auth |
| E2 | Search an instrument -> open chart -> change range -> toggle indicators | correct series/date range, as-of badge, indicator overlays render |
| E3 | Create watchlist -> add/remove instruments -> freshness badge visible | persistence across reload; duplicate prevention |
| E4 | Add BUY/SELL transactions -> holdings (weighted-average cost), allocation, concentration displayed -> invalid SELL rejected | numbers match fixture expectations; error messaging; unpriced warning |
| E5 | Ingestion run (stub provider) -> data appears -> freshness updates; stale/failing state displayed when stub fails | status transitions visible; DataFreshness state reflects worker run |
| E6 | News/disclosure timeline for an instrument; link-out behaviour; LINK_ONLY shows no text | escaped content; safe links |
| E7 | AI question with sufficient evidence -> answer with working citation links showing quote and source | each citation resolves; quote displayed; disclaimer and as-of shown |
| E8 | AI question with insufficient evidence and an advice question -> abstention messages; no AiAnswer row in DB | no fabricated content |
| E9 | Two-user isolation: user B cannot open user A's portfolio/watchlist/AI URLs (direct URL tampering) | not-found response, no data |
| E10 | Rate limit: rapid AI requests -> 429 UX message | friendly handling, retry hint |
| E11 | Admin: view ingestion runs, re-queue a dead job; non-admin blocked | audit entries written |

**[Recommendation]** E1, E2, E4, E7, E9 form the per-PR smoke set; the rest run nightly or pre-release.

---

## 8. CI pipeline and gates

1. Install (lockfile-frozen) -> type-check -> lint (incl. boundary rules deferred to Phase 2, no-raw-unsafe-SQL, no-dangerouslySetInnerHTML, no direct Prisma in routes) -> secret scan -> dependency/licence scan.
2. Unit tests.
3. Integration + authorisation + contract tests with a Postgres service.
4. Migration checks (fresh + upgrade, drift).
5. Build.
6. E2E smoke (Playwright) against the build.
7. Nightly: full E2E, optional AI evaluation (manual trigger), dependency audit.

A change cannot merge with failing tests. Flaky tests are fixed or quarantined with an issue the same week.

---

## 9. Test data and environments

- **Synthetic data generators** for prices (with controllable gaps, splits, outliers), transactions, documents (with injection payloads).
- **Fakes:** FakeMarketDataProvider, FakeNewsProvider, FakeLlmProvider implementing the same ports as production adapters; a shared conformance test suite runs against each adapter and each fake.
- **Time:** injected Clock; tests control "now", market close and holidays.
- **Isolation:** each integration test file gets a clean schema/transaction; E2E uses a dedicated database reset between runs.
- **Environments:** no test run may read production credentials (CI uses separate secrets; env validation refuses production hosts in test mode).

---

## 10. Definition of done (per feature, Phase 2 onward)

- Domain logic has unit tests, including edge cases listed above.
- Persistence/ingestion changes have integration tests, incl. idempotency where relevant.
- Every new user-owned route/action is in the authorisation matrix.
- Every new external input has a Zod schema with bounds and a rejection test.
- Security requirements touched are mapped to tests/lint.
- Docs updated: decisions, data model, open questions.

---

## 11. Open testing questions

**[Accepted: TV-03, TV-04, TV-05, TV-06, TV-07 closed in Phase 1.1]**

| Question | Status |
|---|---|
| Test runner/tooling final choice and versions (validate against the installed Next.js) | Open |
| CI host and its free allowances; Docker availability for Postgres service containers (U-09) | Open |
| Rounding policy decision (half-even vs half-up) -- affects expected fixture values | Open (decide in Phase 2 before portfolio tests are written) |
| Evidence-sufficiency thresholds (min items, recency window, relevance cutoff) | **[Accepted: TV-06 closed]** Draft values defined as configuration constants before Week 9. Provisional starting values: min evidence items = 2, recency window = 365 days, relevance score = unranked for MVP (any FTS match qualifies). These are **[Provisional]** and will be refined by the evaluation set. |
| Policy for uncited text in AI output | **[Accepted: TV-07 / DR-09 closed]** Reject the entire answer. |
| Tolerance for numeric claim verification | **[Accepted: TV-05 closed]** See section 3.3 table above. |
| Advice/prediction classifier design | **[Accepted: TV-04 closed]** Keyword/regex deny-list; not LLM-based; defined and tested before AI module builds. |
| Whether to publish an a11y gate in CI | Open (recommend adding axe checks to E2-E4 per-PR; validate tooling) |
