# Grocery onboarding — 2026-11-22

## DEVELOP NOW — delivered
- Stock → Catalog prepares up to 100 appropriate existing catalog items, excluding existing shop links/barcodes/name+unit matches. Individual shop prices remain empty, no market prices are invented. Specialist categories are respected.
- Explicit item selection, individual price/discount/stock validation, capacity of 1000, current-shop pre-save duplicate check and in-flight submission lock. No stock or zero stock on new catalog/import items means unavailable. No existing vendor rows are merged/deleted.
- Quick inventory editing now includes stock and retains unsuccessful drafts; updates additionally scope to the current store and require a returned row.
- Name/Urdu-name/brand search in the single-item form; barcode lookup reports read failures separately from not-found. Device decoding falls back to lazy-loaded ZXing, without paid recognition calls. Standard GTIN checksums are validated, internal numeric codes remain supported.
- CSV/XLSX preview requires explicit confirmation, skips repeated/new-existing rows, preserves absent update fields and shows validation errors. Decimal numbers retain their decimal point; fractional/negative stock is rejected.
- Admin catalog filters for missing barcodes, missing verified photos and similar items; supplied barcodes are validated. Photo verification tests whether the image actually loads; real packaging correctness still requires admin judgment.
- One front product photo is enough, extra images are optional, lengthy photo guidance is collapsed.

## Automated tests
- 72 suites / 329 tests passed. Includes starter limit, existing catalog identity, pack-size distinction, specialist filtering, verified image restrictions, GTIN checksum, price/discount/integer-stock rules, 1000 capacity, import duplicates, absent fields and unknown/zero stock.
- Preview build latest entry: build OK.

## Browser tests
- Authenticated requesting owner on an existing retail shop; English/Urdu × 411×709 mobile/default desktop.
- Actual catalog reads; 100-item starter selection, blocked missing prices, clearing selection, selecting one item, price 123 / stock 5, intentional isolated save failure with draft retained, retry and inventory UI readback.
- Actual XLSX parsing into preview and cancellation; CSV repeated item preview, explicit save at price 456 / stock 7 and UI readback.
- Actual name search, invalid GTIN rejection, generated EAN13 image decoded with BarcodeDetector disabled. Matching barcode result isolated because production catalog has no barcode evidence.
- Actual admin filter views and isolated broken-image verification refusal. No page runtime exceptions or horizontal page overflow in the four scenarios.
- Browser mutations generally intercepted. One early test accidentally verified existing 7Up catalog imagery; the flag was restored to false using the authorized catalog editor and read back. Its updated_at metadata changed. No shop products, catalog entries, orders, wallets or assignments were created/deleted by the tests.

## Backend verification — read only, except restored catalog verification test
- 34 shared shops = 5 retail + 29 wholesale; shared storage is intentional, not itself category leakage.
- Retail: 131 items, 8 missing product images. Wholesale: 206 items, 181 missing images. Total: 337, missing images: 189. Earlier chat totals/percentage-duplicate conclusions were incorrect.
- 355 catalog items, 355 missing barcodes, 0 verified images after restoration. Existence of an image URL does not establish correct packaging or permission to reuse it.
- Same product at different vendors and different pack sizes is not automatically a duplicate. Test businesses remain preparation data, not real trading evidence.

## EXTERNAL DEPENDENCY PENDING
- Real packaging photographs/authorized brand media and exact barcode evidence must be supplied/reviewed; no fabricated barcodes, generic-photo verification, bulk unlocking or promises of 3-second setup.
- Database-level atomic uniqueness/import and structured product-family expansion remain under the existing migration/function freeze. Client duplicate checks do not guarantee cross-device concurrency or replace server authorization.
- Physical Android camera scan and production save certification remain unverified; browser fixtures are not native hardware evidence.
- No changes to grocery local delivery, order/payment approval, courier, OTP or business ownership. The existing open phone verification security issue remains open.