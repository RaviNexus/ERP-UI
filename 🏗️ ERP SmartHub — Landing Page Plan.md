# 🧑‍💻 TECH-STACK (Aligned to ADR 0001)

* Runtime: Node.js 24 LTS (24.14.x); containerized (Docker) on Kubernetes; horizontal pod autoscaling; use distroless images for smaller surface area.
* Backend: NestJS 11.1.x + TypeScript 5.9.x (opinionated modules, DI, validation, Swagger built-in).
* API style: REST for CRUD + async jobs; GraphQL only where client aggregation is heavy (dashboards) to keep coupling low.
* Database: PostgreSQL 18.x (JSONB for flexible attributes, strong ACID, mature indexing, partitioning for ledgers); use read replicas for analytics; pgAudit for DB auditing.
* Cache/locks: Redis 8.2.x (rate limiting, session store, distributed locks for stock reservation/idempotency keys).
* Messaging: Apache Kafka 4.2.x with outbox pattern from Postgres for reliable event emission (JE/stock/report fan-out).
* Search: OpenSearch/Elasticsearch for product and transaction search; keep PII minimal in the index.
* File storage: S3-compatible bucket for documents and images with presigned URLs.
* Frontend: React 19.2.x + TypeScript + Vite 7.3.x; component lib like Mantine or Chakra; TanStack Query for data fetching; form validation via Zod; Storybook for UI system.
* Mobile/responsive: Responsive web only (per ADR); use responsive grid (Tailwind/Mantine) and reuse validation schemas between FE/BE with Zod.
* AuthN/Z: OAuth2/OIDC + JWT access tokens, short-lived; refresh tokens in httpOnly secure cookies; 2FA via TOTP; RBAC mapped to permissions table.
* Security defaults: TLS everywhere, CSP headers, Helmet, rate limiting via Redis, per-tenant row-level security (Postgres RLS) on critical tables, secrets in Vault/SSM, image scanning (Trivy/Grype) in CI.
* Observability: OpenTelemetry tracing; Prometheus + Grafana; structured JSON logs (pino) shipped to ELK/CloudWatch; alerting on SLOs (p99 latency, JE balance failures).
* CI/CD: GitHub Actions (lint/test/build/scan); automated migrations gated by staging; blue/green or canary deploys; contract tests for APIs.
* Testing: Unit (Jest), integration with Testcontainers Postgres/Redis, consumer-driven contract tests (Pact) for dependent clients; load tests (k6) on core flows (SO->Delivery->Invoice).
* Upgradeability: Monorepo (pnpm) with shared types; codegen for OpenAPI -> typed clients; feature flags via ConfigCat/LaunchDarkly; DB migrations versioned; clear domain modules (Auth, Inventory, Sales, Purchase, Finance) to reduce coupling.
# ðŸ¥‡ ADR 0001- Platform & Framework Baseline

# **ADR 0001 ï¿½ Platform & Framework Baseline**

* Status: Accepted  
* Date: 2026-03-16

## **Decision**

Adopt the following stack as the frozen baseline for ERP development (responsive web only):

* Runtime: Node.js 24 LTS (24.14.x)  
* Backend: NestJS 11.1.x with TypeScript, REST-first (GraphQL only for aggregation-heavy dashboards)  
* Frontend: React 19.2.x with Vite 7.3.x, TypeScript, responsive web (no React Native)  
* Language toolchain: TypeScript 5.9.x initially; move to 6.0 GA once it ships stable  
* Database: PostgreSQL 18.3  
* Cache/locks: Redis 8.2.x  
* Messaging: Apache Kafka 4.2.x with outbox pattern from Postgres  
* Search: OpenSearch/Elasticsearch (managed), minimal PII indexing  
* Object storage: S3-compatible for media/docs  
* Observability: OpenTelemetry \+ Prometheus/Grafana; structured logs (pino) to ELK/CloudWatch  
* Security: TLS everywhere, Helmet/CSP, Redis-backed rate limiting, Postgres RLS for tenant isolation, secrets in Vault/SSM, image scanning in CI

## **Rationale**

