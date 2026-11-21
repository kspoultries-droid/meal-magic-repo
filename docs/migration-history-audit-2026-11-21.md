# مائیگریشن ہسٹری کی محفوظ جانچ — 2026-11-21

## نتیجہ
**EXTERNAL DEPENDENCY PENDING** — بحالی مکمل نہیں ہوئی۔ صارف کی اجازت پر محفوظ بحالی کے دستیاب ٹول سے دوبارہ جانچ کی گئی، مگر ٹول کسی repair plan یا plan ID کے بغیر یہ جواب دیتا ہے:

`too many migration revisions to establish a unique applied history`

اس لیے supported repair چلانے کا قابلِ تصدیق راستہ دستیاب نہیں۔ کوئی schema، SQL function، RLS، journal، snapshot، applied-history record، آرڈر یا ادائیگی تبدیل نہیں کی گئی۔

## تصدیق شدہ شواہد
- موجودہ journal میں 115 entries ہیں، idx 0 سے 114 تک؛ تمام متعلقہ SQL فائلیں موجود ہیں۔
- read-only database query کے مطابق 114 تبدیلیوں کا applied record ہے؛ تازہ timestamp `1794902569652` ہے، جو `0113_seller_quality_scores` سے ملتا ہے۔ Database record کا id `114`، journal کے idx `114` کا ثبوت نہیں؛ دونوں مختلف نمبرنگ ہیں۔
- `0109` سے `0113` کی موجودہ SQL فائلوں کے SHA-256 hashes اور timestamps تازہ applied records سے عین ملتے ہیں۔ اس محدود تقابل سے پوری تاریخی chain کی صحت ثابت نہیں ہوتی۔
- `0111_snapshot.json` موجود نہیں؛ دستیاب Git history میں بھی اس path کا سابقہ محفوظ revision نہیں ملا۔ خود ساختہ snapshot کو تاریخی بحالی کہنا درست نہیں ہوگا۔
- `0114_snapshot.json` کا prevId، `0113` کے id کے بجائے `0112` کے id کی طرف ہے؛ یہ حقیقی metadata discontinuity ہے۔
- `0114_catalog_openfoodfacts_pk` کا journal timestamp تازہ applied timestamp سے بڑا ہے؛ موجودہ applied history میں اس کے لاگو ہونے کا ریکارڈ نہیں۔ اس سے اس کے سابقہ ڈیٹا inserts کے موجود یا غیر موجود ہونے کا فیصلہ نہیں کیا گیا۔
- journal path کی دستیاب Git history میں 116 revisions ہیں۔ ٹول کی اندرونی حد یا انتخابی الگورتھم دستیاب نہیں؛ یہ تعداد اس error کی ثابت شدہ وجہ نہیں۔

## پچھلی تشریح کی تصحیح
گم snapshot، metadata discontinuity اور غیر درج شدہ آخری entry واقعی ملے ہیں، لیکن انھی کو tool error کی قطعی وجہ کہنا ثابت نہیں۔ غیر لاگو entry بذاتِ خود عام pending حالت بھی ہو سکتی ہے۔ ٹول کی اصل رکاوٹ verified historical revision منتخب نہ کر پانا ہے؛ کوئی محفوظ repair plan واپس نہیں آیا۔

## جانچ کی الگ حیثیت
- **Automated checks:** read-only Python جانچ نے journal paths، snapshot links، آخری 6 SQL hashes اور Git history کا تقابل کیا؛ مذکورہ findings سامنے آئیں۔ کوئی ایپ قاعدہ یا code تبدیل نہیں ہوا، اس لیے نئے unit tests یا پچھلے 285 tests کے دوبارہ پاس ہونے کا دعویٰ نہیں۔
- **Browser tests:** اس قدم میں نہیں چلائے؛ کام migration-history recovery تھا، کوئی صارف-facing screen یا action نہیں بدلا، اور browser ٹول کی recovery ثابت نہیں کر سکتا۔
- **Backend verification:** صرف SELECT کے ذریعے آخری 8 applied records اور مجموعی count/timestamp پڑھے؛ supported history inspection ناکام رہا، actual repair کی تصدیق ممکن نہیں ہوئی۔

## مطلوبہ اگلا قدم
Lovable کے پلیٹ فارم پر history inspection کو اس repository کی revision history سے قابلِ تصدیق repair plan بنانے کے قابل کرنا ہوگا، موجودہ applied SQL hashes محفوظ رکھتے ہوئے۔ اس قدم میں کوئی نئی شکایت یا feedback ارسال نہیں کی گئی؛ ایسا دعویٰ نہیں کیا جا رہا۔

اس کے بعد supported inspection دوبارہ چلائی جائے، اس کے فراہم کردہ plan کی جانچ اور مطلوبہ منظوری کے بعد ہی supported repair ہو۔ محض تاریخ حذف کرنا، fake applied rows لکھنا، اندازے سے snapshots بنانا یا SQL کو متبادل راستے سے چلانا نہیں کیا جائے گا۔ موجودہ restaurant/rider کی باقی server simplifications اسی بحالی تک زیرِ التوا ہیں۔