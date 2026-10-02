# MarketMind AI — Design and UI/UX Standards

Status: **Draft for approval** · Complements the architecture set in `docs/architecture/`:
[overview](../docs/architecture/overview.md) · [decisions](../docs/architecture/decisions.md) · [data-model](../docs/architecture/data-model.md) · [security](../docs/architecture/security.md) · [testing-strategy](../docs/architecture/testing-strategy.md) · backend companion: [backend.md](./backend.md)

> Link paths assume `doc/` and `docs/architecture/` are sibling folders under the project root. If the folders are consolidated or renamed, update the links (see "Open: documentation folder naming" in §15).

---

## 0. How to read this document

### 0.1 Status labels

| Label | Meaning |
|---|---|
| **[Approved]** | Stated by the project owner (brief or task instructions). Binding. |
| **[SoT]** | A requirement taken from the existing architecture documents, cited by section. Those documents are themselves marked *Proposed* pending review, so [SoT] means "binding for consistency", not "every open decision is closed". |
| **[Provisional]** | A sensible default proposed here so work can proceed. Reversible. **Not approved** until listed as approved in §15. |
| **[Open]** | Unresolved. No default is silently chosen; work that depends on it waits or uses the stated interim rule. |

### 0.2 What is approved (complete list)

1. **[Approved]** Tailwind CSS is the styling approach.
2. **[Approved]** No shadcn/ui or other component library may be added without approval.
3. **[Approved]** No final brand palette or visual identity has been approved. Every colour, typeface and visual-identity value below is **[Provisional]**.

Everything else is [SoT], [Provisional] or [Open].

### 0.3 Scope boundary

This document defines *standards* for building UI. It adds no pages, no components, no dependencies and no application code. It does not change the data model or architecture; where UI needs something those documents do not define, it is raised as an [Open] item rather than decided here.

---

## 1. Product design principles

These principles turn the product constraints (educational research platform; not a brokerage or adviser — [overview §1](../docs/architecture/overview.md)) into interface rules.

| # | Principle | Practical consequence |
|---|---|---|
| P1 | **Trust through transparency** | Every number that can be stale shows its **as-of date**. Provenance (source, data date) is reachable in one interaction. [SoT overview §2.7, §4 rule 3] |
| P2 | **Never fabricate or imply** | Missing data is shown as missing ("—" with explanation), never as `0`, never interpolated silently. Unpriced holdings are flagged, not valued at zero. [SoT data-model §6.3] |
| P3 | **Information, not instruction** | No buy/sell/hold language, no price targets, no urgency cues, no gamified gains. Gain/loss colours inform; they do not celebrate. [SoT security SEC-AI-06] |
| P4 | **Calm density** | Finance users scan tables and charts. Prefer compact, aligned, low-ornament layouts over decoration. Whitespace is used for grouping, not filling. |
| P5 | **Honest uncertainty** | Abstention ("I can't answer this from available evidence") is a designed, first-class outcome, not an error screen. [SoT overview §6] |
| P6 | **Degrade visibly** | Provider outages degrade freshness, not availability; the UI shows last good data with its date and a clear status. [SoT overview §7.2] |
| P7 | **Accessible by default** | Meeting the accessibility rules in §12 is part of "done", not a polish phase. |
| P8 | **Consistency over local cleverness** | One way to do each thing. A new pattern needs a reason and an entry in this document (§13). |
| P9 | **Server is the authority** | UI never hides data as a security control; it reflects what the server returned. [SoT security SEC-AUTHZ-01] |

### 1.1 Mandatory trust elements (every relevant surface)

- A persistent, non-dismissible disclaimer in the app shell footer: *educational information, not investment advice* — **wording [Open]** pending legal review (U-13).
- As-of timestamps on charts, watchlist rows, portfolio values and AI answers.
- A visible freshness state for data that can be stale (§10.5).

---

## 2. Visual identity — proposed defaults

**[Approved]** that no palette or identity is approved. The values below are **[Provisional] defaults** chosen to be neutral, legible and conventional for financial data, so UI can be built without implying a brand. Replacing them later must require changing **token values only** (§3), never feature code.

### 2.1 Identity decisions awaiting approval

| ID | Decision | Interim rule |
|---|---|---|
| UD-04 | Brand palette, logo, product name styling | Use the provisional neutral palette in §2.2; no logo (text wordmark "MarketMind AI") |
| UD-02 | Dark mode in MVP or later | Tokens are defined for both themes so either choice is cheap; implement light first |
| UD-03 | Typeface | System UI font stack (§4.1) until chosen |

### 2.2 Provisional colour tokens

Colour is expressed as **semantic tokens**, never raw values in feature code. Contrast ratios below were **computed with the WCAG 2.x relative-luminance formula** for the exact pairs shown (not estimated). Targets: normal text ≥ 4.5:1; non-text UI boundaries ≥ 3:1. All listed pairs meet them.

**Light theme (default)**