* Long support windows (Node 24 LTS, Postgres 18\) reduce forced upgrades in the next 24ï¿½36 months.  
* NestJS provides opinionated modules, DI, validation, and Swagger generation, improving delivery speed and consistency.  
* React 19 \+ Vite 7 offer mature SSR/SPA ergonomics and fast DX; responsive layouts satisfy mobile without a separate stack.  
* Event-driven core (Kafka \+ outbox) decouples transactional flows (SO?Delivery?Invoice, GRN?Bill) from reporting and notifications.  
* Postgres 18 brings mature partitioning and JSONB; strong ACID needed for inventory/ledger integrity.

## **Consequences**

* Pin exact versions in package manifests/locks; allow only patch updates unless an ADR approves minor/major moves.  
* Require Node \=24 in CI; fail builds on older runtimes.  
* Keep Postgres at 18.x until 19 stabilizes; enable minor auto-updates.  
* Enforce idempotency keys and optimistic locking in service code; treat Kafka as async side-channel, not source of truth.  
* Responsive UI is mandatory; no budget allotted for native mobile until revisited by ADR.

# ðŸ¥ˆ ADR 0002-Dependency Versioning & Update Policy

# **ADR 0002 ï¿½ Dependency Versioning & Update Policy**

* Status: Accepted  
* Date: 2026-03-16

## **Decision**

* Pin all runtime and library versions (semver exact) in lockfiles.  
* Allow automatic patch updates only; minors/majors require a new ADR or explicit approval.  
* Monthly Renovate job (or equivalent) opens patch PRs; security advisories trigger hotfix PRs immediately.  
* CI enforces Node \>=24 and TypeScript 5.9.x until 6.0 GA is declared stable and adopted.  
* Database stays on PostgreSQL 18.x; minors auto-applied after staging verification; no major upgrade before Q1 2027 unless security demands.

## **Rationale**

* ERP needs stability for financial correctness; uncontrolled version drift risks breaking accounting flows.  
* Patch cadence keeps security fixes flowing without frequent refactors.  
* Guardrails in CI reduce ï¿½works on my machineï¿½ drift and ensure deterministic builds.

## **Consequences**

* Slightly slower access to new features; mitigated by scheduled ADRs when value is clear.  
* Requires disciplined release process (staging \+ canary) before applying DB minors.  
* More initial work to maintain pin lists, but predictable rollbacks when incidents occur.

# âž• Setup commands (run from repo root)

Setup commands (run from repo root)

* npm install \-g pnpm@9 (only if pnpm is not installed).  
* pnpm install (installs backend/frontend/shared deps with the pinned versions).  
* pnpm \--filter erp-backend start:dev (Nest dev server on 3000).  
* pnpm \--filter erp-frontend dev (Vite dev server on 5173).

Setup commands to run

1. Install pnpm (if needed): npm install \-g pnpm@9.  
2. Bring up infra: docker compose up \-d (creates Postgres/Redis/Kafka).  
3. Install deps: pnpm install.  
4. Copy envs: cp backend/.env.example backend/.env and cp frontend/.env.example frontend/.env (adjust if ports differ).  
5. Start backend: pnpm \--filter erp-backend start:dev (Nest on 3000).  
6. Start frontend: pnpm \--filter erp-frontend dev (Vite on 5173).


## ALL-INDUSTRY MVP GAPS + PHASED ROADMAP (ADDENDUM)

### A) Core ERP Gaps to Close (All-Industry)
- Fixed assets + depreciation schedules
- Inventory valuation method selection (FIFO / Weighted Avg / Standard)
- Stock adjustments, cycle counts, and audit-ready inventory corrections
- Approval workflows (PO, expenses, journal entries, payroll)
- Period-end close workflow (locks, approvals, adjustments)
- Multi-currency and exchange rate management
- Master data governance (UoM, tax codes, numbering series, locations)

### B) SaaS Platform Gaps (Core)
- SSO (SAML/OIDC) + enforced MFA policies
- API keys, webhooks, and a sandbox environment for integrations
- Usage metering + overage rules (users, storage, API calls)
- Tenant self-serve data export and retention controls
- Immutable audit log with admin activity trail

### C) Ops & Compliance Gaps (Core)
- Backup/restore policy with RPO/RTO targets
- Disaster recovery runbook + restore drills
- Security/compliance roadmap (SOC2/ISO/GDPR/DPDP)

### D) Consistency Fix (Applied)
- Tech Stack section aligned with ADR 0001 (Node 24 LTS / Postgres 18.x)

