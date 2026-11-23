# ڈسپیچ، بینر اور کیمرہ: مکمل متعلقہ راستوں کی جانچ

## اس مرحلے میں درست کیا
- راشن لسٹ، دکان کی رسید اور رائیڈر کے فوٹو ثبوت میں فائل چننے کے بجائے واضح کیمرہ کھولنے والا مشترک کنٹرول استعمال کیا۔ راشن اور رسید کی گیلری الگ ہے؛ اصل ثبوت پر تصویر بہتر کرنے یا پس منظر مٹانے کا عمل نہیں چلتا۔
- رسید کی ریکارڈ محفوظ کاری ناکام ہو تو اصل فائل اور اپ لوڈ شدہ پتہ برقرار رہتا ہے؛ دوبارہ محفوظ کرنے پر تصویر دوبارہ اپ لوڈ نہیں ہوتی۔ دوسرے آرڈر کی تفصیل پر پہلے آرڈر کی رسید نہیں لگتی۔
- واپس دکان پہنچے فوڈ آرڈر بھی بند تاریخ میں جاتے ہیں؛ تیاری، منسوخی یا دوبارہ قبولیت کے ایکشن نہیں ملتے۔
- کوریئر کے واپس شدہ پارسل کو ڈیلیور اور ڈیلیور شدہ کو واپس بنانے کی UI درخواست ممنوع ہے۔ دستی رسید محفوظ کرتے وقت آرڈر اور شپمنٹ کی دیکھی گئی حالت ملنی چاہیے؛ واپس آنے والی ریکارڈ سطر کے بغیر کامیابی نہیں دکھائی جاتی۔

## خودکار ٹیسٹ
366 ٹیسٹ، 79 مجموعے کامیاب؛ پیش منظر build OK۔ بند حالتوں، واپس شدہ پارسل، پہلے کوریئر ریکارڈ کی null حالت، صرف ثبوت لکھنے، ناکام/خالی ریکارڈ جواب اور محفوظ اپ لوڈ کی دوبارہ کوشش کی جانچ شامل ہے۔

## براؤزر جانچ
14 authenticated موبائل/ڈیسک ٹاپ scenarios کامیاب:
- 4 پارٹنر scenarios: اصل بند تاریخ صرف پڑھی؛ الگ تھلگ درخواستوں سے قبولیت، ڈیلیوری، ناکامی اور retry کی جانچ۔
- 4 فوڈ/گروسری scenarios: تصدیقی مکالمے، ناکام کارروائی میں وجہ کا برقرار رہنا، retry اور مجاز کارروائی کے درست arguments؛ writes الگ تھلگ۔
- 2 دکان کی رسید scenarios: اصل ایڈمن اور اصل دکان کے صفحے پر browser camera capture؛ الگ تھلگ upload/record replies میں پہلی ناکامی کے بعد اسی URL سے دوسری کوشش، 1 upload اور 2 save requests۔
- 2 Big Restaurant scenarios: اصل مالک کے اکاؤنٹ پر browser camera اور الگ گیلری، حقیقی storage upload اور حقیقی ناکام banner save، تصویر برقرار اور retry میں اضافی upload نہیں؛ صرف آزمائشی upload واپس حذف کیا۔
- 2 راشن scenarios: اصل لاگ ان کسٹمر اور موجودہ دکان پر camera photo اور الگ gallery photo دونوں فارم میں موجود؛ کوئی آرڈر جمع نہیں کیا۔

کیمرہ Chromium کے آزمائشی video device سے جانچا، حقیقی Android کیمرے سے نہیں۔ پارٹنر/فوڈ/گروسری آرڈرز، رقم اور اسائنمنٹ کی حقیقی records تبدیل نہیں کیں۔ رائیڈر کے نئے فوٹو کنٹرول کا assigned-order signed-in browser flow اور دستی کوریئر کی نئی conditional save کا مکمل browser flow اس مرحلے میں تصدیق شدہ نہیں؛ مشترک کیمرہ اور کوریئر کے unit tests ان کی مکمل عملی تصدیق کا متبادل نہیں۔

## سرور اور پس منظر کی جانچ
- اصل `guard_business_identity` ابھی بھی restaurants پر grocery-only `category` پڑھتا ہے۔ محفوظ nested table شرط کی migration دوبارہ چلائی؛ 0113/0114 snapshot collision کی وجہ سے SQL بالکل نہیں چلی۔ کسی متبادل SQL راستے یا metadata تبدیلی کا استعمال نہیں کیا۔ بینر کا اصل save اب بھی ناکام ہے۔
- `rider_delivery_action` اور `staff_force_deliver` میں بند حالتوں کے server checks موجود ہیں؛ فہرست کی quote/accept/receive/ready کارروائیاں مجاز اور row-locked ہیں۔
- `guard_grocery_status_transition` میں admin/trusted bypass موجود ہے؛ UI کی بندش کو ہر server راستے کی قطعی بندش نہیں کہا جا سکتا۔
- پارٹنر jobs پر server terminal lifecycle trigger موجود نہیں؛ موجودہ UI احتیاط، conditional write اور الگ history کو security enforcement نہیں کہا گیا۔
- کوریئر webhook rank-only جانچ میں delivered/returned کی برابر rank اور unconditional update باقی ہیں؛ UI predicate اس server راستے کو نہیں بدلتا۔ اسی طرح retry dispatch کے metadata اور food returned-state پابندیوں کو server review میں شامل رکھنا ضروری ہے۔
- شناختی، آرڈر، رائیڈر، گروسری، ادائیگی اور ڈسپیچ triggers کی موجودگی صرف پڑھی گئی؛ کسی settled record کو دوبارہ نہیں کھولا۔

## باقی واضح کام
1. migration-history رکاوٹ دور ہونے کے بعد restaurant identity شرط اور تمام terminal-order/courier/partner server راستوں کی قطعی بندش، audit اور محفوظ actions نافذ و جانچنا۔
2. نئے APK میں camera plugin فعال کرکے اصل Android پر camera، permissions اور cancel/back جانچنا۔
3. حقیقی رائیڈر، نقد وصولی، printer اور بند ایپ کی زیرِنگرانی آزمائش؛ یہ browser simulation سے ثابت نہیں ہوتے۔

صرف متعلقہ UI اور اس کی جانچ بدلی؛ منتخب یا غیر منتخب security scan findings کو اس مرحلے میں fixed/ignored نہیں کیا۔