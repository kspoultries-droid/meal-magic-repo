# EasyLife — ترسیل، ادائیگی اور فون OTP کا تکنیکی جائزہ

**تاریخ:** 20 نومبر 2026  
**فیصلہ:** الفلاح کی مطلوبہ آزمائشی سیٹنگ درست ہے؛ ملک گیر خودکار کاروباری لانچ ابھی تیار نہیں۔ آرڈر بن جانا، کوریئر بک ہونا، پارسل پہنچنا اور رقم وصول ہونا 4 الگ کامیابیاں ہیں۔

## 1. کیا درست کیا اور کیا آزمایا؟

- الفلاح واچ سینٹر کا شہر کراچی سے **خیرپور** کیا؛ آپ کا موجودہ آزمائشی GPS پن برقرار رکھا۔
- ملک گیر ترسیل **آن** اور دکان کا ایڈوانس **0%** کیا۔
- مقام موجودہ ایڈمن کی مجاز، آڈٹ والی کارروائی سے بدلا؛ حفاظتی پابندی نہیں ہٹائی۔
- عارضی تصدیق شدہ کسٹمر سے موبائل سائز 411×709 پر چیک آؤٹ، حقیقی آرڈر، تصدیق، ٹریکنگ اور پھر منسوخی آزمائی۔
- دونوں مصنوعات کا مجموعہ **Rs 6000** تھا۔ خیرپور کا منتخب شہر اور نزدیک آزمائشی پن: **Rs 80** ترسیل، **Rs 6080** کل، مقامی رائیڈر۔ RYK کا صریح انتخاب اور RYK پن: **Rs 250** ترسیل، **Rs 6250** کل، کوریئر۔
- RYK کوریئر آرڈر **#C41BD524** بنا؛ کمپنی، ٹریکنگ نمبر اور رائیڈر خالی تھے، حالت زیرِانتظار تھی۔ یہ اصل کوریئر بکنگ نہیں تھی۔
- پہلے چکر میں پتہ RYK تھا مگر شہر خیرپور رہ گیا؛ **Rs 400** مقامی ترسیل، **Rs 6400** کل والا غلط شہر کا آرڈر بھی بن گیا۔ اسے اور باقی آزمائشی آرڈرز کو مجاز کارروائی سے منسوخ کیا؛ متعلقہ ادائیگی ریکارڈ بھی منسوخ ہوئے۔
- **40 متعلقہ خودکار ٹیسٹ پاس**؛ براؤزر میں کوئی page error نہیں۔ یہ جانچ صرف ان آزمودہ راستوں کا ثبوت ہے، پوری ایپ کے ہر بٹن کا نہیں۔

## 2. کیا خیرپور اور RYK سے آزمائش صحیح ہے؟

**ہاں، بشرطیکہ شہر، مکمل پتہ اور GPS پن ایک ہی منزل کے ہوں۔** خیرپور کی دکان سے خیرپور کا آرڈر مقامی صورت ہے؛ خیرپور سے RYK کا آرڈر بین الشہری صورت۔ صرف شہر کے نام بدلنا کافی نہیں۔

خیرپور میں ابھی خودکار رائیڈر تقسیم بند ہے، رائیڈر نہ ہونے پر چھپانے کی پابندی بند ہے۔ اس لیے مقامی آرڈر قبول ہو سکتا ہے لیکن خودکار رائیڈر نہیں آئے گا؛ منظور شدہ دستی آپریشن یا حقیقی مقامی رائیڈر چاہیے۔ ملک گیر ترسیل کا نشان اسی شہر کے آرڈر کو لازماً کوریئر نہیں بناتا۔

کوریئر معاہدے کے بغیر صرف **آرڈر/قیمت/منتظر حالت** کی آزمائش کریں۔ جعلی CN، جعلی روانگی یا جعلی وصولی درج نہ کریں۔ کمپنی سے اصل بکنگ کے بعد ہی CN اور پارسل حوالے کرنے کا ثبوت درج ہو۔ موجودہ Rs 250 ہمارا محفوظ ریٹ کارڈ ہے، TCS کی تصدیق شدہ قیمت نہیں۔

## 3. ترجیحی، تصدیق شدہ خامیاں

