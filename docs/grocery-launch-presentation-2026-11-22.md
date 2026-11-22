# Grocery launch presentation

## Scope
- Existing businesses are test/launch templates. No records, prices, names, owners, locations, ratings or history changed; no new stores created.
- Missing/broken photos use existing category assets labelled “Category photo”. Original working vendor photography remains primary. Representative photos are not persisted to catalog/cart or claimed to be actual products.
- Category selection now loads products without requiring prior search; category, reach and store filters apply to deals, top sellers and product results.
- Discovery product reads are scoped to eligible shop IDs and category/search before a 120-row bound. The existing store read remains capped at 200, promotions at 2000 and top-seller RPC at 12; this is not unlimited catalog pagination or a completed scale redesign.
- Preserve each shop's item ID, size and price instead of choosing a globally cheapest name match. Top sellers hydrate current authorized product rows while preserving RPC order.
- In-flow ration/help/share controls replace overlapping floating controls on grocery home only. Ration shortcut opens eligible active shops, then the existing shop orders tab and photo form.
- Desktop shop list uses two columns; category headings and arrows respect language direction.

## Automated tests
- 313 tests across 70 files passed, including 3 focused discovery regressions; existing test warnings remain non-failing.
- Latest supervised preview build: OK; diff whitespace check passed.

## Browser verification
- Real authenticated managed account; English/Urdu at 411×709 and 1440×1000.
- Category before search populates actual items; Atta aliases applied in network reads, unrelated ghee disappears, Flowers hides unrelated promotion rails.
- Real Desi product search → authorized product details → grocery quick add → cart readback of Desi ghee at Rs 2750 passed.
- Original alnoor mart photo loaded; representative images labelled; home help/share not floating.
- Ration shortcut → Saving Point → orders tab → actual camera/gallery form with location passed. No ration submitted.
- AI helper opened in signed-in state without invoking paid/generated search.
- No page exceptions or horizontal document overflow in any scenario. Screenshots inspected for Urdu mobile home, cart and ration form.

## Backend verification and remaining limitations
- Used existing authorized reads and existing forms only. No SQL, functions, ownership, dispatch, financial or order mutations.
- Ownership transfer is not implemented in this UI task. Before assigning a test template to a genuine partner, validate ownership, original media, stock/prices/pin and separation of test order/settlement history through a supported authorized server action; renaming alone does not perform a safe transfer.
- Native Android and actual printer/camera/share handoff are not certified by these browser checks.
- No invented free delivery, verified timing guarantee, customer reviews or sales badges added.