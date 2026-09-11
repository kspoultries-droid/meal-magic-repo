# رائیڈر ڈسپیچ اور پارٹنر کنٹرولز کی درستگی

## موجودہ مسئلہ
- کمانڈ سینٹر `riders` کی ہر پرانی row گن رہا ہے؛ رائیڈر رول ہٹنے کے بعد بھی دیدار شامل ہے۔ اصل فعال rider-role اکاؤنٹس اس وقت دو ہیں، تین نہیں۔
- خودکار ڈسپیچ بھی rider role چیک نہیں کرتا، اس لیے رول ہٹایا ہوا اکاؤنٹ امیدوار بن سکتا ہے۔
- 10 سیکنڈ والا expiry worker فعال ہے اور حالیہ آرڈرز میں اگلی آفرز بنی ہیں، مگر eligibility اور dashboard state غلط ہونے سے نتیجہ غیر معتبر نظر آتا ہے۔

## تبدیلیاں
1. **درست رائیڈر گنتی**
   - کمانڈ سینٹر میں صرف وہی اکاؤنٹس total شمار ہوں گے جن کے پاس rider role اور rider profile دونوں موجود ہوں۔
   - Online count میں صرف فعال، غیر معطل، دستیاب rider-role اکاؤنٹس شامل ہوں گے۔

2. **قابلِ اعتماد خودکار منتقلی**
   - ڈسپیچ امیدوار کے لیے rider role، فعال حالت، درست شہر، GPS، دستیابی، capacity اور active-order limit لازمی ہوں گے۔
   - پہلا موزوں رائیڈر 20 سیکنڈ، دوسرا اور تیسرا 40-40 سیکنڈ حاصل کریں گے۔
   - ہر expiry پر اگلا اہل رائیڈر منتخب ہوگا؛ تین مختلف اہل رائیڈرز نہ ہوں تو دستیاب امیدوار ختم ہوتے ہی آرڈر manual attention میں جائے گا۔
   - ختم شدہ/منسوخ آفرز کی گنتی کو واضح کیا جائے گا تاکہ manual retry پر پرانی cancelled offers نئی تین کوششیں خراب نہ کریں۔
   - admin order card میں searching، offer 1/3–3/3، اور manual attention الگ واضح ہوں گے۔

3. **رائیڈر انتظام**
   - Partners > Riders میں Online/Offline، Suspend/Restore اور Remove rider role controls شامل ہوں گے۔
   - Remove محفوظ soft-removal ہوگا: rider role ختم، rider offline/suspended، مگر سابقہ آرڈرز، آمدنی اور settlement history محفوظ رہے گی۔
   - فعال/معطل اور GPS/city readiness واضح دکھے گی۔

4. **ریسٹورنٹ انتظام**
   - Partners > Restaurants میں Open/Close، عارضی بندش (1 گھنٹہ، آج، custom وقت)، Restore اور Delete controls واضح ہوں گے۔
   - عارضی بندش `busy_until` سے ہوگی؛ مستقل غیرفعال حالت الگ رہے گی؛ historical orders ہونے پر destructive delete کے بجائے محفوظ disable استعمال ہوگا۔

## تصدیق
- database میں rider-role count اور command-center count برابر چیک ہوگا۔
- test order پر 20/40/40 sequence، تین distinct offers، اور آخر میں manual attention verify ہوگا۔
- suspended/removed rider کو نئی آفر نہ ملنے، restored rider کے دوبارہ eligible ہونے، اور restaurant temporary closure کی تصدیق ہوگی۔
- متعلقہ tests اور mobile admin view چیک ہوں گے۔
