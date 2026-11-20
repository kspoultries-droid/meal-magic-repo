# Phase 1 rollback backup (2026-11-20)
- frontend_commit.txt: git commit before Phase 1 (restore code with `git restore --source=<commit> <path>`)
- create_shop_order.sql, shop_delivery_quote.sql, guard_business_location.sql: exact prior DB function definitions (re-run to roll back)
- policies.txt: RLS policies of profiles, grocery_cart_orders, grocery_stores, cities
- config.toml: function configuration