| ترجیح | مسئلہ اور ثبوت | اثر | مطلوبہ اصلاح |
|---|---|---|---|
| فوری | محفوظ پتہ/GPS اور چیک آؤٹ شہر الگ state ہیں؛ profile اور cities reads شہر بھرنے میں مقابلہ کرتے ہیں؛ RYK پتہ کے ساتھ خیرپور شہر اور مقامی آرڈر عملی طور پر بن گیا | غلط موڈ، غلط کرایہ، غلط آپریشن شہر | منزل کا ایک معتبر ریکارڈ؛ پتہ بدلنے پر شہر کی دوبارہ تصدیق؛ سرور پر شہر/پن کی خدمت کے علاقے سے مطابقت |
| فوری | `profiles.phone_verified` کسٹمر خود true کر سکتا ہے؛ عارضی کسٹمر پر عملی readback ثابت ہوا، پھر پرانی قدر بحال کی | اس نشان کو اعتماد کا ثبوت سمجھنا غیر محفوظ | کلائنٹ لکھائی بند؛ کامیاب معتبر OTP کے بعد ہی سرور تبدیلی؛ نمبر بدلنے پر تصدیق ختم |
| فوری | فون لاگ ان میں صرف “جلد” پیغام؛ OTP بھیجنے/جانچنے کا کسٹمر راستہ نہیں؛ shop order میں ای میل تصدیق شرط ہے، فون OTP نہیں | غیر تصدیق شدہ فون سے آرڈر؛ phone-only login مستقبل میں ای میل شرط پر بھی رک سکتا ہے | فون لاگ ان، اکاؤنٹ linking اور تمام آرڈر راستوں کی شناخت کی مشترک پالیسی |
| فوری | حقیقی کوریئر connection/booking adapter موجود نہیں؛ “Create Shipment” صرف نام/CN/status کی دستی لکھائی ہے | بٹن کمپنی میں پارسل بک نہیں کرتا | اصل booking، labels، pickups، cancel، tracking اور settlement کا کمپنی مخصوص رابطہ |
| فوری | بین الشہری route matcher میں `to_city_id IS NULL` کسی بھی منزل سے match ہو سکتا ہے | RYK کی نام والے مقامی routes کسی غیر متعلقہ شہر پر لگ سکتے ہیں | عین origin/destination/service کا match؛ null منزل کو عمومی route نہ سمجھیں |
| فوری | فعال courier rate card نہ ملے تو پرانا city flat fee fallback؛ کوریئر کے لیے بھی مقامی گاڑی منتخب ہو سکتی ہے | ناقابلِترسیل بھاری پارسل کی غلط/کم قیمت، کوریئر quote میں bike | تصدیق شدہ خدمت/وزن/ریٹ نہ ہو تو بند یا staff quote؛ کوریئر کو rider vehicle سے الگ رکھیں |
| بلند | شہر کے “Default Courier”، “Advance %” booking یا checkout کی حقیقی پالیسی نہیں؛ دکان کا advance>0 checkout روکتا ہے | سیٹنگ محفوظ مگر مطلوبہ اثر نہیں | defaults، ادائیگی ثبوت اور checkout eligibility کا ایک server policy model |
| بلند | خیرپور grocery radius اب بھی 1000، city advance 50، auto-dispatch off، auto-hide off ہیں؛ انہیں اس درخواست میں نہیں بدلا | یہ کوریئر فعال کرنے کا طریقہ نہیں؛ بہت دور مقامی گروسری کا خطرہ | مقامی گروسری radius الگ؛ کوریئر coverage الگ؛ بغیر رائیڈر مقامی خدمت کی واضح حالت |
| بلند | city settings پر فوری optimistic writes، blur saves اور fetch errors کا خاموش empty نتیجہ؛ بعض عددی controls کی حدود کمزور | تیز تبدیلیوں میں race یا محفوظ ہونے کا غلط تاثر | الگ draft، validation، واضح save/revert، version check، error state اور readiness summary |
| بلند | generic courier webhook موجود؛ provider-specific payload/status mapper اور اصل provider handshake ثابت نہیں | endpoint ہونا کمپنی سے sync ہونے کا ثبوت نہیں | فراہم کنندہ کے مطابق authenticated adapter، event uniqueness، retries اور reconciliation |
| بلند | database cron میں کوریئر retry job نہیں؛ generic retry drain موجود ہے مگر scheduler اس جائزے میں ثابت نہیں | ناکام update queue میں رہ سکتی ہے | مقررہ retry worker، concurrent claim، dead-letter alerts اور queue عمر کی نگرانی |
| بلند | shipment rank میں delivered اور returned دونوں 4؛ دونوں terminal حالات کے بیچ تبدیلی قبول ہو سکتی ہے جبکہ order terminal رہتا ہے | shipment اور order مختلف حقیقت دکھا سکتے ہیں | واضح transition graph؛ delivery کے بعد return الگ return workflow |
| بلند | manual shipment dialog payment type کو advance/partial بنا سکتا ہے مگر رقم ادا ہونے کا ثبوت نہیں لیتا | ادائیگی کا label اور اصل وصولی مختلف | payment record کے ثبوت سے اخذ کریں؛ صرف dropdown کو وصولی نہ مانیں |
| درمیانی | RYK کوریئر tracking پر live map، مقامی اور کوریئر timelines دونوں؛ منسوخی کے بعد بھی courier steps؛ EN میں اردو courier متن | صارف کو غلط توقع اور الجھاؤ | موڈ/حالت مخصوص ایک timeline، درست ترجمہ، غیر بک شدہ کمپنی کی صاف حالت |
| درمیانی | multi-shop checkout الگ الگ RPC calls سے ہوتا ہے، مشترک atomic booking نہیں | کچھ پارسل بن سکتے ہیں، باقی ناکام؛ دوبارہ کوشش حساس | فی پیکیج واضح نتائج، server idempotency key اور محفوظ retry؛ پورے cart کی atomicity کا دعویٰ نہ کریں |

