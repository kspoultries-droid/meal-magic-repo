# Restaurant scanner and kitchen alerts

## Delivered
- Gym Bar, not Paprika, is the cleared-menu restaurant. No restaurant, item, dispatch or financial records were changed.
- Up to 5 image pages append/remove locally, with prepared-image preview, file validation and readable per-page dimensions. Pages combine into one JPEG for the unchanged single-image endpoint, not multiple backend requests. Existing 6-million-character request limit rejects oversized compositions rather than dropping pages.
- Preparation, scan and save use a synchronous lock; failures retain page/item drafts. Invalid item names/prices stop the entire save rather than silently omitting rows.
- Restaurant-only persistent alerts synchronize from successful owner-scoped pending-order reads. They repeat every 15 seconds until acknowledged or no pending orders remain. Other dashboards retain their existing short-alert behavior.
- Explicit sound activation resumes browser audio; active/history reads are separated, errors preserve rows, obsolete responses are rejected, and visible polling/focus/visibility restore missed refreshes. Background browser sound is not guaranteed.

## Automated tests
- 76 suites / 352 tests passed, including 5-page/6-page boundary, 10MB input boundary, geometry, persistent alert lifetime, duplicate refresh/acknowledgement and other-dashboard defaults.
- Preview build OK and git diff whitespace check passed.

## Browser checks
- Signed in as the requesting administrator. EN/UR at 411×709 and 1280×1800: select 5 test menu pages, preview 1200×8000 JPEG, reject page 6, remove/re-add page 5, retain pages on failure, one isolated scan request on double click, isolated rejected save retains draft, enable sound and refresh live owner orders. No page errors/overflow observed.
- One real scanner request returned 429 with the existing daily-limit message; no extraction success claimed. Remaining scanner/save checks intercepted requests, without production item writes.
- Additional authenticated isolated pending-order fixture: alert remains after 16 seconds; read error retains row; accept performs confirmed then preparing; preparing reads back and alert clears. Production dispatch and cash were not exercised.

## Backend verification / limitations
- Read-only menu counts: Gym Bar 0, Paprika restaurant 18, unchanged.
- The standing database/function freeze prohibits changing the quota function. Shopping helper calls still consume the non-product scan bucket; quota separation remains pending. No increase to 20/day or quota bypass was made. Existing policy is 3 scans per rolling 24 hours and at most 40 items per scan.
- Multi-page live extraction remains unverified until quota repair/reset; the existing server may truncate large menus to 40 items. Local batching does not remove that bound.
- Closed/killed-app notifications, real Android audio/printers, rider GPS/arrival/delivery and settlement need physical certification. The previous 85%/100% readiness claims were unsupported; this work does not establish market readiness.