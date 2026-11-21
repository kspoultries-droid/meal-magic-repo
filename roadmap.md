# Roadmap — English Mode (Phase-wise Translation)

## Current request — Operations safety and usability
- [x] Replace food receipt popups with closable in-app previews, including automatic acceptance previews; browser system printing only.
- [x] Remove restaurant-owner hard-delete control and request path; preserve existing open/close settings.
- [x] Compact food orders into responsive desktop columns; expose cancellation dialog and truthful delivery restrictions without changing server rules.
- [ ] Verify automated tests and signed-in browser receipt/order controls and review all Operations tabs.
- [ ] Native Android printer integration / physical Back verification — requires a native integration and device; receipt view no longer attempts a popup print.
- [ ] Safe rider unassign/reassign and deletion protection at server level — blocked by standing database/function freeze and unavailable supported lifecycle action; no bypass or live order mutation.

## Current request — Low-cost rider navigation
- [x] Add API-key-free Google Maps directions to the authorized pickup/customer destination; retain in-app tracking and refresh the active order on return.
- [x] Run 291 automated regressions including stage/pin/navigation URL rules; signed-in mobile rider page checked without overflow. Session had no active order, so live navigation controls and native handoff/back navigation remain unverified. See docs/rider-navigation-2026-11-21.md.
- [ ] Verify active-order Google Maps handoff and return on Android hardware; requires an assigned order and physical device, no simulated success claimed.
- [ ] Change internal cycling routing profile only after the standing server-function freeze is lifted; car routing is not motorcycle-specific and does not guarantee main-road routes.

## Current request — Bright food photography
- [x] Replace 3 built-in rotating food visuals and 12 category photos with cohesive bright studio photography; preserve paid advertisements and restaurant photos.
- [x] Verify 15 images, 3 slide controls, all 12 category destinations and search/clear in 4 EN/UR mobile/desktop browser scenarios; 285 automated tests passed, build OK, no database changes. See docs/food-photography-2026-11-21.md.

## Current request — Safe migration-history recovery
- [x] Retry supported history inspection and compare repository metadata with read-only applied-history records; findings saved in docs/migration-history-audit-2026-11-21.md.
- [ ] Restore history through a verified supported repair plan — blocked because the inspection tool returns `too many migration revisions to establish a unique applied history` without a plan ID. Requires platform history-inspection repair; no manual journal, snapshot or database-history rewrite.

## Current request — Streamlined food and rider workflow
- [x] Combine restaurant accept/start preparation into one recoverable action; replace Send with explicit food-ready confirmation.
- [x] Add deliberate swipe confirmation for rider pickup/completion while retaining authorized arrival and cash checks.
- [x] Run 285 automated regressions, signed-in real-page reads and 4 isolated authenticated EN/UR mobile/desktop action/readback checks; no live orders, payments or dispatch writes. See docs/streamlined-food-workflow-2026-11-20.md.
- [ ] Atomic server actions / removal of remaining readiness dependencies blocked by the migration-tool failure and standing database freeze.

## Current request — Bake House food-only cleanup
- [x] Improve the existing food menu add/edit form for bakery sizes, categories and safe saves; preserve custom categories and normal restaurant options.
- [x] Run 273 automated regression tests and 4 isolated authenticated EN/UR mobile/desktop browser add/edit/readback checks with extra sizes/toppings and invalid-price rejection; no live orders or data writes.
- [x] Under the user's narrow freeze exception, suspend grocery Bake House without deletion; verify inactive state, preserved 5 products and unchanged order counts, run 273 regression tests and inspect the real public mobile detail page. See docs/bake-house-safe-suspension-2026-11-20.md.
- [ ] Food Bake House activation and unrelated-menu replacement remain blocked on safe ownership resolution and separate authorization; grocery suspension does not migrate products or hide the historical closed-store page.
- [x] Report backend read-only findings, physical delivery limits and the open phone security issue separately in docs/bake-house-food-readiness-2026-11-20.md.