| Token | Value | Use | Contrast |
|---|---|---|---|
| `bg` | `#FFFFFF` | Page background | — |
| `surface` | `#FFFFFF` | Cards, panels (bordered) | — |
| `surface-muted` | `#F6F7F9` | Table header, zebra/hover rows, wells | — |
| `border` | `#E3E6EB` | Decorative dividers | decorative only |
| `border-strong` | `#8A93A1` | Input borders, control outlines | 3.10 on `bg` |
| `text` | `#14181F` | Primary text | 17.79 on `bg` |
| `text-muted` | `#4B5563` | Secondary text, labels | 7.56 on `bg`; 7.05 on `surface-muted` |
| `text-subtle` | `#5B6472` | Tertiary text (timestamps, hints) | 5.98 on `bg` |
| `primary` | `#1D4ED8` | Primary actions, links, focus ring | 6.70 on `bg` |
| `primary-fg` | `#FFFFFF` | Text on `primary` | 6.70 |
| `positive` / `positive-bg` | `#047857` / `#ECFDF5` | Gains, success | 5.48 on `bg`; 5.21 on tint |
| `negative` / `negative-bg` | `#B91C1C` / `#FEF2F2` | Losses, destructive, errors | 6.47 on `bg`; 5.91 on tint |
| `warning` / `warning-bg` | `#92400E` / `#FFFBEB` | Stale data, caution | 7.09 on `bg`; 6.84 on tint |
| `info` / `info-bg` | `#0369A1` / `#F0F9FF` | Neutral notices | 5.93 on `bg`; 5.57 on tint |

**Dark theme (provisional; subject to UD-02)**

| Token | Value | Contrast |
|---|---|---|
| `bg` / `surface` / `surface-muted` | `#0B0F14` / `#121821` / `#18202B` | — |
| `border` / `border-strong` | `#263041` / `#5A6578` | `border-strong` 3.26 on `bg` |
| `text` / `text-muted` | `#E6EAF0` / `#A3ADBD` | 15.92 / 8.48 on `bg`; 14.76 / 7.87 on `surface` |
| `primary` / `primary-fg` | `#60A5FA` / `#0B0F14` | 7.56 |
| `positive` / `negative` / `warning` / `info` | `#34D399` / `#F87171` / `#FBBF24` / `#38BDF8` | 10.00 / 6.95 / 11.51 / 8.97 on `bg` |

Rules:

1. **Gain/loss convention [Provisional]:** green = positive change, red = negative change. This matches common Indian market-display convention **[Assumption: confirm with target users]**. It is *never* the only signal (§12.3).
2. **Neutral by default:** a value with no direction (price level, quantity) uses `text`, not `positive`/`negative`.
3. **No data-viz colour = status colour collision:** categorical chart colours (§9.4) must not reuse `positive`/`negative` for series that are not gains/losses.
4. Colour values are verified again whenever a token value changes (re-run the contrast check; record the date in §15).

### 2.3 Shape, elevation and motion — provisional

| Property | Default |
|---|---|
| Radius | Controls `rounded-md` (6px); cards/panels `rounded-lg` (8px); pills/badges `rounded-full`. No other radii. |
| Borders | 1px solid `border` for structure; `border-strong` for interactive control outlines. Cards use a border, not a shadow. |
| Elevation | Shadows only for floating layers (menus, popovers, dialogs, toasts): one level of `shadow-md`. No decorative shadows. |
| Motion | Short (≤ 150 ms) opacity/transform transitions for hover/focus/disclosure only. Honour `prefers-reduced-motion` (§12.6). No auto-playing or looping animation. |

---

## 3. Tailwind CSS conventions and design tokens

### 3.1 Version and configuration [Open — verify before use]

Tailwind's configuration model differs between major versions (JavaScript `tailwind.config` vs. CSS-first theme configuration). The version created by the project's Next.js initialisation has **not been inspected** (repository was not accessible when this document was written). **[Open UD-07]**: confirm the installed major version, then apply §3.2 using that version's mechanism. The conventions below are written to be **version-neutral**.

### 3.2 Token architecture — [Provisional]

1. **Single source of truth:** design tokens are CSS custom properties defined once (e.g. in the global stylesheet) for `:root` (light) and the dark-theme selector.
2. **Tailwind maps to tokens:** the Tailwind theme exposes the *semantic* names (`bg`, `surface`, `text-muted`, `primary`, `positive`, …) so classes read `bg-surface text-muted border-border`.
3. **Remove or avoid the default raw palette in feature code:** feature code uses semantic colour utilities only. (Whether the raw Tailwind palette is removed from the theme or merely forbidden by review is **[Open UD-07]**.)
4. **No arbitrary values** in feature code: no `text-[#1D4ED8]`, `w-[372px]`, `mt-[13px]`. If a value is missing, add a token (via this document) rather than a one-off.
5. **No inline `style=`** except for genuinely dynamic geometry (e.g. computed chart dimensions), and then with a comment.
6. Dark mode via a class/data-attribute strategy that tokens respond to, so components contain **no `dark:` variants** for colour (tokens flip underneath). Layout-affecting `dark:` classes are not allowed.

### 3.3 Class-composition helpers — no new dependencies

Utilities such as `clsx`, `tailwind-merge`, `class-variance-authority` are **new dependencies and are not approved**. Until approved **[Open UD-07]**:

- Write a tiny local `cn(...)` helper that joins truthy class strings (own code, ~5 lines, in `components/ui`).
- Express variants as **typed lookup objects** (`const variants = { primary: '…', secondary: '…' } as const`), not nested conditionals.
- Avoid relying on class-conflict resolution: components own their classes and do not accept arbitrary overriding `className` for core visual properties (colour, padding, radius). A narrow `className` prop is allowed for **layout** (margin, width, grid placement) only.

