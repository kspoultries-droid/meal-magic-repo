# پوری ایپ میں نام کی تلاش کا جائزہ

## اصول
رومن اردو، اردو یا معمولی غلط ہجے سے متعلقہ چیز صرف سخت لفظی فلٹر کی وجہ سے غائب نہ ہو۔ قیمت، دستیابی، مقام، منتخب کیٹیگری اور مجاز رسائی کے اپنے قواعد برقرار رہیں۔ فون، بارکوڈ، آرڈر نمبر اور مالی حوالہ شناخت ہیں؛ ان میں اندازے سے دوسرے ریکارڈ کا انتخاب نہ ہو۔

## پڑھ کر جانچے گئے راستے
| راستہ | نتیجہ |
|---|---|
| گروسری `/grocery`، مصنوعات اور دکان کے نام | پچھلی اصلاح برقرار؛ نام کا سخت سرور فلٹر نہیں، دستیاب اور اہل دکانوں کی محدود candidate فہرست پر موجودہ نرم مماثلت۔ اصل اشیا کے 4 اردو/انگریزی موبائل/ڈیسک ٹاپ flows بھی پہلے جانچے۔ |
| بازار `/wholesale` اور `/bazar` | مصنوعات، دکان اور کیٹیگری پر موجودہ `matchesSearch`؛ پہلے سخت لفظی فلٹر نہیں۔ پہلی 1000 search candidates کی موجودہ حد کو مکمل عالمی تلاش نہیں کہا گیا۔ |
| فوڈ ہوم `/` اور `/index` | مشترک RestaurantGrid میں substring کی جگہ موجودہ نرم مماثلت؛ restaurant results اور quick-menu items دونوں بدلے۔ |
| فوڈ `/search` | یہی مشترک RestaurantGrid؛ الگ انداز کا صفحہ بھی پڑھا اور براؤزر میں جانچا۔ |
| ڈش کیٹیگری `/category/:slug` | اسی grid کا dishes-only راستہ نرم مماثلت استعمال کرتا ہے؛ کیٹیگری برقرار۔ |
| ریسٹورنٹ، گروسری اور standalone دکان کی تفصیل | ان صفحات میں آزاد item text search موجود نہیں؛ category browsing، دستیابی اور selection ہی ہیں۔ نئے search controls نہیں بنائے۔ |
| ہوم سروسز `/services` | سخت server name filter ہٹا کر موجودہ شہر/کیٹیگری کے پڑھے گئے نتائج پر نرم name search؛ پرانی درخواست کا دیر سے جواب نئی تلاش نہیں مٹاتا۔ |
| ریسٹورنٹ مالک کا Menu | loaded owner menu پر نرم name search؛ writes، قیمت اور ownership نہیں بدلے۔ |
| ایڈمن GroceryTab، retail/wholesale shops اور مصنوعات | مصنوعات اور business names نرم مماثلت؛ shop ID کی پرانی substring شناخت الگ برقرار۔ |
| shop Stock quick editor اور catalog bulk picker | پہلے ہی نام/اردو نام/category/brand پر نرم مماثلت؛ کوئی تبدیلی ضروری نہیں۔ |
| shared catalog کی فوری name lookup / ProductQuickFill | سخت server substring کے بجائے محدود catalog pool پر نرم مماثلت؛ barcode کی exact lookup، verified-photo ضابطہ اور draft-only selection برقرار۔ |
| admin Standard Menu / CatalogManagerTab | پہلے سے نرم مماثلت، filter کے بعد pagination؛ کوئی تبدیلی نہیں۔ |
| admin اشتہار / AdProductPicker، restaurant/shop/service اور item modes | search candidates پر نرم مماثلت کے بعد 12-row pagination؛ معمول کی بغیر تلاش فہرست کی server pagination برقرار۔ انتخاب صرف اشتہاری draft ہے۔ |
| Bazar cards / BazarTargetPicker، product اور shop modes | active/available شرط برقرار؛ نرم name match کے بعد 12 نتائج؛ موجودہ canonical product/shop link برقرار۔ |
| ایڈمن مشترکہ تلاش / AdminSearch | business/customer/phone/order-ID record locator ہے، product search نہیں؛ permissions، UUID/phone قواعد یا server ranges نہیں بدلے۔ |
| ایڈمن food/grocery dispatch، photo orders، partner dispatch، support اور rider-pay | operational records/IDs/پتے/لوگ تلاش کرتے ہیں، product catalog نہیں؛ متعلقہ code پڑھا، pagination/شناخت/مالی و مجاز کارروائیاں نہیں بدلیں۔ ان میں ہر نام کے لیے typo support کا دعویٰ نہیں۔ |
| خریداری کا AI مددگار | server code پڑھا: پہلے model اردو/رومن/انگریزی request کو متعدد product keywords میں بدلتا ہے، پھر substring catalog query۔ یہ direct Grocery regression والا راستہ نہیں؛ ہر misspelling کی ضمانت نہیں۔ server freeze کے دوران function نہیں بدلا اور اس مرحلے میں paid/model call نہیں چلائی۔ |
| remittance-slip-check | مالی حوالہ کی duplicate شناخت ہے، مصنوعات کے نام کی تلاش نہیں؛ اس کا exact reference comparison برقرار۔ |
| باقی background jobs / database functions | function sources میں `ilike`، text-query اور similarity کی read-only تلاش سے public database میں کوئی ایسا search function نہیں ملا؛ repository server paths میں product-name search shopping-assistant میں ہے۔ dispatch/payment/route jobs product-search consumers نہیں۔ |