### پچھلے تجزیے کی 3 ضروری تصحیحات

1. موجودہ `admin_relocate_business` **city_id بھی بدلتا ہے**؛ اس کے نہ بدلنے کا سابقہ دعویٰ غلط تھا۔ البتہ GPS اور شہر کا جغرافیائی match خودکار ثابت نہیں۔
2. بازار کی city gating **رائیڈر کے بغیر فعال رہتی ہے**؛ اسے مکمل طور پر rider-dependent کہنا غلط تھا۔ مسئلہ same-city wholesale آرڈر کا local rider بننا اور خدمت کی دستیابی الگ نہ ہونا ہے۔
3. موجودہ کوریئر کرایہ **Rs 250 فی کلو نہیں**؛ base Rs 250 اور مخصوص weight slab میں اضافی وزن کے Rs 45/kg ہیں۔ اصل معاہدے سے اس کی تصدیق باقی ہے۔

## 4. ادائیگی API — موجودہ حقیقت اور باقی کام

**موجود:** COD checkout، payments ledger، کمیشن، مجاز مالیاتی منظوری، دستی بینک کے بعد vendor payout record، نجی wallet receipt review۔ آزمائشی منسوخی سے payment cancellation sync ثابت ہوا۔ delivered shop orders کے ساتھ pending payments کا موجودہ read count 0 تھا؛ یہ اصل بینک تصدیق کا ثبوت نہیں۔

**موجود نہیں/غیر ثابت:** JazzCash، Easypaisa یا 1Bill کا عملی gateway adapter/linked connection، اصل charge، sandbox settlement، provider refund، automated vendor bank disbursement۔ بینک/جازکیش اکاؤنٹ نام کا فارم API integration نہیں۔

لازمی مالیاتی کام:

1. server-calculated رقم اور currency کے ساتھ unique payment intent؛ browser واپس آنے کو paid نہ مانیں۔
2. signed provider callback + server transaction query؛ ایک transaction سے ایک ہی credit، replay protection۔
3. success، pending، declined، timeout، late success اور cancellation-after-payment کی واضح حالتیں۔
4. قیمت/stock reservation کے ساتھ ادائیگی کا تعلق؛ ناکامی/expiry پر محفوظ release اور late payment reconciliation۔
5. full/partial refunds، provider charges، COD courier remittance، return freight، disputes اور bank statement reconciliation۔
6. vendor payable صرف منظور شدہ رقم وصولی اور return/dispute policy کے مطابق؛ “delivered” کو “بینک میں رقم آگئی” نہ سمجھیں۔
7. روزانہ وصولی، کمیشن، courier charges، refunds اور payout کو balanced ledger سے ملائیں۔

**اکاؤنٹ حاصل کرنے کا راستہ:** EasyLife کے نام پر merchant onboarding، کمپنی/شناخت، NTN اور کاروباری بینک کی مطلوبہ دستاویزات؛ provider کی KYC اور sandbox منظوری۔ JazzCash سرکاری onboarding میں CNIC/NTN اور agreement/biometric مراحل بیان کرتا ہے؛ Easypaisa KYC، due diligence اور app/site integration بیان کرتا ہے۔ معاہدہ ملنے تک قیمت/منظوری کے دنوں کی ضمانت نہیں۔

