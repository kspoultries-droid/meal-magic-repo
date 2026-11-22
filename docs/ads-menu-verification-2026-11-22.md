# Ads and Urdu menu — 2026-11-22

## Delivered
- Collision-aware mobile menu portal with keyboard/outside dismissal, proper RTL direction and bounded width; no clipping beneath page stacking contexts.
- Three ad stages: business/item, creative/offer, placement. Existing authorized reads populate restaurant menus, grocery/Bazar inventory and services, including images, price, business name and canonical destination.
- Restaurant dishes open their restaurant menu; grocery items open their product page; shops use their shared detail page; services open the existing Services page (there is no individual service-detail route).
- Image preparation produces a 1200×600 centered creative, normally WebP; PNG fallback follows the actual encoder type. JPG/PNG/WebP inputs only, with an explicit oversized/unsupported-file error.
- Mandatory image, verification of the stored image before record save, visible errors, save lock, retained drafts and reuse of uploaded assets on record-save retries.
- Original image fallback when an image-transform URL fails, in both PromotionalAds and FoodHero. Existing business photos and other carousel visuals were not changed.
- Discount badge is floored from the old/new price pair; it is ad presentation, not a new checkout discount or payment rule. Existing package/payment controls remain under optional details.

## Automated tests
- 69 suites, 310 tests passed.
- New coverage: discount arithmetic, invalid discounts, safe link forms, unsupported/oversized images, image-load failures, mandatory-image gate and no insert after upload/readability failures.
- Latest automatic build: OK. No remaining type errors; diff whitespace check passed.

## Authenticated browser checks
- English/Urdu at 411×709 and 1440×1000: actual Kffc/menu selection, store/inventory selection, service selection, auto-filled values/links, discount preview, empty-search state and bounded dialog layout. No page exceptions or document horizontal overflow.
- Mobile role menu remained inside the viewport at document top and after scrolling, and Escape closed it.
- Real disposable ad saved through the existing authorized app at a future date so it was never eligible for public display. Real image upload, subsequent list thumbnail and edit readback verified saved URL, price, discount and restaurant link.
- Intercepted upload failure blocked record creation and preserved the draft. Intercepted subsequent record failure preserved the already uploaded URL; retry made no second upload and successfully saved the record.
- The real saved record was shown through an isolated browser-only eligibility response to verify carousel image rendering and actual ad-click navigation to Kffc. This is not a claim that a publicly eligible paid campaign was published. Tracking RPCs for this isolated view were intercepted to avoid artificial analytics.
- Test record and test image deleted through authorized app/storage actions; a final cleanup read found 0 remaining disposable QA records.

## Backend / limitations
- Existing authorized table/storage actions used; no SQL, migration, function, role or policy changes and no order/payment/dispatch mutations.
- Previously saved ads with a null image cannot recover an image that was never uploaded; editing requires selecting the image again or choosing an existing business/item photo.
- Existing placement/payment eligibility remains unchanged, including FoodHero's paid-ad requirement. Native Android picker/device behavior has not been tested on physical hardware.