### E) Phased Roadmap (All-Industry)
#### Phase 0: Foundation
- Multi-tenant core, RBAC, audit logs, settings
- Localization: currency, tax rules, fiscal years
- Chart of accounts templates per region
- Basic approval workflow engine

#### Phase 1: Core Business
- CRM, Sales, Purchase, Basic Inventory, Finance, HR (core)
- Period-end close + trial balance accuracy
- Standard financial reports (P&L, Balance Sheet, Cash Flow)

#### Phase 2: Advanced
- Fixed assets + depreciation
- Budgeting, multi-entity consolidation, intercompany
- Project accounting + billing
- Advanced inventory (lot/serial, cycle counts)

#### Phase 3: Industry Packs (Optional)
- Manufacturing: BOM, MRP, WIP, routing
- Retail: POS, promotions, returns
- Services: timesheets, utilization, retainer billing
- Healthcare/Education/Hospitality/Logistics: compliance add-ons

### F) MVP Checklist (Prioritized)
| Priority | Capability |
| --- | --- |
| P0 (Must) | Multi-tenant core, RBAC, audit logs, tenant settings |
| P0 (Must) | Company setup + Chart of Accounts + tax config + numbering series |
| P0 (Must) | CRM basics + Sales order to Invoice + Payments |
| P0 (Must) | Purchase order to GRN to Vendor bill |
| P0 (Must) | Inventory basics + stock adjustments |
| P0 (Must) | Finance core (Journal, Ledger, Trial Balance, P&L, Balance Sheet) |
| P0 (Must) | Basic approvals for PO/expenses/journal |
| P0 (Must) | Billing + trial + usage limits |
| P0 (Must) | Backups + basic DR plan |
| P1 (Should) | Fixed assets + depreciation |
| P1 (Should) | Period-end close workflow (locks/approvals) |
| P1 (Should) | Multi-currency |
| P1 (Should) | SSO + enforced MFA |
| P1 (Should) | API keys + webhooks + sandbox |
| P1 (Should) | HR & Payroll full |
| P2 (Could) | Project accounting + billing |
| P2 (Could) | Advanced inventory (lot/serial, cycle counts) |
| P2 (Could) | Industry packs (manufacturing/retail/services) |
| P2 (Could) | Multi-entity consolidation |

### G) Delivery Timeline (Estimates)
Assumptions: 6-8 engineers, 1 QA, 1 PM/BA, 1 UX; parallel workstreams; existing infra in place.
- Phase 0 (Foundation): 4-6 weeks
- Phase 1 (Core Business): 10-14 weeks
- Phase 2 (Advanced): 12-16 weeks
- Phase 3 (Industry Packs): 6-10 weeks per pack
- Core MVP (Phase 0 + Phase 1): ~4-5 months total

### H) Industry Packs (Expanded: Pages + Key Flows)
#### Manufacturing Pack
- Pages: BOM, Routing, Work Centers, MRP, Production Planning, Work Orders, Material Issue/Return, WIP Tracking, Quality Control, Scrap/Rework, Production Costing, Finished Goods Receipt.
- Key flows: Sales forecast or order -> MRP -> Work Order -> Issue Materials -> Production -> QC -> Finished Goods -> Costing -> Delivery/Invoice.

#### Retail Pack
- Pages: POS, Price Books, Promotions, Loyalty, Returns/Exchanges, Gift Cards, Store Transfers, Shift Closing, Cash Management, Stock Count.
- Key flows: POS sale -> Payment -> Inventory decrement -> Ledger update; Return -> Restock -> Refund/Credit.

#### Services Pack
- Pages: Timesheets, Resource Scheduling, Project Budgets, Retainers, Milestone Billing, Expense Reimbursement, SLA Tracking, Utilization, Revenue Recognition.
- Key flows: Project setup -> Time/Expense entry -> Approval -> Billing -> Revenue recognition.

#### Logistics Pack
- Pages: Consignments, Fleet/Driver, Route Planning, POD, Freight Billing, Warehouse Ops, Delivery Exceptions.
- Key flows: Order -> Dispatch -> In-transit -> POD -> Invoice -> Settlement.

#### Healthcare/Education/Hospitality Add-ons
- Pages: Compliance forms, specialized masters, role templates, domain-specific reports.
- Key flows: Tenant setup -> Compliance configuration -> Operational workflows -> Reporting.


