# Project rules
- Account orders use one cross-service list and the existing authorized tracking page as canonical details; keep delivery and courier decisions server-authoritative.
- Daily loyalty visits use a server-dated, unique user/day RPC with no client coin writes or wallet conversion; profile photos are owner-scoped private objects and signed on demand.
- Recently viewed products store a bounded account-scoped local history; this is browsing convenience, never authoritative price or permission data.
- Admin search and record dialogs reuse authorized table reads and existing action RPCs; list filtering/pagination and mobile presentation must not alter dispatch or approval rules.
- Rider allocation is serialized per rider across offers, acceptance and manual assignment; a single readiness predicate gates grocery dispatch and acceptance, and physical delivery steps use authorized RPCs independent of kitchen status.
- One server function (rider_assign_block_reason) decides rider eligibility and returns the specific reason; auto-dispatch uses a multi-minute presence window because closed-app phones report GPS sparsely, while staff manual assignment skips presence but never skips busy/suspended/offer checks.
- Rider offer pay is snapshotted separately from customer delivery fees; missing verified distances enter finance review, and returns retain rider capacity until dispatcher confirmation.
- Pilot timings and offer outcomes are reported by service; batching and incentive expansion require real supervised pilot evidence, not simulated results.
- Rider GPS has one app-level publisher writing only riders coordinates and GPS timestamps; Android uses the background watcher and native HTTP instead of browser GPS, with Legacy Bridge enabled for background callbacks; customer tracking uses an active-order-authorized RPC, never broad rider-table reads or saved delivery addresses.
- Delivery routes use an authenticated order-scoped context and server-side openrouteservice gateway; infer the target from persisted delivery stage, never client-submitted endpoints, and retain marker-only fallback for missing pins/GPS.

- Shared typography, control surfaces, radii and elevation live in global tokens and UI primitives; keep navigation brand-isolated so page themes cannot weaken its contrast.
- Editable Bazar and Services headers wait for their settings read before rendering themed content; use a neutral placeholder to prevent default-color flashes on every page mount.

- Firebase web push config (apiKey, appId, projectId, VAPID) is hardcoded as fallback in src/lib/webPush.ts — connector VITE vars did not sync to builds, and these values are public by design.
- Native Android app loads the published site via Capacitor server.url; APK is built by .github/workflows/android.yml so no local Android Studio is needed.
- APK update notices compare native Android build codes against workflow-issued GitHub release metadata at startup/resume, not PWA versions or release dates; keep a stable signing certificate for in-place upgrades.
- Customer navigation uses isolated brand tokens and a shared navbar-height token; scoped marketplace themes must not reduce header contrast or obscure sticky navigation.
- Restaurant details render the photograph and restaurant information in separate full-width sections to keep photography untinted and text readable.
- Mobile pull-to-refresh is provided at the router level, only at the document top and outside dialogs, nested scrollers, and reels, so WebView users can refresh without disrupting scrolling.
- Reels storage reads separate uploader ownership, admin moderation, and exact-path active approved publication; never use URL LIKE matching because object names can contain wildcard characters.
- Shared grocery and Bazar banners insert into a unique version folder with the store-ID filename; this preserves owner-scoped policies and avoids overwrite SELECT requirements and stale image caching.
- Grocery and Bazar product uploads share a unique-folder product-ID filename helper, including new-product galleries; existing owner-scoped storage policies remain authoritative.
- AI setup helpers call the ai-setup-assistant function (cheap model, per-user daily limit logged in ai_setup_usage) and only return drafts; saving goes through normal owner-scoped inserts.
- Shop item bulk tools (quick edit, shared catalog_items picker, CSV/XLSX import) write only the owner's own grocery_products rows; the catalog stores names/photos without prices because each shop sets its own price.
- Service jobs use authorized RPCs for claims, quotations, customer decisions, completion and reviews; provider IDs on services/bookings reference provider rows while quotation provider_id retains the legacy auth-user identity. This prevents assignment races and identity mismatches.
- Service evidence stays private and is signed on demand; canonical account tracking includes service bookings. Customer quotation approval never marks money as paid.
