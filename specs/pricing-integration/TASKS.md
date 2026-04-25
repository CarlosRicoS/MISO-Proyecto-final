# Tasks: Pricing Integration — Real Prices Across Property Discovery and Booking

**Based on:** `specs/pricing-integration/PLAN.md`  
**Created:** 2026-04-24  
**Total tasks:** 9  
**Agents involved:** implementation-engineer, test-engineer, review-engineer, devops-engineer, docs-engineer

---

## Phase 4 Execution Plan

```
[1] IMPL-01 → IMPL-04   implementation-engineer (sequential: core first, then pages)
[2] TEST-01 → TEST-02   test-engineer           (after implementation)
[3] RVEW-01              review-engineer         (after tests)
[4] DEVOPS-01 + DOCS-01  devops-engineer + docs-engineer (parallel, after review)
```

---

## Task List

| ID | Agent | Description | Depends On | Status |
|---|---|---|---|---|
| IMPL-01 | implementation-engineer | Frontend core: Create `pricing.model.ts` (PricingOrchestratorResponse, re-export PropertyPriceQuery), create `pricing.service.ts` (getPropertyWithPrice → Observable), update `config.service.ts` (add pricingOrchestratorApiPath to AppConfig + getter), update `config.json` | — | ✅ done |
| IMPL-02 | implementation-engineer | Frontend listing: Update `hotels.service.ts` — inject PricingService, add `enrichWithPricing()` (forkJoin, catchError→0), add `getHotelsWithPricing()`. Update `home.page.ts` — use `getHotelsWithPricing()` in `loadHotels()` and `onSearchHotels()` | IMPL-01 | ✅ done |
| IMPL-03 | implementation-engineer | Frontend property detail: Update `propertydetail.page.ts` — add `priceForStay`, `isPricingLoading`, `pricingError`, `priceTrigger$` Subject with switchMap pipeline. Wire `onCheckInChanged`/`onCheckOutChanged`/`onGuestsChanged` to trigger pricing. Update `onBookNow()` to send `priceForStay`. Update `updatePaymentSummary()` to show PricingOrchestrator total. Update `.html` — disable Book Now until price fetched, show loading state | IMPL-01 | ✅ done |
| IMPL-04 | implementation-engineer | Frontend booking detail: Update `booking-detail.page.ts` — add `previewedNewPrice`, `isPricingLoading`, `priceTrigger$` Subject with switchMap. Wire date/guest change handlers to trigger pricing. Update `paymentSummary.totalAmount` and `summaryItems` inline when pricing resolves. Fix `onRecalculatePrice()` line 446 to send `previewedNewPrice` instead of `0` | IMPL-01 | ✅ done |
| TEST-01 | test-engineer | Unit tests: PricingService (HTTP call construction, URL from config, query params, error handling), ConfigService (new getter + default), HotelsService enrichment (forkJoin, partial failures, empty list). Target ≥80% coverage on new code | IMPL-01, IMPL-02 | ✅ done |
| TEST-02 | test-engineer | Unit tests: propertydetail.page (switchMap pricing on date change, priceForStay update, onBookNow sends real price, disabled state, error display), booking-detail.page (previewedNewPrice on date change, onRecalculatePrice sends real price, inline payment update). Target ≥80% coverage on new code | IMPL-03, IMPL-04 | ✅ done |
| RVEW-01 | review-engineer | Verify all test suites pass (`npm run lint`, Jest/Karma unit tests). Review implementation vs SPEC.md acceptance criteria (all 9 ACs). Flag doc gaps. Give APPROVED or NEEDS FIXES verdict | TEST-01, TEST-02 | ✅ done |
| DEVOPS-01 | devops-engineer | CI/CD + Terraform + Postman: (1) Create `.github/actions/test-dotnet/action.yml` composite action (setup .NET 8, restore, test with coverlet coverage). (2) Add pricing-engine + pricing-orchestator to `pr_validation.yml` test matrix (language: dotnet) and build_and_push matrix. (3) Add pricing-engine + pricing-orchestator to `deploy_apps.yml` test matrix. (4) Set `pricing-orchestator` `desired_count_tasks=1` and `min_capacity=1` in `ecs_api/terraform.tfvars`. (5) Create 4 Postman request YAML files + update `collection.yaml` | RVEW-01 | ✅ done |
| DOCS-01 | docs-engineer | Resolve SPEC.md open questions 1 + 2 (mark as resolved). Update SPEC.md status to Implemented. Update CLAUDE.md if service communication section needs pricing paths. Add JSDoc to new pricing.service.ts and pricing.model.ts | RVEW-01 | ✅ done |

---

## Acceptance Criteria Traceability

| Criterion | Implemented by | Tested by | Reviewed by |
|---|---|---|---|
| AC-1: Property listing cards show "From $X /night" from PricingOrchestrator (1 guest, 1 night) | IMPL-02 | TEST-01 | RVEW-01 |
| AC-2: Property detail booking panel auto-updates total price when both dates are set | IMPL-03 | TEST-02 | RVEW-01 |
| AC-3: "Book Now" submits PricingOrchestrator-computed total price (not 0) | IMPL-03 | TEST-02 | RVEW-01 |
| AC-4: Booking detail change-dates accordion auto-updates price inline before action | IMPL-04 | TEST-02 | RVEW-01 |
| AC-5: "Recalculate Price" submits PricingOrchestrator-computed price (not 0) | IMPL-04 | TEST-02 | RVEW-01 |
| AC-6: Error from PricingOrchestrator shows user-friendly message, blocks submission | IMPL-03, IMPL-04 | TEST-02 | RVEW-01 |
| AC-7: "Pricing Engine" Postman folder with GET /api/propertyprice and passing tests | DEVOPS-01 | DEVOPS-01 | RVEW-01 |
| AC-8: "Pricing Orchestrator" Postman folder with GET /api/property and passing tests | DEVOPS-01 | DEVOPS-01 | RVEW-01 |
| AC-9: config.service.ts exposes pricingOrchestratorApiPath (default /pricing-orchestrator/api/property) | IMPL-01 | TEST-01 | RVEW-01 |

---

## Notes

- All IMPL tasks target `user_interface` (Angular) — no backend services are affected
- IMPL-02, IMPL-03, IMPL-04 are independent of each other but all depend on IMPL-01 (core service)
- Pricing endpoints are public (no JWT) — PricingService sends no Authorization header
- The `pricing-orchestator` typo in the URL path is intentional — matches the deployed route
- **80% coverage target** applies to the new Angular code produced by this feature. The .NET pricing services have pre-existing low coverage (~1 test file each) — that's a separate concern, not gated on this feature
- **DEVOPS-01 scope expanded** to include: `test-dotnet` action creation, CI/CD workflow updates for .NET services, Terraform `pricing-orchestator` scale-up, and Postman collection — all in a single task
- `.NET test tooling`: Both test projects already have `coverlet.collector` 8.0.0 — the `test-dotnet` action should use `dotnet test --collect:"XPlat Code Coverage"` to produce Cobertura XML reports
