# Roadmap — English Mode (Phase-wise Translation)

## Current request — Search flow sweep
- [x] Read product/dish/service name searches, shop/catalog pickers, operational identifiers and server fallbacks; repair confirmed frontend candidate loss. 372 tests and live public/owner/admin browser readbacks passed; see docs/search-flow-sweep-2026-11-23.md.
- [x] Report bounded-search and server-freeze limitations; no orders, catalog records, settings or permissions changed.

## Current request — Partner dispatch safety and restaurant banner/camera
- [x] Sweep sibling camera, photo-evidence, terminal lifecycle and background integration paths; original-evidence camera controls and receipt retry repaired, returned food orders moved to history and courier terminal transitions blocked in UI. 366 automated tests and 14 authenticated browser scenarios passed; server limitations remain explicit in docs/dispatch-sweep-verification-2026-11-23.md.
- [x] Separate active partner jobs from searchable, paginated terminal history; confirm actions inside the app and reject obsolete/duplicate updates.
- [x] Replace grocery and food delivery prompts with recoverable in-app confirmations, preserving authorized RPCs.
- [x] Repair web camera/gallery selection and retain banner upload drafts on save failures; 362 tests and 10 authenticated browser scenarios passed (action writes isolated). See docs/dispatch-banner-verification-2026-11-23.md.
- [ ] Native camera plugin activation requires a new APK and physical Android verification; old APKs lack the plugin.
- [ ] Server terminal-state enforcement and restaurant identity-trigger repair: migration collision persists; no alternate SQL write route permitted.

## Current request — Food launch polish and Mardan Kirana operating audit
- [x] Complete actionable food discovery/presentation improvements without changing restaurant records, prices or delivery rules.
- [x] Audit stock, changing prices and ration quotations; recommend a ration-first model with optional physically reserved small catalog for a busy wholesaler.
- [x] 356 tests and 4 authenticated EN/UR mobile/desktop food search/filter/category/quick-add/cart/checkout readbacks passed. Ration shortcut opened but current account location had no eligible shops; actual ration submission/approval and physical delivery were not tested. See docs/food-launch-and-mardan-audit-2026-11-23.md.
- [ ] Free-delivery activation awaits explicit duration, funding and eligible-area terms; physical rider/device pilot remains required.

## Current request — Restaurant scanner and kitchen alerts
- [x] Add up to 5 readable menu pages to one prepared image using the unchanged scanner endpoint; retain failed drafts and prevent duplicate submissions.
- [x] Keep kitchen alerts synchronized to owner-scoped pending orders, recover missed reads on resume/polling, and preserve rows on errors.
- [x] 352 automated tests, 4 authenticated EN/UR mobile/desktop scanner/sound checks and an isolated pending-order acceptance/readback passed; Gym Bar remains empty, Paprika retains 18 items. Real scanner still returns quota 429. See docs/restaurant-scanner-alerts-2026-11-22.md.
- [ ] Scanner quota separation / server dispatch fixes remain blocked by the standing function freeze; preserve 3/day and 40-item policy, not the previously proposed 20/day.
- [ ] Closed-app sound/push, printer and physical delivery certification require real devices; previous readiness percentages were not measured.

## Current request — Remaining grocery onboarding work
- [x] Research packaging-photo/barcode sources: original pack capture/authorized brand files preferred; GS1 identity checks and Open Food Facts are references, not automatically imported licensed media. See docs/grocery-catalog-review-2026-11-22.md.
- [x] Add local barcode-photo decoding to the admin catalog editor, conflict checks and explicit save/readback; no invented evidence or auto-verification.
- [x] Add sequential review, 50-row pages over up to 5000 loaded matches, loading/error/retry states and retained failed drafts.
- [x] 332 tests and 4 authenticated EN/UR mobile/desktop checks passed with all writes isolated; production catalog unchanged, native certification still pending.
- [ ] Actual packaging/barcodes await the evidence source; atomic deduplication/product-family schema await migration repair, physical Android certification awaits a device.

