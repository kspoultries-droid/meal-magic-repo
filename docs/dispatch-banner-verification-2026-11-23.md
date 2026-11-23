# Dispatch and restaurant photo verification

## Delivered frontend changes
- Partner jobs use separate active (`pending`, `assigned`) and terminal history (`delivered`, `cancelled`) views, exact-count 20-row pagination, sanitized server search, background refresh and retained rows on errors.
- UI only permits pending → assigned/cancelled and assigned → delivered/cancelled. Conditional writes compare the captured status and require returned evidence; stale dialogs cannot overwrite changed rows through this UI.
- Food/grocery delivery and grocery cancellation use in-app confirmation with retained notes on errors and duplicate-submission locks. Existing authorized action functions remain unchanged. Closed food rows no longer expose redispatch.
- Photo uploader opens a browser camera stream instead of a gallery for camera actions; Android uses the explicit Capacitor camera source. Gallery selection is separate. Failed banner record writes retain the image and previously uploaded URL for retry.
- Restaurant banner saves require a returned row rather than treating a silent zero-row update as success.

## Automated tests
362 tests across 79 suites passed. New tests cover terminal-state UI rules, assignment-before-delivery and preserving upload evidence across failed record writes. Preview build OK.

## Browser tests
- 2 authenticated Big Restaurant checks at 411×709 and 1280×1800: browser fake-camera stream/capture, independent gallery selection, actual storage upload, actual failed restaurant save, retained photo preview and retry without duplicate upload. Uploaded test evidence was removed through the owner-authorized Storage API.
- Actual account resolved from restaurant ownership: supplied email had 2 trailing d characters; persisted owner email has 3. The restaurant and owner were confirmed, not fabricated.
- 4 authenticated EN/UR mobile/desktop partner checks: real existing history readback shows both terminal rows without actions; isolated pending → assigned → delivered, failed conditional action retains the note, retry and history readback pass.
- 4 authenticated EN/UR mobile/desktop food/grocery checks with isolated writes: food delivery error/retry, grocery delivery, cancellation reason selection, authorized function argument contracts and refreshed UI readbacks pass.
- No runtime page errors in successful checks. Production orders, dispatch assignments, prices and financial records were not modified. Simulated flows are not delivery/financial certification.

## Backend verification and blockers
Migration attempted using the required migration tool. It failed before any SQL ran: migration snapshots 0113 and 0114 collide on their parent. No alternate SQL write route was used.

Actual Big Restaurant banner writes still fail with `record "new" has no field "category"`. `guard_business_identity` accesses grocery-only NEW/OLD fields in a compound expression attached to restaurants too. Repair must put category comparison inside a separate `IF TG_TABLE_NAME='grocery_stores' THEN` block, retaining existing business-name/category protections.

Partner jobs still have admin direct UPDATE permission without server terminal-state enforcement. UI safeguards are not security enforcement. After migrations work, add an authorized row-locked partner action with expected status, reason/evidence audit and protected immutable snapshots; revoke direct lifecycle writes and enforce terminal states even for server integration retries. Do not infer COD receipts or settlements from this status field: the partner table currently does not establish balanced financial records.

## Remaining activation checks
- Apply and verify the identity trigger repair; successful banner record save is currently blocked, not fixed.
- Apply and verify partner server lifecycle/permission/audit changes. Old delivered test jobs cannot be retroactively corrected without evidence and permission.
- Native camera plugin needs a new APK produced by the existing Android workflow (which runs Capacitor sync). Existing APKs lack this plugin; native camera requires hardware testing. Web camera behavior was verified with a fake browser device, not a physical Android camera.
- Existing four selected order-insert scan findings remain pending the same migration blocker; none were fixed or ignored in this request.
- Stuck-dispatch customer communication, physical rider/COD/free-delivery pilot and scanner quota fixes remain separate pending work; this request did not change their policies.