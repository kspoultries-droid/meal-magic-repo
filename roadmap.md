# Roadmap

- [x] Auto-dispatch expired-offer worker and safe rider acceptance
- [x] Manual assignment converted to rider offer/acceptance
- [x] Dispatch status labels and retry control
- [x] Rider day-wise history and collapsed completed orders
- [x] Admin realtime remittance alerts and pending badges
- [x] Premium product detail, related products, account tiles, and cart upgrades
- [x] Tests and runtime smoke check
- [x] Premium Daraz-style Bazar feed with Ink & Amber theme, advanced filters, wishlist, recent products, and view/sort controls
- [x] Restore complete Bazar category filters with compact horizontal navigation and remove duplicate branding/counts
- [x] Add rotating paid featured Bazar ads in the marketplace hero
- [x] Add top-ranked and best-selling marketplace sections
- [x] Support multiple product photos and richer product descriptions
- [x] Add customer review photo/video attachments and visible shop rankings
- [x] Add admin controls for creating, editing, activating, and deleting Bazar categories
- [x] Weight/distance based delivery pricing engine (rider, loader, intercity, courier) with vehicle selection
- [x] Checkout shows live quote with weight, distance, vehicle and fee breakdown
- [x] Product form captures billable weight and shipping class
- [x] Admin screen for delivery rate cards and intercity routes
- [x] Dispatch respects vehicle capacity and skips courier/intercity orders
- [ ] Food dish search finds matching menu items
- [ ] Menu selections show independent quantities for variants and add-ons
- [ ] Food checkout hides freight details and confirms with delivery fee
- [ ] Compact premium checkout verified on mobile and desktop

- [x] Fix restaurant banner and menu-item camera/gallery uploads with owner-scoped storage paths
- [x] Show restaurant customer reviews to the owning restaurant dashboard
- [x] Use full weekday/date labels and fully compact the sales report
- [x] Remove the earnings explanatory note
- [x] Add private admin payout-slip attachment and vendor-side viewing
- [x] Verify upload, reviews, sales, earnings, and payout receipt flows

## ڈیش بورڈ اپ گریڈ
- [x] مرحلہ 1: ایڈمن کمانڈ سینٹر، چارٹس، CSV ایکسپورٹ، گلوبل سرچ
- [x] مرحلہ 2: بلک ایکشنز، مینو سرچ/بزی موڈ، تیاری کا وقت، رائیڈر پروف فوٹو
- [x] مرحلہ 3: پرفارمنس سکور، الرٹ سینٹر، موبائل بہتری
- [x] Rider-role based command-center counts and dispatch eligibility
- [x] Reliable distinct-rider 20/40/40 offer progression with manual attention fallback
- [x] Admin rider suspend/restore/offline/role-removal controls
- [x] Restaurant permanent and timed closure controls
- [x] Stop command-center refresh flicker and restore live order totals
- [x] Preserve offer history and prevent repeat offers to the same rider
- [x] Restore live admin order status updates without panel flicker
- [x] Keep checkout confirmation action clear of notifications
- [x] Compact order confirmation with always-visible Home and Track actions

## ٹیم اور نوٹیفکیشن
- [x] Staff roles, permissions, city scopes, team page
- [x] Append-only staff audit log + two-person approvals
- [x] In-app realtime notifications + browser alerts
- [x] Team performance page
- [x] Dispatcher/rider-supervisor/finance can use their actions; enforced two-person approval
- [x] Firebase connected (gateway-backed, send-push deployed, FCM auth verified)
- [ ] Enable web push from published app (own tab) to register first device token, then end-to-end background push test — preview iframe blocks notification permission and lacks VITE_ connector vars

## معیاری ایپ منصوبہ (2026-10-03)
- [x] Android app config (Easy Life name, live site, permissions) + GitHub APK build workflow
- [ ] Native push in APK — blocked: user must add google-services.json (Firebase Android app) as GitHub secret
- [ ] Background rider GPS plugin — after first APK installs successfully
- [x] Rider geofence 150m on arrived steps
- [x] Kitchen slip / bill printing (58/80mm), auto-print, NTN/tax on bill
- [x] Restaurant delay announcement → customer notification
- [x] Help center: report problem + support queue with SLA + reply notification
- [ ] SMS OTP + COD gating — blocked: SMS provider account (Twilio) needed
- [ ] JazzCash/Easypaisa — blocked: merchant account
- [ ] Referrals, re-order, rider shifts/levels/bonus, heatmap, services/wholesale completion, home old-order bug
