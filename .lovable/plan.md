# فوڈ مینو، کارٹ اور چیک آؤٹ کی مکمل درستگی

## مقصد
فوڈ سرچ، آئٹم انتخاب، الگ الگ مقدار، درست variant قیمت، ڈلیوری فیس اور آرڈر تصدیق کو ایک مربوط اور واضح تجربہ بنانا۔

## کیا بدلے گا

### 1. ڈش سرچ واقعی ڈش بھی تلاش کرے گی
- سرچ صرف ریسٹورنٹ نام اور cuisine تک محدود نہیں رہے گی؛ پورے دستیاب مینو میں dish name اور description بھی تلاش ہوں گے۔
- `Chicken Jalfreze` تلاش کرنے پر `Cafe debono` نتیجے میں آئے گا، چاہے وہ ڈش پہلے تین preview items میں نہ ہو۔
- تلاش کے نتیجے میں matching dish نمایاں دکھے گی، اور ریسٹورنٹ کھولنے پر متعلقہ ڈش تک پہنچنا آسان ہوگا۔

### 2. ریسٹورنٹ مینو پر منتخب مقدار واضح ہوگی
- `+` دبانے کے بعد متعلقہ آئٹم card منتخب حالت میں نمایاں ہوگا۔
- card پر `−  1  +` quantity control دکھے گا؛ مقدار بڑھنے پر وہیں `2، 3…` واضح ہوگا۔
- مختلف آئٹمز کی quantity الگ الگ رہے گی؛ پورے کارٹ کی quantity ایک ساتھ تبدیل نہیں ہوگی۔

### 3. سائز/وزن اور اضافی اشیاء کی الگ مقدار
- `800 گرام، 400 گرام، 200 گرام` کو radio selection کے بجائے الگ quantity rows بنایا جائے گا۔ صارف ایک ہی وقت میں 800 گرام اور 400 گرام دونوں شامل کر سکے گا۔
- نان، پراٹھا، چائے وغیرہ کے لیے بھی الگ `− / +` ہوگا؛ مثلاً ایک Chicken Jalfreze کے ساتھ دو نان ممکن ہوں گے۔
- ہر منتخب سائز اور ہر extra کارٹ میں الگ لائن بنے گا، اس لیے قیمت، مقدار اور حذف/تبدیلی آزاد ہوگی۔
- server ہر variant اور extra کی اصل محفوظ قیمت دوبارہ validate کرے گا؛ صارف کی طرف سے قیمت تبدیل نہیں ہو سکے گی۔

### 4. غلط بنیادی قیمت/سائز ختم ہوگا
- مینو card پر سب سے کم قیمت کے ساتھ غلط `800 gram` label نہیں لگے گا؛ صرف `Rs 500 سے` جیسا درست آغاز دکھے گا۔
- selection sheet میں ہر سائز کے سامنے اسی کی اصل قیمت ہوگی اور total تمام الگ quantities سے بنے گا۔

### 5. فوڈ ڈلیوری اور آرڈر تصدیق کی خرابی
- `orders` میں غائب delivery vehicle reference شامل کر کے موجودہ `vehicle_type_id does not exist` خرابی ختم کی جائے گی۔
- فوڈ آرڈر میں وزن، گاڑی اور bike/loader والا تفصیلی box مکمل چھپے گا؛ یہ صرف grocery/wholesale کے لیے رہے گا۔
- فوڈ کی delivery fee پس منظر میں محفوظ quote/city rate سے شامل ہوگی اور summary، کل قابلِ ادائیگی اور محفوظ order تینوں میں ایک جیسی ہوگی۔
- order بننے کے بعد confirmation page تک مکمل بہاؤ جانچا جائے گا۔

### 6. کمپیکٹ، پریمیم چیک آؤٹ
- order summary کو کم اونچائی، واضح item lines، quantity controls، variant/extra labels اور درست line totals کے ساتھ ترتیب دیا جائے گا۔
- address، voucher، gift اور payment حصوں کو compact disclosure/section انداز میں رکھا جائے گا تاکہ موبائل پر غیر ضروری لمبا صفحہ نہ بنے۔
- آخری total اور تصدیق button ہمیشہ واضح اور محفوظ جگہ پر رہیں گے؛ loading اور error حالت بھی صاف ہوگی۔

## تکنیکی تفصیل
- `RestaurantGrid` میں full menu-based search اور matching dish preview شامل ہوگا۔
- `RestaurantDetail` cart state پڑھ کر menu card پر quantity/selected state دکھائے گا۔
- `MenuItemSheet` multi-variant quantity اور independent add-on quantity cart builder بنے گا۔
- cart line identity variant/add-on کے لحاظ سے منفرد ہوگی؛ موجودہ الگ quantity controls استعمال ہوں گے۔
- `create_order` RPC add-on lines اور quantities کو database menu configuration سے validate کر کے محفوظ کرے گا۔
- schema migration صرف غائب `orders.vehicle_type_id` reference اور ضروری index/foreign key درست کرے گی؛ موجودہ RLS برقرار رہے گی۔

## جانچ
- unit tests: multiple variants، دو نان، الگ quantities، totals اور cart line IDs۔
- browser flow: `Chicken Jalfreze` سرچ → Cafe debono → 800g + 400g + 2 naan → cart quantities → checkout delivery fee → successful confirmation۔
- موبائل اور desktop دونوں پر checkout کی بصری جانچ، console اور failed network requests کی جانچ۔
