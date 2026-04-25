# Feature: Pricing Integration — Real Prices Across Property Discovery and Booking

**Status:** Draft  
**Created:** 2026-04-24  
**Author:** Angel Henao  
**Slug:** `pricing-integration`

---

## Summary

Wire the Angular frontend to call PricingOrchestrator (`GET /api/property`) at every price-visible touchpoint — the property listing, the property detail booking panel, and the change-dates flow — so that users see real computed prices instead of $0 everywhere. Also document PricingEngine and PricingOrchestrator in the Postman collection.

---

## Problem Statement

PricingEngine and PricingOrchestrator are deployed and working, but the frontend never calls them. Three specific gaps exist today:

- **Property listing (home page):** `HotelsService` calls `poc-properties /filterproperties` which returns no pricing data. All cards show "From $0 /night".
- **Property detail page:** `nightlyPrice` is read from the hotel list state, which is already 0. Changing dates/guests does not trigger a pricing call, so "Book Now" always submits `price: 0` to booking-orchestrator.
- **Change-dates flow (booking detail page):** `onRecalculatePrice()` hardcodes `new_price: 0` in the `PATCH /api/reservations/{id}/dates` request body. The "Dates Updated. Price difference: $0." toast confirms the bug.

Success = all three touchpoints show prices fetched live from PricingOrchestrator.

---

## Acceptance Criteria

1. [ ] Property listing cards show "From $X /night" where X is the price returned by PricingOrchestrator for 1 guest, 1 night (dateInit = tomorrow, dateFinish = day-after-tomorrow) for each property.
2. [ ] When a user selects both check-in and check-out dates on the property detail page, the booking panel automatically updates to show the total price returned by PricingOrchestrator for those dates and the entered guest count.
3. [ ] "Book Now" on the property detail page submits the PricingOrchestrator-computed total price (not 0) to booking-orchestrator.
4. [ ] On the booking detail page (CONFIRMED reservation), when the user changes dates in the "Change Dates" accordion, the payment summary panel automatically updates to show the new price from PricingOrchestrator inline — before the user clicks the action button.
5. [ ] Clicking "Recalculate Price" / the action button on the booking detail page submits the PricingOrchestrator-computed price (not 0) to booking-orchestrator `PATCH /api/reservations/{id}/dates`.
6. [ ] If PricingOrchestrator returns an error (non-2xx), the booking panel / change-dates panel shows a user-friendly error message and does not proceed to create/update the booking.
7. [ ] A "Pricing Engine" Postman folder exists with a `GET /api/propertyprice` request and passing tests.
8. [ ] A "Pricing Orchestrator" Postman folder exists with a `GET /api/property` request and passing tests.
9. [ ] `config.service.ts` exposes a `pricingOrchestratorApiPath` key (default `/pricing-orchestrator/api/property`).

---

## Affected Services

| Service | Language | Changes | Notes |
|---|---|---|---|
| `user_interface` | Angular 20 / Ionic 8 / TypeScript | New `PricingService`; update `ConfigService`, `HotelsService`, `propertydetail.page`, `booking-detail.page` | See details below |
| Postman collection | YAML git-local | 2 new folders (Pricing Engine, Pricing Orchestrator) | No backend changes |

---

## API Contracts

### Existing Endpoints (used, not modified)

#### `GET /pricing-orchestrator/api/property`

**Service:** `PricingOrchestator` (.NET)  
**Auth:** JWT required (API Gateway injects `X-User-Id`)  
**Description:** Fetches property details from poc-properties and computes total stay price from PricingEngine in parallel. Returns combined object.

**Query parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `propertyId` | `Guid` | Yes | Property UUID |
| `guests` | `int` | Yes | Number of guests |
| `dateInit` | `DateTime` | Yes | Check-in date (ISO 8601, e.g. `2026-05-01`) |
| `dateFinish` | `DateTime` | Yes | Check-out date (ISO 8601) |
| `discountCode` | `string` | No | Optional promo code |

**Response (200):**
```json
{
  "id": "uuid",
  "name": "string",
  "maxCapacity": 4,
  "description": "string",
  "urlBucketPhotos": "string",
  "checkInTime": "14:00:00",
  "checkOutTime": "12:00:00",
  "adminGroupId": "string",
  "price": 350.00
}
```
> `price` is the **total** for the requested stay (sum of nightly prices with rules applied), not a per-night figure.

**Error responses:**
- `400` — missing/invalid query params (FluentValidation)
- `502` — upstream poc-properties or PricingEngine returned non-2xx

#### `GET /pricing-engine/api/propertyprice`

**Service:** `PricingEngine` (.NET)  
**Auth:** JWT required  
**Description:** Computes total stay price for a property, applying pricing rules and optional discount code.

**Query parameters:** same shape as above (`propertyId`, `guests`, `dateInit`, `dateFinish`, `discountCode`).

**Response (200):**
```json
{
  "id": "uuid",
  "price": 350.00
}
```

---

## Frontend Changes — Detail

### New: `core/services/pricing.service.ts`

Wraps `GET /pricing-orchestrator/api/property`. Exposes:

```typescript
getPropertyWithPrice(
  propertyId: string,
  guests: number,
  dateInit: string,   // ISO 8601: "2026-05-01"
  dateFinish: string, // ISO 8601: "2026-05-02"
  accessToken?: string,
  discountCode?: string,
): Observable<PricingOrchestratorResponse>
```

