# محفوظ ڈسپیچ صفحہ — مرحلہ وار رپورٹ

تاریخ: 20 نومبر 2026

## دائرۂ کار

صرف موجودہ ایڈمن ڈسپیچ اور دستی کوریئر ریکارڈ کی frontend اصلاح کی گئی۔ کوئی database، SQL، migration history، RLS، function، کرایہ، شہر، فون تصدیق یا production configuration نہیں بدلی۔ حقیقی آرڈر، ادائیگی یا رائیڈر پر تجربہ نہیں کیا گیا۔

پچھلے تجزیے کا 100% تحفظ، فرضی فلیٹ کرایے اور مکمل مالیاتی/OTP ضروریات کو غیر ضروری سمجھنے کا نتیجہ قابلِ اعتماد نہیں تھا۔ تمام سابقہ ترقیاتی اور حفاظتی شرائط برقرار ہیں؛ ترجیح بدلنا ضروریات حذف کرنا نہیں۔

## کیا مکمل ہوا؟

- ایڈمن آرڈر پر مقامی رائیڈر، کوریئر یا نامعلوم محفوظ موڈ کا نشان۔ GPS یا شہر سے نیا موڈ نہیں بنایا جاتا۔
- کوریئر آرڈر سے رائیڈر آفر، فیس ان پٹ، دستی رائیڈر تکمیل اور مقامی stuck/searching پیغامات الگ کیے۔ مقامی گروسری اور فوٹو/راشن آرڈر کے موجودہ کنٹرول برقرار۔
- نامعلوم موڈ کا جائزہ Pending؛ پرانے CN کا ریکارڈ نظر آتا ہے مگر مختلف محفوظ delivery mode کو کوریئر میں تبدیل نہیں کیا جا سکتا۔
- گمراہ کن “Create Shipment” کے بجائے اصل CN کا دستی ریکارڈ؛ خودکار API بکنگ واضح Pending۔
- کسی کمپنی کو فعال ظاہر نہیں کیا گیا، نہ کمپنی کی پہلے سے منتخب فرضی ترجیح رکھی گئی۔ کمپنی کا نام اصل رسید سے درج ہوگا۔
- پہلی رسید کی حالت pending، خودکار dispatched نہیں۔ اصل واقعات کی تصدیق کا پیغام؛ فرضی نوٹیفکیشن پہنچنے کی کامیابی کا دعویٰ ہٹایا۔
- محفوظ کرنے کی درخواست صرف موجودہ courier evidence fields بھیجتی ہے، delivery method یا مالیاتی snapshot نہیں۔ ادائیگی کی ترتیب رقم وصول ہونے کا ثبوت نہیں۔
- اردو/انگریزی labels، رسائی والے form labels، موبائل dialog scrolling اور CN/URL کی درست لکھنے کی سمت۔

## الگ الگ جانچ

| جانچ | نتیجہ اور حد |
|---|---|
| Automated Tests | 59 test files، 260 tests کامیاب؛ 12 نئے functional tests۔ نئی جانچ میں موڈ، رائیڈر کنٹرول، محفوظ snapshot، پہلی pending حالت، لازمی CN/کمپنی اور server rejection پر غلط کامیابی نہ دکھانا شامل ہے۔ |
| Browser Tests — اصل backend | اپنے مجاز ایڈمن اکاؤنٹ سے `/admin` → آپریشنز → ڈسپیچ کھولا؛ حقیقی کھلی فہرست خالی تھی، 390×844 پر overflow اور page errors نہیں۔ خالی فہرست کو حقیقی shipment کی مکمل آزمائش نہیں کہا گیا۔ |
| Browser Tests — الگ آزمائشی responses | EN/UR، 390×844 اور 1280×1800: local/courier/unknown/legacy کارڈ؛ خالی فارم روکتا ہے؛ CN درج، محفوظ، فہرست میں دوبارہ دکھنا کامیاب۔ تمام مصنوعی reads/writes صرف براؤزر response interception میں رہے؛ database کو نہیں بھیجے گئے۔ |
| Backend Verification | صرف موجودہ `guard_shop_financial_snapshot` اور `sync_courier_shipment_status` کی definitions اور آرڈر کی مجموعی حالت پڑھی۔ موڈ/مالیاتی snapshot lock موجود ہے؛ shipment status آرڈر کی حالت بدل سکتا ہے۔ کوئی function یا policy نہیں بدلی۔ مجاز حقیقی shipment save کا backend end-to-end تجربہ نہیں کیا۔ |
| Real-World Verification | نہیں ہوئی؛ حقیقی کوریئر رسید، کمپنی booking، pickup، parcel delivery، SMS، bank settlement یا rider device نہیں آزمائے۔ |
| Build | آخری preview build کامیاب؛ پوری test suite اور آخری 4 browser configurations دوبارہ کامیاب۔ |

## بدلی گئی فائلیں

- `src/components/admin/GroceryDispatchTab.tsx`
- `src/components/orders/CourierShipmentDialog.tsx`
- `src/components/orders/CourierShipmentDialog.test.tsx` — نئی
- `src/lib/courier.ts`
- `src/lib/dispatchInterface.test.ts` — نئی
- `src/components/orders/AGENTS.md` — حفاظتی UI اصول، نئی
- `roadmap.md`
- `docs/safe-dispatch-ui-2026-11-20.md` — یہ رپورٹ

## تین درجات اور باقی کام

| درجہ | حالت |
|---|---|
| DEVELOP NOW | اس مرحلے کا محفوظ frontend مکمل؛ آئندہ مرحلے میں courier companies کا سچا Pending UI اور city settings کی ترتیب، پہلے موجودہ کوڈ کا جائزہ۔ حقیقی RYK pilot certification اس UI مرحلے میں مکمل نہیں ہوئی۔ |
| EXTERNAL DEPENDENCY PENDING | courier API/verified serviceability and rates، SMS OTP اور online payments کے حقیقی رابطے، merchant approval اور حقیقی عملی آزمائشیں۔ ان کی مکمل اندرونی تیاری کی ضرورت ختم نہیں ہوئی؛ database-dependent اصلاحات standing freeze کے باعث ابھی لاگو نہیں ہو سکتیں۔ |
| READY FOR ACTIVATION | کسی مکمل courier/OTP/payment integration کو اس مرحلے میں اس درجے میں قرار نہیں دیا گیا۔ |

**OPEN SECURITY ISSUE:** موجودہ فون تصدیق کی کمزوری حل نہیں ہوئی۔ نمبر کا format یا موجودہ client-writable نشان حقیقی OTP verification نہیں۔

فی الحال اگلے backend مرحلے پر نہیں گئے؛ tool بحالی کے بعد migration history/backup کی مطابقت اور الگ اجازت/حفاظتی جانچ ضروری رہے گی۔ خیرپور کا جان بوجھ کر رکھا گیا 1000 km آزمائشی radius برقرار ہے۔

## واپس لانے کی تیاری

اس قدم میں صرف اوپر کی frontend/helper/test/documentation فائلیں بدلی ہیں؛ انہیں اس قدم سے پہلے کے commit `3bf4eeb` سے مخصوص file restore کے ذریعے واپس لایا جا سکتا ہے۔ پورا repository reset یا migration records کی دستی ترمیم نہ کی جائے۔ اس قدم کے لیے database rollback ضروری نہیں کیونکہ database تبدیل ہی نہیں ہوا۔