# Menu Variants & Flavors System

## Problem
ابھی menu item کے ساتھ صرف ایک price ہے۔ "مٹن 1kg" اور "مٹن آدھا kg" کے لیے الگ item بنانا پڑتا ہے، اور "ہری مرچ / لال مرچ / مکس" جیسے flavors کا کوئی intake نہیں۔

## Solution (Foodpanda-style, minimum complexity)

ہر menu item کے ساتھ دو optional چیزیں:

1. **Variants** (ایک لازمی انتخاب — size/weight)
   Example: `1 kg` = 2500, `آدھا kg` = 1300, `پاؤ (250g)` = 700
   - Radio selection، ایک لازم
   - Variant منتخب کرتے ہی base price replace ہوتا ہے

2. **Option groups** (0 یا زیادہ — flavors/extras)
   Example گروپ "مرچ" (single choice): ہری مرچ / لال مرچ / مکس / بغیر مرچ (سب +0)
   Example گروپ "ایکسٹرا" (multi choice): رائتہ +80، نان +30
   - ہر گروپ کا نام + `min/max` choices + choices list (name, price_delta)

Owner جہاں item add/edit کرتا ہے وہاں دو نئے sections add کریں۔ Customer کے سامنے item کھلنے پر ایک bottom-sheet آئے جس میں variant + groups + quantity + "Add to cart Rs XXX" ہو۔

## Data model

بغیر migration کے JSON columns میں store کرتے ہیں تاکہ کم سے کم schema disruption ہو:

- `menu_items.variants jsonb` — `[{id, label, price}]` (nullable — اگر خالی تو صرف base price)
- `menu_items.option_groups jsonb` — `[{id, name, min, max, choices:[{id, label, price_delta}]}]`
- `order_items.variant_label text` — snapshot (e.g. "آدھا kg")
- `order_items.options jsonb` — snapshot `[{group, choice, price_delta}]`
- `order_items.unit_price numeric` — final unit price (variant + options delta)

Server-side `create_order` RPC کو update کریں تاکہ:
- ہر cart item کے ساتھ آنے والا variant_id + option choice ids کو DB سے validate کرے (price server سے re-compute)
- `order_items` میں snapshot لکھے

Cart context (`CartContext`) میں item کی identity `menu_item_id + variant_id + sorted(option_ids)` بنے تاکہ ایک ہی dish کے دو مختلف combinations الگ lines بنیں۔

## Files to change

Frontend
- `src/pages/RestaurantOwnerDashboard.tsx` — item dialog میں "Variants" اور "Option groups" editors (add/remove rows)
- `src/pages/RestaurantDetail.tsx` — item پر click → نیا `MenuItemSheet` کھلے
- `src/components/menu/MenuItemSheet.tsx` (نیا) — variant radio + option groups (radio/checkbox) + qty + total
- `src/contexts/CartContext.tsx` — line identity، unit_price، variant/options snapshot
- `src/components/CartDrawer.tsx` — line کے نیچے variant + selected options دکھائیں
- `src/pages/Checkout.tsx` — RPC کو variant_id + option_ids بھیجیں

Backend
- Migration: `menu_items` میں دو jsonb columns، `order_items` میں variant_label/options/unit_price
- `create_order` RPC اپڈیٹ: server-side variant/option validation + total recompute
- `RestaurantOwnerDashboard` اور Support dashboards میں display update (variant + options nazar aayen)

## Out of scope
- Variant-per-image
- Stock/inventory per variant
- Time-based pricing

## Migration نوٹ
یہ change purani menu items کو نہیں توڑے گا: `variants` NULL/empty ہو تو item صرف base price سے چلے گا (backward compatible)۔

## Confirm before building
1. کیا "variant لازمی" رکھنا ہے جب owner نے variants define کیے ہوں، یا "کوئی نہیں / base" بھی option رہے؟
2. Option groups میں کیا price_delta منفی بھی ہو سکتا ہے (e.g. "بغیر نان −30")، یا صرف 0 یا +؟
3. Grocery items کے لیے بھی یہی چاہیے، یا صرف restaurant menu کے لیے؟