- JazzCash: https://corporateonboarding.jazzcash.com.pk/online-payment
- JazzCash sandbox: https://payments.jazzcash.com.pk/SandboxDocumentation/features.html
- Easypaisa: https://easypaisa.com.pk/online-payment-gateway/
- Easypaisa guides: https://easypay.easypaisa.com.pk/easypay-merchant/faces/pg/site/IntegrationGuides.jsf

## 5. فون OTP — 100% مکمل ہونے کی شرائط

اس وقت نمبر کی شکل اور profile uniqueness، نمبر کی **ملکیت** ثابت نہیں کرتے۔ Checkout درست نمبر کی شکل مانگتا ہے اور profile میں محفوظ کرتا ہے؛ OTP نہیں مانگتا۔ `phone_verified` ابھی خود لکھا جا سکتا ہے اور آرڈر میں معتبر شرط نہیں۔

ضروری سلسلہ: پاکستانی نمبر کو +92 میں normalize → OTP بھیجنا → محدود resend/کوششیں/expiry → معتبر verification → محفوظ account linking → سرور سے verification proof → نمبر بدلنے پر دوبارہ OTP → food/grocery/list اور gift receiver کے لیے طے شدہ پالیسی۔

SMS flood، نمبر enumeration، duplicate accounts، Google/email/phone linking، گم شدہ فون recovery، غلط/expired code، MNP، delivery failures، کمزور نیٹ ورک اور مناسب اردو/انگلش پیغام کے ٹیسٹ چاہیے۔ SMS OTP شناختی کارڈ/KYC نہیں ہے۔

**ہوسٹڈ auth کی SMS provider، signup، expiry، rate limits اور templates اس turn میں کسی کامیاب hosted-settings read سے نہیں دیکھے گئے؛ غیر تصدیق شدہ ہیں۔** source یا FCM push connection سے SMS provider کا فعال ہونا اخذ نہیں کیا۔ ملکی SMS provider منتخب کرنے سے پہلے Cloud phone auth کے ساتھ supported transport، قیمت، ٹیکس، template اور Cloud-origin API اجازت کی تصدیق ضروری ہے۔ صرف bulk SMS account خریدنا login integration کی ضمانت نہیں۔

## 6. کوریئر کمپنی EasyLife سے کیسے منسلک ہوگی؟

**کارپوریٹ اکاؤنٹ EasyLife کا ہوگا؛ ہر دکان کو الگ corporate account نہیں چاہیے۔** البتہ کراچی کی 8–10 pickup locations/company cost centres اور marketplace COD settlement کی اجازت معاہدے میں ضروری ہے۔ اگر provider multi-origin pickups نہ دے تو کراچی collection point/روزانہ pickup manifest متبادل ہے؛ اس میں handling اور pick-up cost شامل ہوگی۔

کمپنی سے لازماً تحریری طور پر لیں: serviceable cities/areas، origin pickups، اصل اور volumetric weight، minimum/extra weight charges، COD limits، remote-area surcharge، returns/insurance، ممنوع اشیا، pickup cutoff، delivery SLA، remittance cycle، marketplace استعمال اور متعلقہ taxes۔

تکنیکی راستہ:

1. کمپنی کے اپنے city/area codes کو EasyLife cities سے map کریں؛ صرف “Khair pur” string نہ بھیجیں۔
2. credentials محفوظ server connector میں؛ frontend میں نہیں۔
3. ready order کے package dimensions/weight/COD amount سے **idempotent** booking؛ timeout پر status query، اندھا retry نہیں۔
4. provider CN + label محفوظ؛ print/manifest؛ اصل pickup acknowledgement۔
5. اصل provider status mapping؛ webhook verification یا authenticated polling؛ تاخیر/ناکامی alerts۔
6. delivery، refusal، reattempt، return اور lost/damaged کا الگ workflow۔
7. courier COD invoice/remittance کو bank credit سے ملائیں؛ تب مالیاتی payout policy نافذ کریں۔
8. sandbox/UAT اور کم از کم حقیقی کراچی→RYK پارسل، COD remittance اور return مکمل کریں؛ اس کے بعد 8–10 دکانیں بتدریج فعال ہوں۔

TCS کی سرکاری API guide میں booking، cancellation، labels، cost centres، city lists، tracking، payment status/detail اور UAT/production مراحل ہیں؛ generic webhook ان سب کا بدل نہیں:

