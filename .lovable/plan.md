# Easy Life کو مکمل معیاری ایپ بنانے کا منصوبہ

کام چار مرحلوں میں ہوگا۔ ہر مرحلے کے بعد آپ کو بتایا جائے گا کہ کیا بن گیا اور کیسے آزمانا ہے۔

## مرحلہ 1 — Android ایپ اور قابلِ بھروسہ اطلاعات
- اصلی Android ایپ (APK) کی تیاری: ایپ کا نام "Easy Life"، آئیکن، شروع کی اسکرین، شائع شدہ ویب سائٹ سے جڑی ہوئی۔
- APK فائل خودکار طور پر بنانے کا انتظام (GitHub پر مفت بلڈ)، تاکہ آپ کو کمپیوٹر پر Android Studio کی ضرورت نہ پڑے — بس ایک لنک سے APK ڈاؤن لوڈ۔
- بند ایپ پر بھی اطلاع: رائیڈر کو نئی آفر پر تیز آواز، ریسٹورنٹ کو نیا آرڈر، گاہک کو آرڈر کی تازہ صورتحال۔
- رائیڈر کی لوکیشن ایپ بند یا اسکرین آف ہونے پر بھی چلتی رہے۔
- اطلاع دبانے پر صحیح صفحہ کھلے (ریسٹورنٹ ڈیش بورڈ، رائیڈر آفر، آرڈر ٹریکنگ)۔

## مرحلہ 2 — فون نمبر تصدیق (SMS) اور فراڈ سے بچاؤ
- نیا اکاؤنٹ اور پہلا آرڈر: فون نمبر پر 6 ہندسوں کا کوڈ۔
- تصدیق شدہ نمبر کے بغیر نقد (COD) آرڈر نہیں۔
- بار بار آرڈر منسوخ کرنے یا نہ لینے والے گاہک پر خودکار پابندی / پیشگی ادائیگی۔
- منسوخی کی پالیسی: ریسٹورنٹ کے قبول کرنے کے بعد منسوخی پر واضح اصول۔
- رائیڈر اور گاہک کا فون نمبر ایک دوسرے سے چھپا رہے (ایپ کے اندر کال/چیٹ)۔

## مرحلہ 3 — ریسٹورنٹ اور دکان کے کام
- آرڈر کی پرچی پرنٹ: عام پرنٹر اور 58/80mm تھرمل پرنٹر (بلوٹوتھ/USB)؛ نیا آرڈر قبول کرتے ہی خودکار پرنٹ کا آپشن۔
- کچن کی پرچی اور گاہک کا بل الگ الگ۔
- مینو آئٹم "ختم ہو گیا" سوئچ، ایک کلک میں۔
- ریسٹورنٹ کی طرف سے آرڈر میں تاخیر کا اعلان اور گاہک کو اطلاع۔
- گروسری آرڈرز پر بھی 4 مرحلے کی رائیڈر ٹریکنگ۔
- رائیڈر کے لیے لوکیشن کی پابندی: ہوٹل/گاہک سے 150 میٹر کے اندر ہی "پہنچ گیا" اور "مکمل" دب سکے۔

## مرحلہ 4 — گاہک کا تجربہ، ادائیگی اور انتظام
- مدد مرکز: ہر آرڈر پر "مسئلہ بتائیں" (چیز کم، غلط، دیر، خراب) + تصویر؛ سپورٹ ٹیم کی قطار اور جواب کا وقت (SLA)۔
- آن لائن ادائیگی: JazzCash / Easypaisa (آپ کے مرچنٹ اکاؤنٹ کے بعد)؛ تب تک بٹوے میں رقم + نقد۔
- ریفرل کوڈ اور پہلے آرڈر کی رعایت؛ ری آرڈر (پچھلا آرڈر ایک کلک میں دوبارہ)۔
- رائیڈر شفٹ بکنگ، رائیڈر لیول (1 تا 5) اور ہفتہ وار بونس۔
- رائیڈر کے لیے رش والے علاقوں کا نقشہ۔
- ہوم سروسز اور ہول سیل کے ادھورے حصے مکمل: بکنگ سے ادائیگی اور ریویو تک پورا راستہ۔
- ٹیکس والی رسید (دکان کا نام، NTN، ٹیکس کی تفصیل) اور ماہانہ رپورٹ۔
- ہوم پیج پر پرانا آرڈر دکھنے والی خرابی کا خاتمہ۔
- آخر میں: ہر حصے کی مکمل جانچ (گاہک، ریسٹورنٹ، رائیڈر، ایڈمن)۔

## آپ سے درکار چیزیں
- **SMS:** ایک SMS کمپنی کا اکاؤنٹ (مثلاً Twilio)۔ جب تک یہ نہ ملے، کوڈ WhatsApp لنک یا ای میل سے بھیجا جا سکتا ہے۔ تفصیل مرحلہ 2 میں بتاؤں گا۔
- **APK:** ایک مفت GitHub اکاؤنٹ (اس سے ایپ خودکار بنے گی)۔
- **JazzCash/Easypaisa:** مرچنٹ اکاؤنٹ — اس کے بغیر یہ حصہ تیار رکھا جائے گا مگر چالو نہیں ہوگا۔

## Technical details
- Android: Capacitor config → production URL (easylife.apnahub.online), appName "Easy Life"; `@capacitor/push-notifications` + FCM (google-services.json from user's Firebase), `@capacitor-community/background-geolocation` foreground service; GitHub Actions workflow `android.yml` building debug/release APK as artifact.
- SMS OTP: `phone_verifications` table + edge functions `send-otp`/`verify-otp` (provider via connector/secret, hashed codes, rate limit 3/10min); `profiles.phone_verified`; enforced in `create_order` for COD.
- Abuse: `customer_risk` counters from cancellations/no-shows; trigger-based blocking.
- Printing: print-optimized receipt route + `window.print` CSS for 58/80mm; Web Bluetooth ESC/POS on Android Chrome; auto-print toggle per restaurant.
- `menu_items.is_available` quick toggle; geofence check in `rider_mark_step` using `haversine_km`.
- `support_tickets` table + attachments bucket + SupportDashboard queue; referrals table; rider_shifts table; tax fields on restaurants/grocery_stores.
- All new tables with GRANTs + RLS; roadmap.md updated per phase.
