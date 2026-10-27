# Roadmap

## آرڈر کا اندرونِ ایپ تجربہ — موجودہ درخواست
- [x] نقشے کی سروس کا محفوظ رابطہ مکمل؛ Basic key سے رحیم یار خان کا 1,965 میٹر راستہ HTTP 200 کے ساتھ تصدیق
- [x] گاہک، رائیڈر اور ریسٹورنٹ کا اندرونِ ایپ مرحلہ وار راستہ؛ محفوظ سرور، بڑا نقشہ، فاصلے/اندازاً وقت، موڑ، 24 ٹیسٹ؛ حقیقی جاری آرڈر میں پرانے GPS کی محفوظ حالت اور نامعلوم آرڈر کی ممانعت تصدیق
- [ ] اصل فون پر چلتا راستہ — جاری آرڈر کے رائیڈر کا GPS 06:41:57 سے پرانا؛ تازہ GPS پر سڑک کی لکیر اور حرکت کی جانچ باقی
- [x] موجودہ اصل مالک اکاؤنٹ سے آزمائشی ویڈیو بھیجی، زیرِجائزہ رییل واپس پڑھی اور عارضی ریکارڈ ہٹایا؛ ناکام درخواست نہیں ملی؛ خاموش خرابی کی جگہ واضح پیغام
- [ ] مخصوص ریسٹورنٹ کی رییل ناکامی — اس ریسٹورنٹ کے اکاؤنٹ/ویڈیو پر اصل خرابی کا ثبوت درکار؛ مالک اکاؤنٹ کی کامیابی سب اکاؤنٹس کی تصدیق نہیں
- [ ] تصدیق شدہ گاہک فون اور جعلی آرڈر سے محفوظ رابطہ — پاکستانی کم خرچ OTP سروس، اصل قیمت اور API کی تحقیق جاری؛ سروس کا اکاؤنٹ درکار ہوگا
- [ ] رائیڈر نہ پہنچنے پر زیرِنگرانی اطلاع/دوبارہ تفویض — تاخیر کی حد اور GPS/روٹ کی حقیقی جانچ درکار
- [x] APK کے لیے واحد native background GPS watcher، native HTTP، Legacy Bridge، محفوظ device-token RPC اور رائیڈر/ریسٹورنٹ گھنٹی؛ Android sync اور 11 ٹیسٹ کامیاب
- [x] GitHub کی کامیاب build 34 اور 07:18:39 کی APK میں background GPS، Push plugin، Legacy Bridge، native HTTP اور Firebase وسائل تصدیق؛ آئندہ Firebase ترتیب غائب ہو تو APK جاری نہیں ہوگی
- [ ] APK میں بند ایپ آفر، دستیابی اور پس منظر GPS کی حقیقی تصدیق — تازہ APK نصب کرکے اصل فون سے آزمائش درکار

## بازار کی موجودہ درستگی
- [x] پروڈکٹ تصویر کا محفوظ مشترکہ اپلوڈ؛ 3 ٹیسٹ اور موجودہ پروڈکٹ پر 2 کامیاب تبدیلیاں؛ نئی پروڈکٹ گیلری بھی یہی راستہ استعمال کرتی ہے
- [x] بازار کی قطاروں میں کارڈز کا برابر سائز؛ فون اور کمپیوٹر پر جانچ
- [x] دکان کا بینر بدلنے کی محفوظ اپلوڈ؛ دی گئی تصویر 2 بار محفوظ اور تازہ صفحے پر تصدیق

## محفوظ زیرِنگرانی رائیڈر نظام
- [x] مرحلہ 1: ایک رائیڈر ایک جاری ڈیلیوری؛ تازہ دستیابی، درست آفر اطلاع، یکساں تیاری اور قبولیت
- [x] مرحلہ 2: الگ پک اَپ/دروازہ/تکمیل، حقیقی کمائی، نقد وصولی اور زیرِنگرانی واپسی
- [x] مرحلہ 3: انتظار، تاخیر، ناکام آفر اور حساب کے اختلاف کی پیمائش اور آزمائشی فہرست
- [x] 16 متعلقہ ٹیسٹ؛ ٹیسٹ اکاؤنٹ کے عارضی آرڈر پر آفر، پابندی، تکمیل، واپسی اور 2 کلومیٹر کی Rs 80 کمائی تصدیق؛ عارضی ریکارڈ ہٹائے
- [ ] حقیقی فون کا زیرِنگرانی آزمائشی دور — بند ایپ، کمزور انٹرنیٹ، مصروف اوقات، منسوخی، بیک وقت آرڈرز
- [ ] مرحلہ 4: آزمائشی نتائج کے بعد مشترکہ آرڈرز، لیول اور بونس کی بہتری — حقیقی نتائج درکار