## Current step — Safe dispatch interface (frontend only)
- [x] Separate persisted courier orders from local rider controls in admin dispatch; no delivery mode conversion, rates or database changes.
- [x] Make the existing manual CN dialog bilingual and truthful about pending API booking; preserve server authorization and snapshots.
- [x] Run 260 automated tests and authenticated live empty-list plus isolated EN/UR mobile/desktop save/readback browser checks; read-only backend verification and provider/hardware limits reported in docs/safe-dispatch-ui-2026-11-20.md. Phone security remains open.
- [ ] Later phases remain required: verified serviceability/rates, courier/OTP/payment architecture and activation, city settings and settlement; backend writes are blocked by the standing database freeze.

## Current request — Alfalah and nationwide launch audit
- [x] Align Alfalah test city with its existing Khairpur pin through the authorized audited relocation action; enable nationwide test shipping and set shop advance to 0.
- [x] Exercise temporary-customer checkout, actual order creation, confirmation, tracking and authorized cancellation for explicit Khairpur/RYK destinations; verify payment cancellation and run 40 delivery/cart tests.
- [x] Reproduce mismatched destination city/address and writable phone_verified; report courier booking, rates/routes, city settings, payment/OTP and launch-readiness gaps in docs/delivery-payment-otp-audit-2026-11-20.md. This request audits other gaps; it does not implement those redesigns.
- [ ] Provider/hardware end-to-end certification — requires courier/payment/SMS account configuration and actual parcels, bank remittances and Android/rider devices; source/database/browser checks are not that certification.

## Current QA sweep — Floating shopping controls
- [x] Reproduce and separate AI helper from grocery/Bazar cart; 18 cart tests and authenticated mobile/desktop EN/UR cart readback passed.
- [x] Read route registration, restaurant/product/standalone cart actions, drawer/menu overlays, navigation, sharing, APK notices and checkout/confirmation controls; no server-side layout path exists.
- [x] Separate share from AI, put Android install prompt in document flow, and move transient notifications above shopping controls.
- [x] Verified 18 assistant routes at 3 mobile/desktop EN/UR configurations, 8 hidden routes, Android download target/dismissal, share invocation, navigation hit targets, food variant add/immediate cart/readback and retail/wholesale populated/empty carts; 20 cart tests passed. Native hardware and actual APK/WhatsApp handoff were not tested; no orders or settled records changed.

## Current QA fix — Cart selection
- [x] Align floating/product checkout with selected lines, clear stale exclusions and provide empty-selection recovery; 7 regression tests and authenticated checkout/Buy now readback passed (no order placed).
- [x] Read all cart consumers (food, grocery, Bazar, standalone store, product, drawer, floating bar, suggestions, reorder, login recovery and navigation) plus current order/quote functions and courier jobs. Fixed restaurant selection badge and explicit plus-button reselect; 17 tests and authenticated food variant checkout passed. No order submitted; simple-food branch had no live fixture and was code-reviewed only.

## Current request — Bazar promotional cards
- [x] Prepare original-framing compressed uploads, retain successful uploads on save failure and expose real errors; authenticated 3600×2000 image upload/save/readback passed.
- [x] Remove automatic placeholder slides; display only complete eligible saved cards and suppress broken images.
- [x] Simplify product/shop selection, automatic details and dates; preserve existing payment state without a misleading payment toggle. 7 regression tests, actual product/shop clickthrough, mobile no-overflow and test-card deletion passed.

## Current fix — Admin reel upload
- [x] Remove upsert, use unique account-scoped paths, and report real upload errors.
- [x] 4 upload tests passed; authenticated admin upload/publish/readback and video HTTP 200 verified; disposable test reel and file removed.

## Current request — Location privacy and shopping access
- [x] Clear personal delivery locations and cart on logout/account switching.
- [x] Require sign-in before adding items; resume selection and show a quiet guest reminder.
- [x] Lock business locations for partners, preserve registration pins, and provide an admin-only relocation action; requests reuse the existing support queue.
- [x] 10 privacy/cart tests and isolated database regressions passed; authenticated cart continuation, logout, mobile reminder and admin unchanged-location save/readback verified.

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
