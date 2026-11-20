# ریسٹورنٹ اور رائیڈر — مختصر محفوظ مراحل

## تیار تبدیلیاں
- ریسٹورنٹ: **قبول کریں اور تیاری شروع کریں**، پھر **کھانا پیک اور تیار ہے**۔ الگ Preparing اور Send بٹن ختم۔
- موجودہ سرور ہر مرحلہ ترتیب سے مانگتا ہے، اس لیے پہلے بٹن میں 2 محفوظ درخواستیں ہیں، ایک مشترکہ transaction نہیں۔ پہلی کامیاب اور دوسری ناکام ہو تو تازہ confirmed حالت سے **تیاری جاری کریں** دستیاب ہے؛ دوبارہ acceptance نہیں ہوتی۔
- کھانے کی تیاری کی تصدیق کے لیے رائیڈر کی آمد یا assignment کا انتظار frontend میں ختم ہے؛ سرور کی اجازت اب بھی فیصلہ کرتی ہے۔
- رائیڈر: دکان پہنچنے کی تصدیق، سامان اٹھانے کی سوائپ، کسٹمر پہنچنے کی تصدیق، اصل نقد درج کرکے تکمیل کی سوائپ۔ الگ GPS arrival checks اور authorized delivery action برقرار۔
- پک اَپ کے بعد موجودہ اندرونِ ایپ راستہ persisted stage کی بنیاد پر کسٹمر کی طرف بدلتا ہے۔
- صرف تیاری کی تصدیق کو حوالگی نہیں کہا جاتا؛ حوالگی صرف persisted pickup سے ظاہر ہوتی ہے۔

## خودکار ٹیسٹ
64 test files، 285 tests پاس۔ نئی جانچ: قبول+تیاری کی ترتیب، interrupted save، دوبارہ شروع کرنا، تیاری قبل assignment، restaurant completion کی rider پابندی، closed orders، سوائپ کی ارادی تصدیق، duplicate submission اور disabled control۔

## براؤزر ٹیسٹ
- اصل signed-in restaurant اور rider صفحات موبائل پر کھولے؛ runtime errors 0۔ کوئی live operational action نہیں کیا۔
- 411×709 اور 1280×1800، اردو/انگریزی میں 4 isolated signed-in scenarios پاس۔ اصل UI استعمال ہوا مگر test order reads/writes مقامی browser interception میں رہے؛ یہ production server end-to-end کا ثبوت نہیں۔
- acceptance کا درمیانی failure → confirmed readback → resume → preparing؛ پھر rider assignment سے پہلے explicit ready readback۔
- rider arrival → track-end click سے کوئی pickup نہیں → thumb drag سے ایک pickup → customer arrival → Rs 278 مسترد، Rs 279 فعال → keyboard end alone سے completion نہیں → explicit confirmation سے completed readback۔
- screenshots اور no-horizontal-overflow جانچ؛ runtime errors 0۔ اصل order/payment/dispatch writes بند رکھے۔

## backend verification اور رکاوٹیں
- read-only live function inspection نے sequential status guard، readiness predicate، stage-authorized delivery action اور cash/lifecycle guards کی تصدیق کی۔
- migration-history inspection ناکام: `too many migration revisions to establish a unique applied history`۔ سابقہ database freeze برقرار؛ SQL، RLS یا functions کسی متبادل راستے سے نہیں بدلے۔
- ایک atomic قبول+تیاری کارروائی، readiness dependency کی server redesign اور 2-action rider flow **EXTERNAL DEPENDENCY PENDING** ہیں: پہلے migration history/tool repair درکار ہے۔
- timer صرف تخمینہ ہے؛ حقیقی food-ready، pickup، cash یا delivery خودکار فرض نہیں کی گئی۔ GPS قربت صرف موجودگی کا اشارہ ہے، پارسل حوالگی یا ادائیگی کا ثبوت نہیں۔ سابقہ عالمی ایپس سے متعلق auto-ready/auto-arrival کو لازمی industry standard کہنا غیرتصدیق شدہ تھا۔
- حقیقی بند Android، پس منظر GPS، push اور جسمانی parcel/cash جانچ نہیں ہوئی؛ یہ browser fixtures اس کی جگہ نہیں لیتے۔ فون OTP کی سابقہ کھلی سیکیورٹی رکاوٹ اس کام سے حل نہیں ہوئی۔

## architecture
Restaurant presentation composes conditional, sequential server-guarded status saves and resumes partial acceptance; do not bypass the server's progression guard. Rider swipe confirmation wraps existing authorized actions and never turns elapsed time or proximity into delivery/payment evidence. Root AGENTS.md was at its size budget, so no existing user rules were condensed.