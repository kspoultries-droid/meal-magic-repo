# آرڈر لائیو اپڈیٹ اور موبائل صفحات کی درستگی

## کیا بدلے گا
- ایڈمن کے آپریشنز آرڈر ٹیب میں نئے آرڈر اور ہر status تبدیلی فوراً اسی قطار میں دکھائی جائے گی۔
- Realtime رابطہ عارضی طور پر منقطع ہو تو خاموش وقفہ وار sync fallback تازہ status برقرار رکھے گا، مگر پورا پینل flicker/reload نہیں ہوگا۔
- آرڈر ٹیب پہلی بار کھلنے پر خالی رہنے کے بجائے فوری data load کرے گا۔
- چیک آؤٹ کی notification اوپر رکھی جائے گی اور نیچے کا confirm button محفوظ جگہ، safe-area اور واضح layering کے ساتھ ہمیشہ نظر آئے گا۔
- Order placed/confirmation صفحہ مختصر کیا جائے گا: چھوٹا success header، compact summary/address، مختصر اگلے مراحل، اور Home/Track buttons نیچے ہمیشہ visible رہیں گے۔

## تکنیکی تفصیل
- `orders` Realtime payload کو local state میں merge کیا جائے گا؛ insert/update/delete الگ handle ہوں گے۔
- full loading صرف ابتدائی load پر ہوگا؛ background refresh موجودہ فہرست کو غائب نہیں کرے گا۔
- subscription status کے ساتھ controlled fallback refresh اور cleanup شامل ہوگا۔
- mobile viewport پر sticky actions کے لیے dynamic viewport اور safe-area spacing استعمال ہوگی۔
- متعلقہ tests/type checks اور 411×765 mobile visual check چلایا جائے گا۔