## رائیڈر لوکیشن کی درستگی
- [x] مشترکہ رائیڈر GPS، کامیاب محفوظ ہونے کی تصدیق اور تازگی کا وقت
- [x] فوڈ، گروسری اور لسٹ کے کسٹمر کو محفوظ تازہ مقام اور درست نقشہ
- [x] GPS کے 8 ٹیسٹ، نقشے کے دونوں نشان اور نجی رسائی کی جانچ
- [ ] حقیقی جاری آرڈر میں رائیڈر سے کسٹمر تک جانچ — ابھی کوئی جاری اسائن شدہ آرڈر موجود نہیں
- [ ] بند ایپ/بند اسکرین کا مسلسل GPS — Android پس منظر راستہ شامل؛ تازہ APK اور حقیقی فون کی جانچ درکار

## مشترکہ پریمیم انداز
- [x] مشترکہ فونٹس، بٹن، کارڈز اور فارم کا یکساں انداز
- [x] اوپری اور نچلی نیوی گیشن کی یکسانیت اور واضح لوکیشن
- [x] اردو/انگریزی، فون/کمپیوٹر اور بنیادی بٹنوں کی عملی جانچ

## موجودہ ظاہری صفائی
- [x] موبائل پر نیچے کھینچ کر صفحہ تازہ کرنا اور جانچ
- [x] فوڈ تصویر کا سبز سایہ ختم کرنا
- [x] بازار کی اوپری لوکیشن اور بٹن واضح کرنا
- [x] ریسٹورنٹ کی تصویر سے سفید دھند ختم کرنا
- [x] مشترکہ صفحات، کارڈز اور نیوی گیشن کی صفائی اور فون/کمپیوٹر پر جانچ

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

## ایڈمن پینل کی باقی بہتری
- [x] ہر سیکشن سے مشترکہ تلاش اور متعلقہ فہرست تک رسائی؛ مختصر آرڈر آئی ڈی کی تلاش تازہ 100 تک
- [x] رائیڈر کی یکجا تفصیل، آرڈرز/آفرز/کمائی اور مختصر فہرست
- [x] تنخواہ/پلان کے الگ فارم اور ادائیگی تصدیق؛ ظاہر شدہ تنخواہ ہی بھیجی جاتی ہے
- [x] موجودہ بلک منظوری، فہرست فلٹر، 20 فی صفحہ اور موبائل لے آؤٹ کی تکمیل
- [x] اصل ایڈمن اکاؤنٹ میں 1280 اور 411 پر تلاش، تفصیل، ادائیگی تصدیق اور 9 صفحات؛ 12 ٹیسٹ کامیاب
- [ ] حقیقی بلک منظوری اور رقم کی ادائیگی — موزوں زیرِالتوا درخواستیں اور صارف کی واضح حقیقی ادائیگی درکار؛ اس جانچ میں رقم منتقل نہیں کی

## APK اپ ڈیٹ نظام (2026-10-27)
- [x] پروفائل صفحے پر نمایاں "ایپ انسٹال کریں" بٹن — سیدھا /install صفحے تک
- [x] APK صارفین کے لیے نئے بلڈ کی اطلاع، ڈاؤن لوڈ بٹن، ابھی نہیں، نصب شدہ ورژن موازنہ اور ویب/PWA کی علیحدگی
- [ ] عوامی ایپ میں نوٹس — ویب تبدیلی Publish/Update اور نئی کامیاب GitHub APK میں ورژن معلومات درکار
- [ ] پرانی APK کے اوپر محفوظ اپ ڈیٹ — مستقل signing key موجود نہیں؛ پرانی APK کی signing key اور اصل فون کی تنصیب جانچ درکار
