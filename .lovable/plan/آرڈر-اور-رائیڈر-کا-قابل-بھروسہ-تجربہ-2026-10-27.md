# آرڈر اور رائیڈر کا قابلِ بھروسہ تجربہ

## 1. پہلے بند ایپ کا مسئلہ
- APK میں اصل Android آفر اطلاعات اور پس منظر GPS/دستیابی مکمل کریں؛ حفاظتی تازگی شرط برقرار رہے۔
- اصل فون پر بند اسکرین، ایپ پیچھے اور کمزور انٹرنیٹ کی جانچ؛ زبردستی بند ایپ کی حد واضح کریں۔

## 2. ایک ہی ایپ میں نقشہ
- رائیڈر کو پہلے ریسٹورنٹ، سامان لینے کے بعد گاہک تک سڑک کا راستہ اور اگلا ضروری بٹن۔
- گاہک اور متعلقہ ریسٹورنٹ کو درست مرحلہ، تازہ مقام اور آمد کا اندازہ؛ پرانے GPS کو تازہ نہ دکھائیں۔
- رائیڈر نہ پہنچنے کی شکایت اور ڈسپیچر کی نگرانی میں دوبارہ تفویض؛ سامان اٹھانے کے بعد خودکار تبدیلی نہیں۔

## 3. حقیقی رابطہ اور محفوظ آرڈر
- Google لاگ اِن برقرار؛ پہلا آرڈر دینے سے پہلے SMS سے فون تصدیق، نمبر بدلنے پر دوبارہ تصدیق۔
- پتے اور نقشے کے نشان کی واضح تصدیق؛ مشکوک آرڈر کی انسانی جانچ۔
- گاہک کے پاس وصولی کوڈ؛ ناکام وصولی یا کوڈ نہ ملنے پر سپورٹ کا محفوظ راستہ۔

## 4. رییل اور مکمل آزمائش
- ریسٹورنٹ کے اصل اکاؤنٹ میں ویڈیو بھیجنے کی خرابی پکڑیں، صرف متعلقہ خرابی درست کریں۔
- گاہک، ریسٹورنٹ اور رائیڈر کے فون پر ایک مکمل آزمائشی آرڈر؛ نقشہ، اطلاع، وصولی اور حساب چیک کریں۔

## درکار انتظام
- SMS سروس کی ترتیب اور ممکنہ فی پیغام خرچ۔
- Android Firebase ترتیب اور تازہ APK کی حقیقی فون پر جانچ۔
- راستے فراہم کرنے والی سروس کی دستیابی اور خرچ؛ پہلے واضح کریں، بلااجازت نیا بل نہیں۔

## Technical details
- Preserve existing Leaflet maps and order-scoped GPS access; select a compatible routing provider before implementation.
- Verify hosted phone-auth settings before implementing OTP; enforce order gating on the server for food and both grocery order types.
- Use the existing single rider GPS publisher with a native background path, not a second competing coordinate source.
- Extend active-order authorization for vendor tracking without broad rider-table access.
- Keep serialized single-delivery allocation and supervised reassignment; add concrete tests for permissions and new business rules.