### 3.4 Formatting and linting

- Class order: consistent grouping (layout → box → typography → colour → state). Tooling to enforce it (Prettier Tailwind plugin, ESLint Tailwind plugin) means **new dev dependencies → [Open UD-07]**. Interim: reviewer convention plus a no-dependency CI check (a small script/grep) that fails on arbitrary-value classes and hex colours in `src/` outside the token definition file.
- Components should have **at most one** long class string per element; repeated groups (≥ 3 occurrences) are extracted into a component (§13).

### 3.5 Spacing, sizing and layout scale — [Provisional]

Base unit **4px** (Tailwind default scale). Only the following steps are used in feature code:

| Purpose | Allowed utilities |
|---|---|
| Inline gaps (icon↔text, badge padding) | `1`, `1.5`, `2` |
| Control internal padding | `px-3 py-2` (default), `px-4 py-2.5` (large) |
| Stack gaps within a component | `gap-2`, `gap-3`, `gap-4` |
| Card padding | `p-4` (mobile), `p-6` (≥ `md`) |
| Gaps between cards/sections | `gap-4` (mobile), `gap-6` (≥ `md`), `gap-8` between major page sections |
| Page horizontal padding | `px-4` (mobile), `px-6` (≥ `md`), `px-8` (≥ `xl`) |
| Page max content width | `max-w-screen-xl` (provisional; tables may scroll within) |

---

## 4. Typography

### 4.1 Typeface — [Open UD-03], interim system stack

Interim: the platform UI font stack (`system-ui`, then common fallbacks). A web font may be loaded via the framework's built-in font facility (no extra dependency) once chosen **and its licence verified** **[Assumption]**. Every font declaration must have a real fallback stack.

### 4.2 Scale — [Provisional]

| Role | Size / line-height | Weight | Notes |
|---|---|---|---|
| Page title (h1) | 24/32 (≥`md`: 30/36) | 600 | One h1 per page |
| Section title (h2) | 20/28 | 600 | |
| Card title (h3) | 16/24 | 600 | |
| Body | 16/24 | 400 | Default for prose and forms |
| Dense body (tables, lists) | 14/20 | 400 | Minimum for data text |
| Caption / meta (as-of, units) | 12/16 | 400 | Never below 12px; never for essential information alone |
| Large stat value | 24/32 (≥`md`: 30/36) | 600 | tabular numerals |

- **Form inputs are ≥ 16px** (prevents mobile Safari auto-zoom on focus).
- Headings follow document order (h1→h2→h3); never skip levels for styling — style with classes instead.
- Line length for prose (AI answers, news text): 60–80 characters (`max-w-prose`).

### 4.3 Numerals — rules for financial data

1. All numeric columns, stat values and chart labels use **tabular lining figures** (`tabular-nums`) so digits align and do not jitter on update.
2. Numbers are **right-aligned** in tables; their column headers are right-aligned too.
3. Never mix ₹ symbol placement: symbol precedes the number (`₹1,23,456.78`).
4. Use the true minus sign (`−`, U+2212) for negatives, not a hyphen, and always show `+` for explicit positive changes (`+1.23%`).
5. Formatting happens **at the presentation edge only**, from Decimal/string values — never by JS float arithmetic (see [backend.md §8](./backend.md), [data-model §6](../docs/architecture/data-model.md)).

---

## 5. Page layout and navigation

### 5.1 Breakpoints — [Provisional]

Mobile-first using Tailwind's default breakpoints: `sm` 640, `md` 768, `lg` 1024, `xl` 1280. Minimum supported viewport **360px** wide **[Open UD-12]**; layouts must also reflow at 320px without horizontal page scroll (§12.5).

### 5.2 App shell — [Provisional]

| Viewport | Structure |
|---|---|
| ≥ `lg` | Fixed **top bar** (wordmark, global instrument search, freshness summary, user menu) + **left sidebar** (primary navigation) + scrollable **main** content + **footer** (disclaimer). |
| < `lg` | Top bar (wordmark, search trigger, user menu) + **bottom tab bar** with the 4–5 primary destinations; main scrolls; footer disclaimer sits above the tab bar's safe-area. |

Shell rules: one `<header>`, one `<nav aria-label="Primary">`, one `<main id="main">`, one `<footer>`; a **skip-to-content link** is the first focusable element (§12.2).

### 5.3 Primary navigation — [Provisional, UD-11]

Destinations derived from the approved MVP scope ([overview §2](../docs/architecture/overview.md)):

| Destination | MVP feature |
|---|---|
| Markets / Search | Stock search, instrument detail (chart, indicators, news & disclosures, AI explanation as tabs/sections of one instrument page) |
| Watchlists | Watchlists |
| Portfolio | Manual entry, holdings, allocation/concentration |
| Data status | Data freshness (user-facing); ingestion detail is admin-only |
| Account | Profile, sign-out (and settings as needed) |
| Admin (role-gated) | Ingestion runs, re-queue (admin only) |