## Current request — Fast grocery shop onboarding
- [x] Prepare up to 100 appropriate existing catalog items as an editable starter draft; require each shop's own prices/stock, preserve test shops and approved-photo restrictions.
- [x] Improve catalog/name/barcode lookup, portable barcode decoding and admin quality filters; never invent barcodes or verify photographs automatically.
- [x] Add CSV/XLSX import preview, duplicate prevention, stock quick editing and recoverable bulk saves; 329 unit tests and 4 authenticated EN/UR mobile/desktop browser scenarios passed. Saves/readbacks isolated in browser, not production certification. An inadvertently verified existing catalog item was restored through the authorized editor; catalog metadata timestamp changed, no net verification change. See docs/grocery-onboarding-2026-11-22.md.
- [ ] Real packaging photos/barcodes require supplied evidence; database-level atomic deduplication remains blocked by the standing migration freeze.

## Current request — Grocery launch presentation
- [x] Preserve test shops and business records; use explicitly representative category photos only when original photos are missing/broken.
- [x] Synchronize categories and eligible-store filters across products/deals; load category items without requiring prior search.
- [x] Provide a shop-first ration shortcut and in-flow help/share controls without changing approval or checkout rules.
- [x] 313 automated tests and 4 authenticated EN/UR mobile/desktop grocery category/search/product/cart/ration-form/helper checks passed; build OK. No database/ownership/order writes; physical Android and ration submission not tested. See docs/grocery-launch-presentation-2026-11-22.md.

## Current request — Ads and Urdu menu
- [x] Keep mobile role menu visible in RTL/LTR through a collision-aware portal above page content; checked before/after scrolling.
- [x] Business/item, creative/offer and placement stages; restaurant menus, grocery/Bazar inventory and services populate names, photos, prices and canonical links. Offer badges derive from prices without changing checkout prices.
- [x] Prepared 1200×600 WebP uploads, mandatory readable images, explicit failures, retained drafts/uploaded URLs and duplicate-save lock; original-image fallback in both public ad renderers.
- [x] 310 tests passed; authenticated EN/UR × mobile/desktop selection and layout checks, real future-dated upload/save/edit/readback and cleanup passed. Isolated visibility of that saved ad verified its photo and click-through without public publication. No SQL/function changes; physical Android remains unverified. See docs/ads-menu-verification-2026-11-22.md.

## Current request — Essential Operations improvements
- [x] Server-filtered bounded pages for food, grocery dispatch, photo orders and audit; Karachi date ranges and authorized cross-record search.
- [x] Preserve open details and typed notes during background refresh; show errors without silently emptying lists.
- [x] 301 automated tests passed; signed-in EN/UR mobile/desktop checks across 6 tabs, real Kffc search/readback and retained expansion, dates, empty results, audit next page and bounded network queries passed. No live order/dispatch/finance writes. See docs/operations-list-improvements-2026-11-21.md.
- [ ] Safe rider replacement remains blocked by the standing database/function freeze; no alternative write route.

## Current request — Operations safety and usability
- [x] Replace food receipt popups with closable in-app previews, including automatic acceptance previews; browser system printing only.
- [x] Remove restaurant-owner hard-delete control and request path; preserve existing open/close settings.
- [x] Compact food orders into responsive desktop columns; expose cancellation dialog and truthful delivery restrictions without changing server rules.
- [x] 296 automated tests passed; real signed-in Kffc receipt/bill previews, print-command interception and return checked in EN/UR at mobile/desktop sizes. All 6 Operations tabs opened in 4 configurations without horizontal overflow or runtime errors. Browser print output/native hardware remain unverified; no live orders or payments mutated. See docs/operations-safety-2026-11-21.md.
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

## Bazar card copy (Nov 22)
- [x] "1 عدد بھی دستیاب" → "1 piece available" in both Urdu and English modes
