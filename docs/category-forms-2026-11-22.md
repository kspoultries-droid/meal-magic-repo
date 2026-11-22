# Category-aware product forms — 2026-11-22

## Problem
Every product asked the same questions. Kids joggers showed "Power (e.g. 400W)" and
"Warranty", and the variant dialog asked for suit type and fabric for shoes. The
"1 piece available" badge on Bazar cards also read as "only 1 left".

## Change
- `src/lib/categoryProfile.ts` — one predicate `categoryProfile(category)` returns the
  profile (shoes / clothes / tech / cosmetics / hardware / auto / simple) with:
  dialog wording + icon, fitting size presets, category questions, edit-form extra rows,
  and whether sizes/colours or electronics specs apply.
- `src/components/grocery/VariantMatrixEditor.tsx` — dialog icon/label and section
  questions now come from the profile; shoes get shoe type, gender and material chips;
  clothes keep suit type + fabric; tech keeps power/warranty; cosmetics get volume +
  skin type; hardware gets gauge; auto parts get vehicle/model.
- `src/pages/GroceryStoreDetail.tsx` — the inline edit form shows only the category's
  own fields (shoes: shoe type + material; electronics: power + warranty; etc.).
- `src/components/grocery/StoreBanner.tsx` — add-product form gates now use the profile
  (`hasSizes` / `isTech`) instead of two exact category names.
- `src/components/wholesale/BazarProductCard.tsx` — the "1 piece available" badge is
  removed; only a real vendor minimum ("Min X pcs") is shown.

## Storage
All answers stay in the existing `grocery_products.specs` JSON object — no schema or
migration change. Legacy keys (e.g. plain "مواد") are replaced by the shared key
"مواد / میٹیریل" on save.

## Verified
- 345 tests pass (13 new in `src/lib/categoryProfile.test.ts`); typecheck clean; build OK.
- Browser (mobile, signed-in test user): Bazar shows no "1 piece available"; the shoe
  edit form shows only name, brand, model, shoe type, material, stock (no power/warranty);
  the shoe variant dialog offers Pakistani/UK, EU and kids shoe lists plus shoe type /
  gender / material — no suit type or fabric.