URL structure, route names and page hierarchy are **[Open UD-11]** and are decided in Phase 2 with the route inventory required by the authorisation tests ([testing §5.2](../docs/architecture/testing-strategy.md)). Navigation visibility by role is a UX convenience only; the server enforces access ([security SEC-AUTHZ-01](../docs/architecture/security.md)).

### 5.4 Page anatomy

```
[Page title (h1)]  [primary page action, right-aligned]
[as-of / freshness line — if the page shows data that can be stale]
[Alert region — page-level errors/warnings]
[Content: grid of cards / table / form]
```

- Page-level actions: at most one primary button; secondary actions are visually subordinate.
- Breadcrumbs only for depth ≥ 3 (e.g. Portfolio › Holdings › Instrument).
- Instrument detail page uses **tabs** (e.g. Overview/Chart · News & disclosures · Explain) with the selected tab reflected in the URL so reloads and links work **[Provisional]**.
- Global search: pressing `/` focuses it (not while typing in an input). Shortcuts must be discoverable and must never be the only way to perform an action (§12.2).

---

## 6. Reusable components and the anti-one-off rule

### 6.1 Component inventory — [Provisional]

Built in-house with Tailwind. **No component library is added without approval** [Approved]. If a headless/accessibility-primitives library is wanted for hard widgets (dialog, combobox, tabs, menus), that is **[Open UD-05]** and requires explicit approval — and shadcn/ui, which builds on such libraries, is covered by the same rule.

| Group | Components |
|---|---|
| Primitives | `Button`, `IconButton`, `Link`, `Badge`, `Card`, `Separator`, `VisuallyHidden`, `Skeleton`, `Spinner` |
| Forms | `Field` (label + control + hint + error), `TextInput`, `DecimalInput`, `DateInput`, `Select` (native first), `Checkbox`, `RadioGroup`, `FormError` summary |
| Feedback | `Alert`, `Toast`/live-region announcer, `EmptyState`, `ErrorState`, `ConfirmDialog` |
| Navigation | `AppShell`, `SideNav`, `BottomTabs`, `Tabs`, `Pagination` |
| Finance | `Money`, `Percent`, `ChangeValue` (value + sign + icon + sr text), `AsOf`, `FreshnessBadge`, `StatCard`, `DataTable`, `AllocationBar`, `ConcentrationSummary` |
| Visualisation | `ChartFrame` (title, range selector, legend, as-of, table-view toggle, state handling) around the chosen chart rendering |
| AI | `AnswerPanel`, `Citation`, `CitationDetail`, `AbstentionNotice`, `Disclaimer` |

Native elements first: `<button>`, `<a>`, `<select>`, `<details>`, `<dialog>`, form controls. Custom ARIA widgets are built only when native elements cannot do the job, following the WAI-ARIA Authoring Practices patterns.

### 6.2 Placement — [Provisional, UD-08]

The architecture's planned layout ([overview §3.3](../docs/architecture/overview.md)) defines `src/app`, `src/modules/*`, `src/lib`. UI components are not yet placed. Proposal: `src/components/ui` (primitives), `src/components/finance`, `src/components/layout`; module-specific presentation stays beside its route or module and imports shared components. **Adding `src/components/` extends the planned layout and needs approval.** Whether the project uses a `src/` directory at all depends on the Next.js initialisation actually run **[Open]**.

### 6.3 Rules against inconsistent one-off styling

1. **Use an existing component.** If none fits, extend it with a variant; do not restyle ad hoc.
2. **Rule of three.** The third occurrence of the same class-group becomes a component.
3. **No raw colours, no arbitrary values, no ad-hoc spacing** (§3.2, §3.5).
4. **Variants are closed sets** (typed unions), documented below the component and listed here. New variant → update this document in the same PR.
5. **Feature code composes; primitives style.** Feature components do not set colours, radii, font sizes or shadows directly.
6. **States are part of the component.** A component is not complete until default, hover, focus-visible, active, disabled, and (where relevant) loading, invalid, selected and read-only are implemented (§7).
7. **Props express meaning, not appearance** (`tone="negative"`, not `className="text-red-600"`).
8. **PR checklist** (UI changes): tokens only · all states · keyboard operable · responsive at 360 and 1280 · loading/empty/error handled · accessibility checks (§12.8) · docs updated if a pattern changed.

---

## 7. Component states

### 7.1 Interactive control states

| State | Visual rule |
|---|---|
| Default | Token colours; border `border-strong` for inputs |
| Hover | Subtle background shift (`surface-muted` or darker `primary`); cursor pointer on clickable only |
| **Focus-visible** | **2px `primary` outline with 2px offset**, always visible, never removed without a replacement; contrast ≥ 3:1 against adjacent colours |
| Active/pressed | Slightly darker fill; no layout shift |
| Disabled | Reduced emphasis **and** `disabled`/`aria-disabled`; explained when non-obvious (tooltip/hint text), because disabled controls are not focusable by default |
| Loading | Control keeps its width; shows spinner + text change ("Saving…"); `aria-busy`; repeat submits blocked |
| Invalid | `negative` border + icon + message linked via `aria-describedby`; not colour-only |
| Read-only | Visibly distinct from disabled; still focusable and selectable |
| Selected | Not colour-only: check/underline/weight change plus `aria-selected`/`aria-current` |

### 7.2 Data states

Every data-bearing region implements all of: **loading · empty · error · stale · partial · populated** (§10).

