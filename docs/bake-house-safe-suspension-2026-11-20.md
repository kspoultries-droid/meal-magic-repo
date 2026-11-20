# Bake House — authorized grocery suspension

## Scope and result
- The user explicitly permitted a narrow exception to the database freeze: suspend the existing grocery Bake House while preserving items and orders.
- Updated only `grocery_stores.is_active` from `true` to `false` for `05658dbd-903d-4e6e-8c7e-f144faaa9206`, with guards for its existing owner, exact name and active state. The data tool returned the changed row successfully.
- No schema, migrations, RLS, functions, internal migration records or configuration were modified. No restaurant, rider, payment or order action was performed.
- This is suspension, not deletion or migration into Food. Existing behavior keeps closed shops visible; the grocery detail page and its original products remain accessible with a closed notice.

## Separate verification results
- **Backend verification: passed.** Fresh read returned `is_active=false`. Products remained 5, cart orders 0 and list orders 0. The hash of every store field except `is_active` and `updated_at` remained `97434df53686af7df6fcdaaab30a4d7f`. Product contents and all financial tables were not independently compared; they were not targeted by this update.
- **Automated tests: passed.** Existing suite: 61 files, 273 tests. These are regression checks, not proof of live payment or dispatch behavior.
- **Browser test: passed for the public mobile detail page.** Actual localhost page at 390 × 844 showed Bake House, the closed-store notice and preserved products without intercepted fixture data. No checkout or order was submitted. Authenticated admin, customer checkout and physical delivery were not tested in this step.
- **Real-world verification: not performed.** No restaurant acceptance, payment, pickup, rider dispatch or delivery was exercised.
- **Phone verification security: OPEN SECURITY ISSUE.** This operation does not fix writable phone-verification status or provide real OTP.

## Remaining work and rollback
- Food Bake House activation, ownership resolution and menu cleanup are separate unfinished work; this permission does not authorize deleting its menu or changing its owner.
- The general database freeze remains in force outside this exact suspension.
- The prior activation value was `true`; reversal would restore that single field through the approved data tool after explicit permission. No deleted data needs recovery.