- https://envio.tcscourier.com/COD-API-UserManual.pdf
- https://api.tcsexpress.com/plugins
- Leopards merchant API: https://merchantapi.leopardscourier.com/

## 7. دکانیں اور دیگر نامکمل/غیر ثابت حصے

- موجودہ **35 shops میں 1** کا pickup pin نامکمل؛ grocery/bazar کی **341 مصنوعات میں 204** تصاویر خالی؛ **60 dishes میں 58** تصاویر خالی۔ `weight_kg` null count 0 ہے مگر default وزن کو حقیقی وزن نہ سمجھیں۔ تصاویر کے URL موجود ہونے سے تصویر درست/برانڈ matching ثابت نہیں۔
- الفلاح کی گھڑی کا stock quantity معلوم نہیں؛ بینر پر موبائل/tablet ہیں، دکان گھڑیوں کی ہے؛ delivery text اب بھی 20–30 min ہے؛ “تصدیق شدہ کوالٹی” جیسے دعوے حقیقی ثبوت کے بغیر production میں نہ جائیں۔ اس جائزے میں ان مصنوعات/تصاویر کو درست قرار نہیں دیا۔
- کراچی partners کے لیے اصل نام، مالک کی رضامندی/KYC، pickup pin، مکمل street address، phone، category، hours، حقیقی prices/stock، variants، parcel packaging/dimensions اور return policy چاہیے۔ grocery store table میں مکمل pickup street address نہیں، courier booking کے لیے یہ کمی ہے۔
- restaurant premium cards، finance/settings کی باقی polish، HEIC/camera کے بعد فارم کی حفاظت، آزمائشی category cleanup اور مکمل catalog-image verification کے سابقہ کاموں کی تکمیل یہاں ثابت نہیں کی گئی۔
- Android workflow اب stable release signing استعمال کرتا ہے؛ پرانی checklist کا “صرف debug APK” عمومی دعویٰ موجودہ source سے درست نہیں۔ تاہم اس turn میں تازہ APK binary، بند اسکرین push/GPS، battery permissions، printer hardware اور حقیقی rider movement دوبارہ نہیں آزمائے۔
- services/finance/admin کے ہر بٹن، concurrent rider races، refund/dispute کے پورے سلسلے اور load/security audit کی نئی جامع جانچ نہیں کی؛ انہیں اس رپورٹ کی بنیاد پر 100% پاس نہ سمجھیں۔

## 8. لانچ کی درست ترتیب

**مرحلہ 1 — RYK محدود فوڈ pilot:** حقیقی pins، تصدیق شدہ رابطے، 1 rider/1 active delivery، قبولیت→pickup→COD→remittance→completion؛ بند اسکرین اور کمزور نیٹ ورک کی اصل فون جانچ، cancellation/return اور حساب کی منظوری۔ روزانہ مسئلوں کی نگرانی ہو۔

**مرحلہ 2 — ملک گیر بنیاد:** شہر/پتہ mismatch، null-route matching، fallback pricing اور phone trust کی فوری اصلاح؛ ایک City Management میں مقامی rider readiness اور courier coverage الگ؛ sandbox payment/OTP/courier اور مالی reconciliation۔

**مرحلہ 3 — کراچی 1–2 shops:** چھوٹے قابلِکوریئر parcels، حقیقی تصاویر، اصل وزن/packing، verified stock، اصل courier booking اور وصولی۔ پہلے کامیاب COD remittance اور return test؛ مصنوعی کامیابی نہیں۔

**مرحلہ 4 — کراچی 8–10 shops:** صرف ثابت شدہ service areas اور products؛ acquisition بڑھانے سے پہلے fulfilment/returns/customer support capacity۔ سستے product rate کے ساتھ **کل payable + freight + return risk** دیکھیں؛ کم item price لازماً کم مجموعی قیمت نہیں۔

## حتمی حد

اس درخواست میں **الفلاح کی سیٹنگ اور آزمائش مکمل ہوئی؛ باقی ایپ کے قواعد/سیٹنگز خودکار طور پر نہیں بدلے**۔ مذکورہ خامیوں کی فہرست اصلاحی کام کا واضح scope ہے۔ فراہم کنندہ کا معاہدہ/credentials، hosted SMS configuration اور حقیقی hardware/پارسل/رقم کی آزمائش کے بغیر ملک گیر کاروبار کو مکمل operational کہنا درست نہیں ہوگا۔