---

## 8. Dashboard cards, tables and forms

### 8.1 Dashboard / stat cards

Anatomy of `StatCard` (top→bottom): **label** (`text-muted`, 14px) → **value** (large, tabular, `text`) → **change** (`ChangeValue`: sign + arrow icon + %, with accessible text) → **as-of line** (`text-subtle`, 12px) → optional help/“how calculated” disclosure.

Rules:

- A card answers **one question** and has an h3 title.
- Cards in a row share heights; content that varies in length truncates with a title tooltip *and* is available in full elsewhere.
- The as-of line is mandatory when the value derives from stored market data.
- Cards degrade independently: one card's error never blanks the dashboard (each has its own error/empty state).
- Portfolio cards reflect the approved analytics ([overview §2.6](../docs/architecture/overview.md)): allocation by instrument, top-N concentration, HHI, unrealised P&L. A concentration card explains HHI in plain language in a disclosure ("closer to 1 = more concentrated").
- Unpriced holdings produce a visible warning inside the card ("2 holdings have no price and are excluded"), consistent with [data-model §6.3](../docs/architecture/data-model.md).

### 8.2 Financial tables (`DataTable`)

| Rule | Detail |
|---|---|
| Semantics | Real `<table>`, `<caption>` (visually hidden if redundant), `<th scope="col">` / `<th scope="row">`; no layout tables, no div-grids posing as tables |
| Alignment | Text left; numbers right with tabular figures; header alignment matches column |
| Units | Stated once in the header (`Price (₹)`, `Weight (%)`); not repeated in every cell unless ambiguous |
| Precision | Fixed decimals per column type: prices 2 dp, percentages 2 dp, quantities as entered. Display precision vs stored `NUMERIC(18,4)` precision is **[Open UD-09]** |
| Negatives & change | `−` sign plus colour plus icon/arrow (§12.3); never parentheses-only |
| Missing | "—" with `title`/sr-text "No data" (never `0`, never blank); unpriced rows flagged |
| Sorting | Clickable header buttons with `aria-sort`; default sort stated; stable sort |
| Sticky | Sticky header in scroll containers; sticky first column on narrow screens |
| Density | One default density (row height ≥ 40px); no per-page density variants |
| Totals | A totals row in `<tfoot>`, visually distinct, includes as-of |
| Row actions | Max two inline; the rest in a menu; destructive actions confirm (§10.6) |
| Pagination | Server-side with enforced maximum page sizes ([security SEC-VAL-07](../docs/architecture/security.md)); show count and range |
| Large values | Indian digit grouping (lakh/crore) via locale-aware formatting (`en-IN`). Abbreviation style (e.g. "₹1.2 Cr") is **[Open UD-09]**; if abbreviated, the full value must be available (tooltip *and* accessible text) |
| Dates/times | Trade dates as `02 Oct 2026`; instants as `02 Oct 2026, 15:30 IST` (displayed in IST; stored UTC — [data-model §1](../docs/architecture/data-model.md)) |

### 8.3 Forms

- **Layout:** single column; label above control; hint below label; error below control; grouped fields in `<fieldset><legend>`.
- **Labels:** always visible, programmatically associated; placeholders are never labels.
- **Required/optional:** mark the exception (usually "(optional)").
- **Money and quantity (`DecimalInput`):** `inputMode="decimal"`, accepts digits and one decimal separator, kept as a **string** until parsed by the server's Zod schema ([security SEC-VAL-03](../docs/architecture/security.md)); no `type="number"` spinner behaviour; show the currency prefix as a non-editable adornment; client-side formatting is cosmetic and never the authority.
- **Dates:** native date input where acceptable; future trade dates blocked client-side *and* server-side.
- **Validation timing:** on blur for format, on submit for completeness; never clear user input on error; on submit failure show an **error summary** at the top (focus moves to it) with links to the fields.
- **Server errors** map from the closed taxonomy ([overview §4](../docs/architecture/overview.md)): field errors from `VALIDATION` details; domain rule errors (e.g. "Sell quantity exceeds holdings on 12 Mar") shown near the relevant field or in the summary.
- **Autocomplete attributes** on auth fields; password fields support paste/password managers.
- **Double-submit protection:** disable-on-submit plus the idempotency key mechanism where defined ([backend.md §9.4](./backend.md)).
- **Instrument picker:** accessible combobox pattern, keyboard operable, results show symbol, name, exchange; empty and error states handled. (Building a robust combobox is a reason UD-05 exists.)

---

## 9. Charts and data visualisation

**Chart library: [Open UD-01].** Choosing and installing one is a new dependency and requires approval; candidates and trade-offs (bundle size, accessibility, licence, SSR behaviour) are evaluated in Phase 2. The rules below are library-independent.

### 9.1 Chart types in scope ([overview §2.1–2.2](../docs/architecture/overview.md))

- Price history: line/area of daily close with range selector (1M · 6M · 1Y · 5Y). Candlestick/OHLC view is **[Provisional/stretch]**.
- Indicator overlays on the price pane: SMA, EMA, Bollinger Bands.
- Indicator sub-panes: RSI, MACD (histogram + lines), volume bars.
- Portfolio: allocation (horizontal bars or table-with-bars preferred over pie/donut), concentration summary.

