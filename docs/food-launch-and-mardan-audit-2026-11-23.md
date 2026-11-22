# Food launch polish and Mardan Kirana operating audit

## Delivered
- Food restaurant cards keep navigation separate from quick-order/add controls. Removed the wrapper click that opened details when pressing Quick order. Image and title remain accessible menu links; nested buttons removed.
- Starting prices include persisted positive base/variant prices and tolerate malformed JSON; these values are presentation, not checkout authority.
- Built-in slides describe biryani, karahi and barbecue with matching destinations; removed unsupported first-order free-delivery, daily deals and 30-minute guarantees. Paid ads/restaurant records unchanged; home ads without an image are not rendered.
- Compact working search form, calmer card/category presentation, reduced-motion-aware interaction-stopping carousel, consistent semantic surfaces, nonfloating food help/share, and clearer rating/delivery metadata.
- Shared menu sheet and checkout suggestions have bilingual labels, named quantity controls, larger touch targets and wrapping submit text. Suggestions are labelled Add to your order, not a claimed analytics-derived frequently-bought group.
- Detailed Urdu operating/financial advisory delivered separately in Files: ration-quotation-first for a busy wholesaler, optional small physically reserved online catalog, no claim of automatic counter-stock sync or quote expiry.

## Automated tests
- 77 suites / 356 tests passed. New focused tests cover cheaper variant price, zero placeholder, missing/invalid prices and malformed variant JSON.

## Authenticated browser checks
- Requesting administrator; EN/UR at 411×823 touch/mobile and 1280×1800 desktop, reduced-motion preference enabled.
- Home renders; no nested buttons/page overflow; search Paprika returns one restaurant; search submit/clear, Rs.500 filter and clear, biryani navigation work.
- Live Paprika Quick order stays on home; Add opens live choices; selecting the existing Chicken Burger option adds to cart. Cart displays the restaurant and checkout reads back Chicken Burger and Rs190 size price. No order submitted.
- Grocery ration shortcut opens in all 4 scenarios, but the current saved location yields no eligible shop in that dialog; this was an empty-state check, not verification of shop selection or ration submission. No ration upload/submit, customer approval or physical pickup/delivery exercised in this turn.
- No page errors. Browser sessions restore their initial account-scoped local cart. No production menu/order/payment/dispatch writes.
- Screenshots reviewed for mobile/desktop EN/UR home, mobile cart/checkout and ration selection.

## Read-only backend audit
- Read current list_order_action, create_shop_order, delivery_dispatch_ready and grocery inventory triggers. List quote/accept/revise/ready checks use row locking, quote versions, positive amount/weight, delivery quoting and pins. Accepted financial snapshots/receipt restrictions remain unchanged.
- List quotes use notes/slip evidence rather than structured per-item inventory reservations; no automatic counter/POS sync or quote expiry was verified. Existing shop/customer list limits and read-error/resume weaknesses are documented, not silently called complete.
- No SQL/RLS/function changes or freeze bypass. Migration history and edge-function deployment are distinct; the standing freeze prohibits both alternative mutation routes, not a claim that every edge-function edit needs SQL.

## Pending, not verified
- Scanner quota separation, atomic food acceptance and safe rider lifecycle actions await the standing database/function freeze being lifted.
- Free-delivery activation requires exact eligible restaurants/area/duration/funding and authorized financial snapshots; no fee/rider-pay changes made.
- Closed-app alerts, actual Android GPS/maps/printing and supervised real order-to-delivery/settlement require physical pilot evidence. Frontend tests are not market certification. Gym Bar/Paprika menus untouched.