## براؤزر جانچ
- اصل فوڈ menus میں `بریانی`، `biryani`، `biryanii`: ہوم، الگ search اور biryani category، موبائل/ڈیسک ٹاپ؛ result/quick-menu/dish readback۔
- اصل Home Services میں `kar wash`، `car was`، `کار واش`: موبائل/ڈیسک ٹاپ؛ حقیقی Car Wash نتیجہ اور booking drawer کھولا، booking جمع نہیں کی۔
- authenticated admin پر اشتہاری service picker میں `car was`، shop product draft میں catalog `cheeni`، Bazar card picker میں `daldda`؛ موبائل/ڈیسک ٹاپ، اصل records چنے مگر کوئی ad/product/card محفوظ نہیں کیا۔
- اصل مالک کے restaurant menu میں `biryanii` سے 11 Biryani items ملیں؛ admin GroceryTab میں `suger` سے اصل Sugar item ملا۔
- ہر نئی selection کی screenshot پڑھی؛ public/tool scripts میں runtime page errors نہیں ملے۔ عملی جانچ ان مذکورہ flows کی ہے، پوری ایپ کی ہر شناختی تلاش کی نہیں۔

## خودکار اور سرور جانچ
372 ٹیسٹ، 80 suites پاس؛ build OK۔ 4 نئے regressions: Urdu-only catalog candidate، misspelled Bazar product، cross-script shop، fuzzy filter-before-pagination ad selection۔ اصل Grocery کے پچھلے 368 ٹیسٹ اور 4 live viewport/language flows بھی برقرار۔

Backend صرف پڑھا؛ schema/functions/RLS، catalog evidence، prices، settings، roles، orders اور settled records نہیں بدلے۔

## واضح حدود
- یہ bounded candidate reads کی محفوظ frontend اصلاح ہے؛ 3000 rows کی حد یا hosted response cap سے باہر ہر item ملنے کی ضمانت نہیں۔ موجودہ Food/Services کی hosted response cap بھی الگ scalability حد ہے۔ مکمل index-backed cross-script/fuzzy search future server کام ہوگا، موجودہ migration blocker کے دوران متبادل SQL route نہیں اپنایا۔
- AI keywords کی fuzzy fallback اور operational names کی مکمل typo search اس مرحلے میں نہیں بنائی؛ انہیں verified universal search نہیں کہا گیا۔
- native Android keyboard/camera، rider delivery یا payment certification تلاش کے اس کام میں نہیں کی؛ پچھلے device/server blockers اپنی جگہ ہیں۔