Pie/donut charts are **discouraged**: poor for comparing many small weights; if used, ≤ 5 slices plus "Other" and always accompanied by a table.

### 9.2 Chart frame (`ChartFrame`) requirements

Every chart is wrapped in the same frame providing: title; **as-of date and data source**; range selector; indicator toggles; legend; **"View as table"** toggle; loading/empty/error/stale states; price-basis label (raw vs adjusted — depends on U-04) and units; a visible note when non-trading days are not plotted.

### 9.3 Data integrity rules

1. **No interpolation across gaps:** non-trading days and missing bars are not drawn as continuous data; gaps stay visible or are explicitly collapsed with an axis note.
2. **Indicator warm-up:** indicator values before the window is satisfied are **not plotted** (not drawn as zero) ([testing §3.3](../docs/architecture/testing-strategy.md)).
3. **Axis honesty:** price axes labelled with units; log scale only if labelled; y-axis may be non-zero-based for price but never truncated in bar charts of quantities.
4. **Precision:** chart values arrive as strings/Decimals from the server and are converted to numbers **only at this presentation edge** ([decisions D-010](../docs/architecture/decisions.md)).
5. **Stale/failing data** is flagged on the chart itself (badge + note), not only elsewhere on the page.
6. Corporate-action adjustments and their basis are labelled once adjusted series exist (U-04).

### 9.4 Colour and encoding — [Provisional]

- Categorical series use a small, colour-blind-safe set with **distinct line styles** (solid/dashed/dotted) and direct or legend labelling, so series are distinguishable without colour. Final categorical hues need approval with the brand palette (UD-04). Maximum 5 simultaneous series.
- Price line uses `primary`/`text`, not `positive`/`negative`. Up/down candles may use `positive`/`negative` **with fill vs hollow** differentiation.
- Gridlines in `border`; text in `text-muted`; ≥ 3:1 contrast for data marks against the background.

### 9.5 Interaction and accessibility

- Hover/focus crosshair tooltip showing date, OHLC (or value), volume, and indicator values; tooltips are also reachable by keyboard (arrow keys step through data points) **or** the table view provides equivalent access.
- A text summary beside every chart (range, start→end values, high/low, as-of) available to screen readers; the chart graphic itself is `role="img"` with a concise label unless fully keyboard-navigable.
- Controls (range, toggles) are standard buttons/toggles with `aria-pressed`.
- Respect `prefers-reduced-motion`; no animated chart entrances.
- Performance: avoid rendering excess points on small viewports; downsampling policy **[Open]** (must not alter high/low extremes silently).

---

## 10. Loading, empty, error, success and confirmation states

### 10.1 Loading

- Prefer **skeletons that match the final layout** (no layout shift) over spinners; spinners only for short, indeterminate button/inline actions.
- While revalidating, **keep showing the last data** with a subtle "updating" indicator rather than blanking.
- Container has `aria-busy="true"`; a polite live region announces completion only when the user initiated the action.
- Slow operations (AI answers) show staged text ("Searching evidence…") and a cancel option; there is a timeout state (§10.3).

### 10.2 Empty states

Three distinct kinds, each with its own copy and call to action:

| Kind | Example | Content |
|---|---|---|
| **First use** | No watchlists/transactions yet | What this is for + primary action |
| **No results** | Search/filter returns nothing | Echo the query, suggest broadening, clear filters action |
| **No data yet** | Instrument has no price history ingested | Explain data coverage/ingestion state with freshness status; never imply the instrument is worthless or inactive |

Empty is not an error and never uses error colours.

### 10.3 Error states

Messages are mapped from the closed taxonomy ([overview §4](../docs/architecture/overview.md)); technical detail is never shown ([security SEC-VAL-08](../docs/architecture/security.md)).

| Code | User-facing behaviour |
|---|---|
| `VALIDATION` | Field-level and summary messages; keep inputs |
| `UNAUTHENTICATED` | Redirect to sign-in preserving return destination; explain session ended |
| `FORBIDDEN` | "You don't have access to this" (only for role-gated areas); resource-ownership failures present as `NOT_FOUND` |
| `NOT_FOUND` | Generic not-found page/state; same for non-existent and non-owned ([security SEC-AUTHZ-04](../docs/architecture/security.md)) |
| `RATE_LIMITED` | State the limit was hit and **when to retry** (from `Retry-After`); disable the triggering control meanwhile |
| `UPSTREAM_UNAVAILABLE` | Explain that a dependency is unavailable; show last good data/abstention; offer retry |
| `INTERNAL` | Generic message + **request id** to quote; retry; no stack/SQL |

Error regions use `role="alert"` only for new, urgent errors; persistent page-level problems use a non-intrusive `Alert` with `role="status"` where appropriate. Retry actions are always offered when retrying is safe.

### 10.4 Success

- Inline confirmation near the action or a toast announced via a polite live region; toasts auto-dismiss only for non-critical messages and are **never the only record** of an important outcome (e.g. a saved transaction appears in the list).
- Don't use celebratory styling for financial outcomes (P3).

### 10.5 Data-freshness and ingestion status — [SoT overview §2.7]

`FreshnessBadge` presents the four states with **text + icon + colour** (not colour alone):

