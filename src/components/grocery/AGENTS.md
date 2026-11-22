# Grocery photo orders
- Starter packs prepare existing catalog drafts without prices; photo verification stays admin-authoritative, and shop-scoped duplicate checks never merge different pack sizes or vendor rows.
- Bulk imports preview before writing, preserve absent update fields and failed drafts, and recheck current shop rows; client checks supplement rather than replace database authorization and product caps.
- Grocery discovery uses only eligible shops and matching categories; representative photos are labelled, presentation-only, and never overwrite vendor media or become catalog/cart evidence.
- Ration discovery selects a shop before opening the existing order form; this preserves shop-specific approval and location rules.
- Ration-list quotations and decisions use row-locked authorized actions with quote versions; slip-only drafts carry no payable total, revisions reset it, and readiness requires final acceptance and both pins.
- After acceptance, the shop may attach a missing receipt through the same action, never replace an existing approved receipt or change financial/delivery snapshots; this keeps post-packing evidence available without revising approval.
- Print through the device's system printer with a shop/device-scoped paper preference; USB/Bluetooth labels describe paper layout, not a direct hardware connection.- Store/restaurant banners: set once via BannerPicker with owner confirmation; no change buttons over public banners.
