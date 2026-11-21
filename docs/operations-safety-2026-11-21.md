# Operations safety and usability

## Implemented
- Food receipt generation no longer uses window.open, document.write into a popup, window.close or automatic script printing. Both manual buttons and acceptance auto-print requests open an in-app dialog.
- The receipt iframe is script-free and sandboxed. The explicit browser print command targets its content window; native Capacitor hides this command and offers receipt viewing and return only. This intentionally suspends native physical printing until a verified integration exists.
- Removed the restaurant-owner hard-delete button and its request handler. This is frontend protection, not a replacement for backend deletion authorization, and does not restore previously deleted records.
- Food orders use 1/2/3 responsive columns. Grocery dispatch uses the same desktop column structure. Restaurant name is visible on collapsed food orders.
- Cancellation is visible on active food orders with a reasoned, busy-protected dialog. Existing server rules remain authoritative: delivering, picked-up, returned, failed or closed records cannot be directly cancelled. The current Kffc order is delivering, so the dialog explains the restriction rather than pretending cancellation is enabled.
- Audit heading/search wrap on narrow screens; audit dates use Western digits.

## Automated tests
296 tests across 66 files passed. New checks cover both receipt event handoffs without a popup, and the existing cancellation boundary for preparing, delivering, pickup and pending return.

## Browser verification
Authenticated account, real Kffc order #9800c2, Urdu/English at 411×709 and 1440×1000:
- Both receipt buttons opened their respective document; order identity read back inside the iframe.
- No second browser page opened. Explicit print was intercepted inside the receipt frame to confirm command targeting, not physical output.
- Back-to-orders closed both dialogs and preserved the order screen.
- Restaurant settings contained no Delete button.
- Kffc cancellation opened the supervised-resolution explanation; no cancellation was submitted.
- Orders, Dispatch, Rider Monitoring, Photo orders, Audit log and Complaints opened in all 4 configurations, without horizontal document overflow or runtime exceptions.
- The dispatch/photo/complaints lists had no suitable live fixtures for action submissions. Monitoring/audit contained real read-only records. These are page checks, not certifications of every write action.

Build telemetry: build OK.

## Backend verification and blockers
Read-only function inspection confirmed staff_cancel_order rejects delivering regardless of pickup timestamp. admin_force_assign_rider is an initial assignment function, not a safe audited unassignment/replacement lifecycle. No dedicated unassign/reassign function was found. Reusing it would risk retaining prior delivery evidence and changing liability.

The standing database/function freeze prohibits alternate-route changes. Safe rider removal/replacement and stronger server deletion protection remain blocked, not implemented or marked complete. No migrations, operational records, payments or rider assignments changed.

Physical Android print/Back behavior and connected thermal-printer output were not tested. No WhatsApp sharing or native printer integration was added. Full live-fleet mapping, new filters and server pagination were review suggestions, not implemented in this bounded safety change.

## Review corrections
The earlier review overclaimed that missing Bake House from a restaurant query proved complete cascading historical-data loss. That query establishes absence from its result, not deleted ledger/order counts or recoverability. No restoration or data-loss extent is claimed here.
The earlier statement that monitoring contains only historical information was too broad: its report also includes current return/review queues and refreshes periodically; it is not a live fleet map.