| State | Tone | Meaning shown to the user |
|---|---|---|
| `FRESH` | positive/neutral | "Updated {date/time}" |
| `STALE` | warning | "Last updated {date}; newer data expected" |
| `FAILING` | negative | "Updates failing since {date}; showing last good data" |
| `UNKNOWN` | neutral | "Update status unknown" |

Weekends/holidays must not show `STALE` incorrectly (depends on U-07). The admin ingestion view shows runs, outcomes, rejected-row counts and dead jobs (admin-only).

### 10.6 Confirmation and destructive actions

| Action | Pattern |
|---|---|
| Delete a transaction / watchlist / portfolio | `ConfirmDialog` naming the object and consequence ("Delete portfolio 'Long-term' and its 14 transactions?"), destructive button labelled with the verb ("Delete portfolio"), focus starts on the safe option |
| Delete account / bulk irreversible | Type-to-confirm plus re-authentication **[Provisional]** |
| Reversible edits (rename, add to watchlist) | No confirmation; offer undo where cheap |
| Leaving a dirty form | Warn before navigation away |

Dialogs: focus trapped, `Esc` closes, focus returns to the trigger, labelled by title, described by consequence text.

### 10.7 AI answer states — [SoT overview §6, data-model §4.6]

| State | UI |
|---|---|
| Loading | Staged progress; cancel |
| `ANSWERED` | `AnswerPanel`: claims with numbered `Citation` markers; each opens `CitationDetail` (verbatim quote, source, publisher, published date, link-out showing the destination domain); evidence as-of dates; standing disclaimer |
| `ABSTAINED` / `UNSUPPORTED_REQUEST` | Neutral explanation that MarketMind explains information and does not give recommendations or predictions; offer an answerable rephrasing (e.g. "What has been disclosed recently about X?") |
| `ABSTAINED` / `INSUFFICIENT_EVIDENCE` | State what was searched (instrument, date window) and the data freshness; no speculation |
| `ABSTAINED` / `CITATION_VALIDATION_FAILED` | "I couldn't verify this answer against sources, so I'm not showing it." Offer retry |
| `ABSTAINED` / `UPSTREAM_UNAVAILABLE` | Service temporarily unavailable; retry later |
| Citation to removed source | "Source no longer available" (data-model §4.6 citation hash behaviour) |
| `LINK_ONLY` source | Shown as a link with a note that text isn't stored/used |

AI output is rendered as **escaped text / a limited markdown subset**, never raw HTML, never auto-loading images ([security SEC-AI-04, SEC-EXT-07/08](../docs/architecture/security.md)). Outbound links use `rel="noopener noreferrer"`, show the domain and allow only `http(s)`.

---

## 11. Responsive behaviour

| Component | Mobile (< `lg`) | Desktop (≥ `lg`) |
|---|---|---|
| Navigation | Bottom tab bar (4–5 items), search opens as a full-width overlay | Sidebar + top bar |
| Page grid | Single column cards | 2–3 column card grid |
| `DataTable` | Horizontal scroll inside the table container with sticky first column and sticky header; **or** a card-list rendering for watchlists (row → compact card with price, change, as-of). The page itself never scrolls sideways | Full table |
| Charts | Full width; height ≥ 240px; range selector scrolls horizontally; indicator toggles in a sheet/popover; table-view available | Larger height; legend inline |
| Forms | Single column, full-width controls | Single column, constrained width (`max-w-md`/`max-w-lg`) |
| Dialogs | Full-screen/bottom sheet | Centered modal |
| Tooltips/hover | Replaced by tap-to-reveal and the table view (hover is not available) | Hover and focus |

Rules: touch targets **≥ 44×44 CSS px** on mobile **[Provisional]** (WCAG 2.2 AA requires a smaller minimum; 44px is the stricter proposed standard); respect safe-area insets; no hover-only functionality; test at 360, 768, 1280 widths and at 200% zoom.

---

## 12. Accessibility, keyboard navigation and readable financial data

Target: **WCAG 2.2 Level AA [Provisional]** — the target level has not been specified by the owner; AA is proposed as the standard baseline. **[Open UD-10]** to confirm.

### 12.1 Structure and semantics
`lang="en-IN"` on the document; landmarks (§5.2); heading hierarchy; lists as lists; real buttons vs links (navigation = link, action = button); unique, descriptive page `<title>`s; link text meaningful out of context.

### 12.2 Keyboard
- Every interactive element is reachable and operable by keyboard; tab order follows visual order; **no keyboard traps**.
- Skip-to-content link is the first tab stop.
- Visible focus (§7.1) on every focusable element.
- Menus/tabs/comboboxes follow WAI-ARIA Authoring Practices key bindings (arrows, Home/End, Esc).
- Single-key shortcuts (`/` for search) are **opt-out-able or only active when no input is focused**, documented in a help dialog, and never the sole path.
- Dialogs trap and restore focus; route changes move focus to the new `h1` or main region.

### 12.3 Readable financial data and colour independence
- **Never colour alone:** gain/loss is shown with sign (`+`/`−`), an arrow/triangle icon, and colour; chart series by line style and labels; status by text + icon.
- Screen-reader text for visual shorthand: `▲ +1.23%` is announced "up 1.23 percent" (visually-hidden text or `aria-label`); `₹1.2 Cr` is exposable as the full value.
- Table cells expose units via headers; "—" has an accessible "no data" equivalent.
- As-of dates are text, not tooltip-only.
- Avoid dense unlabelled numbers; each metric has a label and a way to learn its definition.