Returns an `Observable` so callers can cancel with `takeUntil` / `switchMap` on rapid date changes.

### Updated: `core/services/config.service.ts`

Add `pricingOrchestratorApiPath` to `AppConfig` interface and `ConfigService`:
- Default: `/pricing-orchestrator/api/property`
- Read from `/assets/config.json` on startup

### Updated: `core/models/pricing.model.ts` (new file)

```typescript
export interface PricingOrchestratorResponse {
  id: string;
  name: string;
  maxCapacity: number;
  description: string;
  urlBucketPhotos: string;
  checkInTime: string;
  checkOutTime: string;
  adminGroupId: string;
  price: number;  // total for the requested date range
}
```

### Updated: `core/services/hotels.service.ts`

After fetching the property list from poc-properties, enrich each property with a base nightly price by calling `PricingService` in parallel (one call per property, `forkJoin`). Default parameters: `guests=1`, `dateInit=tomorrow`, `dateFinish=day-after-tomorrow`. If any individual pricing call fails, that property's price falls back to 0 (non-blocking).

### Updated: `pages/propertydetail/propertydetail.page.ts`

- Track a `priceForStay` state variable (total price from PricingOrchestrator).
- When **both** `checkInValue` and `checkOutValue` are set (via `onCheckInChanged` / `onCheckOutChanged` / `onGuestsChanged`), fire `PricingService.getPropertyWithPrice()` using `switchMap` to cancel stale calls. Update the payment summary total with the returned price.
- In `onBookNow()`, send `price: this.priceForStay` (instead of `this.nightlyPrice`).
- Show a loading indicator in the booking panel while pricing is in flight.

### Updated: `pages/booking-detail/booking-detail.page.ts`

- Track `previewedNewPrice: number` (0 before any recalculation).
- In the Change Dates accordion: when `onCheckInChanged` / `onCheckOutChanged` is called and both dates are set, auto-call `PricingService.getPropertyWithPrice()` for the current property using `switchMap`. Update the payment summary `totalAmount` inline with the returned price.
- In `onRecalculatePrice()`: use `previewedNewPrice` (from PricingOrchestrator) as `new_price` — no longer hardcoded 0.

---

## Cross-Service Communication

```mermaid
sequenceDiagram
    participant FE as user_interface
    participant APIGW as API Gateway
    participant PO as PricingOrchestrator
    participant PE as PricingEngine
    participant PROP as poc_properties
    participant BO as booking_orchestrator

    note over FE: Property listing load
    FE->>APIGW: GET /pricing-orchestrator/api/property?... (×N, parallel)
    APIGW->>PO: GET /api/property?...
    PO->>PROP: GET /api/property/{id}
    PO->>PE: GET /api/propertyprice?...
    PO-->>APIGW: { id, name, price }
    APIGW-->>FE: property + price

    note over FE: Book Now (property detail)
    FE->>APIGW: GET /pricing-orchestrator/api/property?... (on date change)
    APIGW-->>FE: { price: totalForStay }
    FE->>APIGW: POST /booking-orchestrator/api/reservations { price: totalForStay }
    APIGW->>BO: POST /api/reservations

    note over FE: Change dates (booking detail)
    FE->>APIGW: GET /pricing-orchestrator/api/property?... (on date select)
    APIGW-->>FE: { price: newTotal }
    FE: shows new price inline
    FE->>APIGW: PATCH /booking-orchestrator/api/reservations/{id}/dates { new_price: newTotal }
    APIGW->>BO: PATCH /api/reservations/{id}/dates
```

---

## Data Model Changes

None. All changes are in the frontend and Postman documentation.

---

## Out of Scope

- Any changes to PricingEngine, PricingOrchestrator, or booking_orchestrator backend code.
- Discount code UI on the property listing or detail pages.
- Multi-currency conversion (currency symbol already comes from `hotel.currency`).
- Caching or batching pricing calls at the API Gateway level.
- The `search-results` page (pricing enrichment can be added in a follow-up).

---

## Open Questions

| # | Question | Resolution |
|---|---|---|
| 1 | Should the listing page show "$0" or "Prices from —" while pricing calls are in flight? | Pending — assume show a loading shimmer or keep $0 until resolved |
| 2 | For the property detail page, if dates are not yet selected, should "Book Now" be disabled or still allow submitting with price=0? | Pending — assume disable "Book Now" until a valid price is fetched |
| 3 | The PricingOrchestrator requires a JWT token — does the listing page (accessible to unauthenticated users) need a fallback? | **Resolved** — PricingEngine and PricingOrchestrator are public endpoints (no JWT required). All users get real prices on every page. |

---

## Notes

- `PricingOrchestrator`'s `price` field is the **total** for the full stay, not per-night. For the listing page "From $X/night", we call with `dateInit=tomorrow, dateFinish=tomorrow+1` (1 night) so that `price == per-night price`.
- The `PATCH /api/reservations/{id}/dates` endpoint in booking-orchestrator already accepts `new_price` in its request body — no backend change needed.
- PricingOrchestrator reads `PROPERTIES_ENGINE_URL` and `PRICING_SERVICE_URL` from environment — these are already wired via SSM in the ECS stack.
