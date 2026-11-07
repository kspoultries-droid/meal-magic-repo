# Roadmap — English Mode (Phase-wise Translation)

## Current request — Ration photo orders
- [x] Repair customer approval and safe slip/revised-selection workflow; actual customer control and persisted readback checked.
- [x] Enforce one waiting list per customer and owner-scoped shop blocking; isolated database tests passed.
- [x] Capture saved address/pin, support 1–4 photos and readable enlarged viewing.
- [x] Compact desktop order grids and remembered A4/80mm system-print layouts.
- [x] Verify quote/revision/acceptance and delivery readiness with database tests and 15 unit tests.
- [ ] Physical A4/USB/Bluetooth output and supervised rider pickup/delivery — requires connected printers and a real rider/device; no direct Bluetooth driver or hardware result claimed.

## Current QA fix — Returned shop orders
- [x] Exclude returned-to-store orders from the existing active-order count; isolated database regression passes for both insert paths, 2-slot limit and same-phone cross-service counting.

## Current QA fix — Receipt after list acceptance
- [ ] Allow the shop's first receipt attachment after acceptance without changing approved amounts, versions or delivery state; verify upload and customer readback.

## Current request — Grocery and Bazar orders
- [x] Disable automatic acceptance without changing payment/cancellation rules.
- [x] Correct all-unavailable item status and verify customer/shop readback.
- [x] Add and run focused regression tests (retail/wholesale authenticated checks and 8 unit tests).

## Phase 1: Customer-facing core (this turn)
- [x] Auth.tsx (login/signup) — verified: 0 Urdu strings in EN mode
- [x] Checkout.tsx
- [x] Profile.tsx (was already bilingual)
- [x] OrderTracking.tsx (was already bilingual)
- [x] MyOrders.tsx + OrderConfirmation.tsx
- [x] Navbar.tsx + Footer.tsx + BottomTabBar.tsx

## Phase 2: Shopping pages
- [x] RestaurantDetail.tsx, CategoryPage.tsx, SearchPage.tsx, Grocery.tsx, GroceryStoreDetail.tsx, ProductDetail.tsx, Wholesale.tsx — all Urdu strings wrapped in L(en, ur); typecheck + build OK
- [x] Shared components: RestaurantGrid.tsx, RestaurantCard.tsx, LocationBar.tsx, LocationPill.tsx — verified via Playwright: 0 Urdu strings on /grocery and /search in EN mode

## Phase 3: Dashboards
- [x] All dashboards + admin/rider/support/services/vendor/media/common components — verified 0 Urdu UI text in EN mode on admin, restaurant, rider, support dashboards

## Phase 4: Remaining
- [ ] Partner.tsx, Services.tsx, Reels.tsx, Install.tsx, ResetPassword.tsx, StandaloneStore.tsx, CompanyInfo.tsx