### 12.4 Forms
Visible labels; `aria-describedby` for hints/errors; `aria-invalid` on invalid fields; error summary with focus management; autocomplete tokens; `inputMode` for numeric entry; no placeholder-only labels; errors are specific and actionable.

### 12.5 Zoom, reflow and text
Content reflows at 320 CSS px (no 2-D scroll except data tables/charts inside their own scroll containers); text resizable to 200% without loss; no fixed pixel heights that clip text; respect user font-size settings (rem-based sizing).

### 12.6 Motion and media
`prefers-reduced-motion` disables non-essential transitions; no auto-playing content; no flashing.

### 12.7 Dynamic content
Live regions (`role="status"`/`aria-live="polite"`) for async results and toasts; `role="alert"` reserved for urgent errors; loading regions use `aria-busy`.

### 12.8 Verification
Per [testing §7](../docs/architecture/testing-strategy.md) the E2E suite includes automated accessibility checks on the key pages (tooling **[Open — validate]**). Manual checklist per UI PR: keyboard-only pass, zoom 200%, screen-reader smoke test on the new component, contrast check for any new token.

---

## 13. Pattern governance

- This document is the registry: new component, variant, token, or interaction pattern → add it here **in the same change**.
- Tokens are changed only in the token source (§3.2). A token value change triggers: contrast re-check, visual review of all `StatCard`, `DataTable`, `ChartFrame`, `Alert` states, and an entry in §15.
- Deprecations are noted with the replacement and removal target.
- No design deviation ships without either an approved entry here or an explicit, time-boxed exception recorded in the PR.

---

## 14. Alignment with the architecture documents

| This document's area | Source of truth |
|---|---|
| MVP features reflected in navigation/components | [overview §2](../docs/architecture/overview.md) |
| Error taxonomy mapping, as-of metadata in responses | [overview §4, §7](../docs/architecture/overview.md) |
| Freshness states | [overview §2.7, §5](../docs/architecture/overview.md), [data-model §4.2](../docs/architecture/data-model.md) (`DataFreshness`) |
| AI answer/abstention UI | [overview §6](../docs/architecture/overview.md), [data-model §4.6](../docs/architecture/data-model.md), [security §8.3](../docs/architecture/security.md) |
| Safe rendering of external content | [security §8](../docs/architecture/security.md) |
| Decimal/format rules | [data-model §6](../docs/architecture/data-model.md), [decisions D-010](../docs/architecture/decisions.md) |
| Accessibility testing | [testing-strategy §7, §10](../docs/architecture/testing-strategy.md) |
| No component library / chart library without approval | Approved here; dependency register in [backend.md §16](./backend.md) |

---

## 15. Approval register

### 15.1 Open decisions (UI)

| ID | Decision | Interim rule | Needed by |
|---|---|---|---|
| UD-01 | Chart library (and rendering approach) | None installed; build `ChartFrame` contract first | Before charts milestone |
| UD-02 | Dark mode in MVP? | Tokens defined for both; implement light | Before shell build |
| UD-03 | Typeface | System stack | Before visual polish |
| UD-04 | Brand palette/logo/identity (all §2 values) | Provisional neutral defaults | Before public launch |
| UD-05 | Headless accessibility primitives (dialog, combobox, tabs, menu) vs in-house | In-house with native elements | Before first dialog/combobox |
| UD-06 | Icon approach (no icon library approved) | Small local SVG components for the few icons needed (arrows, check, alert, chevron, search) | Before first icon use |
| UD-07 | Tailwind major version/config mechanism; class helpers; Prettier/ESLint Tailwind plugins | Version-neutral conventions; local `cn()`; CI script check | After inspecting the Next.js init |
| UD-08 | Component folder placement (`src/components/*`) | Proposal in §6.2 | Before first component |
| UD-09 | Large-number abbreviation (L/Cr) and displayed decimal precision | Full values, 2 dp prices/percents | Before tables milestone |
| UD-10 | Accessibility target level | WCAG 2.2 AA | Before shell build |
| UD-11 | Route/URL structure and page hierarchy | Provisional navigation in §5.3 | Phase 2 route inventory |
| UD-12 | Minimum supported viewport | 360px (reflow-safe to 320px) | Before shell build |
| UD-13 | Disclaimer wording | Placeholder text, legal review pending (U-13) | Before public launch |
| — | Documentation folder naming: `doc/` (this task) vs `docs/` (architecture docs) | Keep both as instructed; links use relative `../docs/architecture/` | On review |

### 15.2 Provisional choices summary
Colour/shape/motion defaults (§2), spacing and type scales (§3.5, §4.2), app shell and navigation (§5), component inventory (§6.1), table/form/chart conventions (§8–9), responsive rules (§11), AA target (§12).

### 15.3 Approval log
| Date | Item | Approved by | Notes |
|---|---|---|---|
| — | Tailwind CSS as styling approach | Project owner | Stated in task instructions |
| — | No component library without approval | Project owner | Stated in task instructions |
| — | Contrast values computed for provisional tokens (initial) | — | Re-run on any token change |
