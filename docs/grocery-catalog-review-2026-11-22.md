# Remaining grocery onboarding — 2026-11-22

## Delivered
- Admin catalog editor decodes a supplied barcode photograph locally, with portable ZXing fallback. Decoding does not upload that photograph or automatically save/verify a product.
- Barcode checksum and other-item conflicts checked before saving; repeat current authorized barcode read before writing. Database uniqueness remains authoritative; no concurrency guarantee added.
- Save and next advances through the selected review queue only after save returns a row. Failed drafts remain open. Upload/scan/save lock prevents overlapping edits.
- All matching loaded records are available in 50-row pages rather than a hidden 300-row display cutoff. Read errors preserve existing rows and expose retry. Initial load remains capped at 5000; this is not unlimited server pagination.
- Urdu/English direction follows language. No catalog/shop records, ownership, prices, orders, dispatch, finances or server functions changed.

## Automated tests
73 suites, 332 tests passed. Added concrete barcode conflict, checksum/no-invention and sequential review tests. Existing grocery onboarding, import, cart and permissions regressions passed.

## Browser tests
Authenticated requesting admin; English/Urdu on desktop and 411×709 mobile, 4 successful scenarios. Authorized production reads returned 355 catalog entries. Pagination 1–50 and 51–100 checked.

A synthetic EAN fixture was decoded with BarcodeDetector disabled. Invalid checksum rejected before writes. Simulated failure retained the draft; retry saved and advanced to the next real catalog row, and reopening through search read back the isolated barcode. Verification remained false. Every write intercepted; no production catalog mutation. No page exceptions or horizontal overflow. Screenshots inspected.

Latest build log: build OK. A pre-existing runtime telemetry parse error for ProductQuickFill was checked against the fresh browser: module loads successfully; current full tests/build pass.

## Evidence sources — researched, not imported
Recommended: capture actual Pakistani packaging once (front and barcode side) through partners/team, or obtain authorized brand/distributor files for the exact pack. Review the central catalog once; shops reuse approved media without repeated photography. Loose/unbranded products need real representative product photography, not invented GTINs.

- GS1 Pakistan offers product photography: https://www.gs1pk.org/product-photography
- Verified by GS1 can support brand-owner identity checks; it does not establish unrestricted media reuse: https://mail.gs1pk.org/verified-by-gs1.html
- Open Food Facts has ODbL/DbCL data and CC BY-SA images. Its documentation specifies attribution/share-alike and warns about combined databases. Do not silently merge it into the proprietary shared catalog or auto-verify its packaging: https://pf-en.openfoodfacts.org/data and https://support.openfoodfacts.org/help/en-gb/12-api-data-reuse/94-are-there-conditions-to-use-the-api

No paid service, API dependency, scraping pipeline, licensed-media import or generated packaging was activated. These sources establish possible approaches, not verified coverage of the existing 355 products.

## Pending and blockers
- Real pack-specific photos/barcodes: actual supplied or rights-cleared evidence required. No chosen source or physical inventory available in the sandbox.
- Atomic multi-device duplicate prevention and product-family schema: standing database/function freeze; no alternative SQL route used.
- Android physical camera and actual production save certification: device/real evidence required. Browser-isolated checks do not certify hardware or real publication.