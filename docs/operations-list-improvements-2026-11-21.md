# Essential Operations improvements

## Developed now
- Food orders: status/date/search restrictions run before a 20-row server range with exact result count, stable ID ordering and pagination. Search covers displayed UUID prefixes, receiver name/phone and authorized restaurant/customer matches.
- Grocery dispatch: separate cart/list controls avoid merging arbitrary truncated lists; each service has its own server-filtered bounded pages. Existing delivery interfaces, offers, readiness, fees and courier evidence remain unchanged.
- Photo orders: server status/date/search filtering and pagination; removed misleading statistics calculated from only the latest truncated rows. Selected order details refresh without closing the dialog.
- Audit: server order-prefix/tracking/service/date filtering and older-history pagination. Calendar boundaries and timestamps use Karachi days and Western digits.
- Background refresh keeps food expansion, grocery fee drafts and courier dialogs. Rider monitoring does not poll while a verification dialog or submission is active.
- Query failures display an error while retaining previously successful rows; request sequencing prevents obsolete responses overwriting newer filters.

## Automated tests
- 301 tests across 67 files passed, including 5 focused operations range/date/search tests.
- Preview build OK; no manual build or typecheck run.

## Browser verification
- Authenticated primary owner's actual admin screen, not signed-out/demo state.
- All 6 Operations tabs checked at 411×709 and 1440×1000 in Urdu and English: 24 page checks.
- Real Kffc order search readback, expanded detail retained after refresh, absent-search empty states, inclusive same-day date queries, clear-date actions, separate grocery list selection and audit page 2 passed.
- Network requests confirmed 20-row ranges and server date restrictions for orders, both grocery order tables and order_events.
- No page exceptions, horizontal document overflow or order/dispatch/finance writes during checks.

## Backend verification and limitations
- Existing authorized reads succeeded through the real account. No database/schema/function/RLS changes.
- Linked name searches use up to 200 matching authorized IDs; this is not an unlimited nationwide entity-search implementation. Photo shop names still use the existing authorized store read.
- Existing rider/profile/offer lookup limits and courier-sync queue limits are not redesigned in this request; pagination is for the primary operational order/history lists.
- Native printing, real-phone Back and rider lifecycle changes remain separate blocked items. Safe unassign/reassign, server deletion protection and server-side notification changes still require lifting the standing database/function freeze.