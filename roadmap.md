# Roadmap — English Mode (Phase-wise Translation)

## Current request — Location privacy and shopping access
- [ ] Clear personal delivery locations and cart on logout/account switching.
- [ ] Require sign-in before adding items; resume selection and show a quiet guest reminder.
- [ ] Lock business locations for partners, preserve registration pins, and provide an admin-only relocation action.
- [ ] Run focused privacy/access tests and verify shopping and relocation flows.

## Current request — English shopping screens and home scrolling
- [x] Translate remaining food/Bazar banners, category labels and known service content without modifying vendor records.
- [x] Keep ordinary touch scrolling passive; 7 refresh tests and mobile touch scroll passed. Physical Android smoothness still needs device verification.
- [x] Check English shopping screens at mobile size and home at desktop size; no runtime errors or horizontal overflow.

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
- [x] Allow the shop's first receipt attachment after acceptance without changing approved amounts, versions or delivery state; isolated regression and authenticated shop gallery upload/customer receipt readback passed.

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

## Rider map, cards, shop accounts, banner (Nov 8)
- [x] Two-wheeler route, faster redraw from rider GPS, dashed last leg to exact pin
- [x] Lighter home banner shading
- [x] Shop accounts tab (sales, commission, received, remaining, bank accounts)
- [x] Bazar auto banner photos + name size/style/colour applied
- [ ] Battery product weight (shop owner must set real kg; Rs 80 came from 0.5 kg default)
