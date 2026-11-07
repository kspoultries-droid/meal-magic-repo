# Roadmap — English Mode (Phase-wise Translation)

## Current request — Grocery and Bazar orders
- [ ] Disable automatic acceptance without changing payment/cancellation rules.
- [ ] Correct all-unavailable item status and verify customer/shop readback.
- [ ] Add and run focused regression tests.

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
