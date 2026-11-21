# منتخب حفاظتی نتائج — 2026-11-21

## حیثیت
**Fixed: 0 — Remaining: 3 (selected findings only).**

صرف صارف کے منتخب 3 نتائج کا جائزہ لیا گیا۔ کوئی دوسرا نتیجہ درست یا نظر انداز نہیں کیا گیا۔ اصلاح کو سرکاری migration tool سے لاگو کرنے کی کوشش ہوئی، مگر ٹول نے SQL چلانے سے پہلے snapshot collision پر روک دیا:

`drizzle-kit reported success but wrote no migration file under drizzle/migrations`

تفصیل میں `0113_snapshot.json` اور `0114_snapshot.json` کے ایک parent پر اشارے کی collision ہے۔ ٹول نے واضح بتایا: **The SQL was never run**۔ ناکام کوشش کے بعد Git working tree صاف تھا؛ database definitions اور اجازتیں دوبارہ پڑھ کر غیر تبدیل شدہ ہونے کی تصدیق ہوئی۔ دستی snapshot/journal ترمیم یا متبادل SQL execution نہیں کیا گیا۔

## منتخب مسائل اور تیار شدہ اصلاح
- **آرڈر رابطہ:** `get_order_customer_contact` کا `IF NOT (...)`، غیر مقررہ rider اور false staff/admin checks پر SQL NULL بن سکتا ہے؛ اس صورت میں deny branch نہیں چلتی۔ حل: اسی موجودہ authorization expression کو `IS NOT TRUE` سے fail closed کرنا؛ موجودہ مجاز rider/admin/city-scoped support اور dispatcher رسائی برقرار رکھنا۔
- **اندرونی مالی تفصیل:** `staff_financial_payload` کی براہِ راست authenticated EXECUTE اجازت غیر ضروری ہے۔ Browser code میں اس کا براہِ راست استعمال نہیں ملا؛ موجودہ authorized approval اور security-definer financial trigger اسے اندرونی طور پر چلاتے ہیں۔ حل: PUBLIC/anon/authenticated کی براہِ راست EXECUTE اجازت واپس لینا، service role اور function owner کے اندرونی استعمال کو برقرار رکھنا۔
- **سروس فراہم کنندگان کی فہرست:** `list_public_service_providers` اصل protected rows سے exact coordinates پڑھتا ہے؛ public listing کے لیے موجودہ `service_providers_public` پہلے ہی round کیے ہوئے coordinates اور phone-free fields دیتا ہے۔ حل: موجودہ signature برقرار رکھتے ہوئے SECURITY INVOKER سے اسی curated public view کو پڑھنا؛ فعال/category filters اور ranking برقرار رکھنا۔ Public view خود اس منتخب کام میں تبدیل نہیں کیا گیا۔

## جانچ
- **Automated checks:** read-only SQL میں authorization کی true/false/NULL کی 81 combinations آزمائیں؛ مجوزہ fail-closed expression کی 0 mismatches، پرانے pattern کی 15 غیر مجاز combinations ملیں۔ یہ expression regression ہے، deployed function کا کامیاب end-to-end test نہیں۔
- **Browser tests:** نہیں کیے؛ SQL لاگو نہیں ہوا، لہٰذا browser success کو fix کے ثبوت کے طور پر پیش نہیں کیا گیا۔ رابطوں یا مالی ریکارڈز پر حقیقی writes نہیں کیں۔
- **Backend verification:** منتخب functions کی definitions، execute permissions، public provider view، authorized approval کے اندرونی helper call اور application call sites پڑھے۔ ناکام migration کے بعد تینوں منتخب functions بدستور SECURITY DEFINER اور authenticated-callable ہیں؛ contact null-safe guard بدستور غیر موجود ہے۔

## اگلا قدم
پہلے supported migration-history repair سے snapshot collision حل ہونا لازم ہے؛ موجودہ rules کے مطابق snapshots/journal کو اندازے سے ہاتھ سے درست نہیں کرنا۔ پھر انہی منتخب 3 اصلاحات کو migration tool سے دوبارہ لاگو کر کے authenticated unrelated-user denial، assigned-rider success، scoped staff success، مالی helper کی direct-call denial/internal approval preservation اور provider-list readback کے end-to-end tests چلانے ہوں گے۔ کامیاب application اور verification سے پہلے کسی selected finding کو fixed یا ignored نہیں کیا جا سکتا۔

Security tool میں active رکھنے کا الگ operation موجود نہیں؛ status بدلنے والے operations صرف fixed اور ignored ہیں۔ خالی operations کے ساتھ tool call نے `at least one operation is required` کہہ کر درخواست مسترد کی؛ کوئی حیثیت تبدیل نہیں ہوئی۔ اصلاح لاگو نہ ہونے پر fixed یا ignored کا غلط دعویٰ نہیں کیا گیا۔

## متعلقہ راستوں کی دوبارہ جانچ
اصول: نجی آرڈر رابطے صرف متعلقہ مجاز افراد کو ملیں، بینک تفصیل بنانے والا اندرونی عمل عام صارف کے لیے براہِ راست دستیاب نہ ہو، اور عوامی سروس فہرست صرف عوامی معلومات دے۔ اس جانچ کی حد بھی صرف منتخب 3 findings ہے؛ دوسرے functions کی مجموعی سیکیورٹی certification نہیں۔

| مقام / راستہ | ابھی پڑھے گئے شواہد | اسی منتخب اصول کی حیثیت |
| --- | --- | --- |
| رائیڈر کے فوڈ آرڈر، کال/WhatsApp رابطہ | `RiderDashboard.tsx` assigned-user query، active-order `loadContact` اور `ContactStrip` | UI متعلقہ assigned orders مانگتا ہے؛ براہِ راست server call میں null-guard مسئلہ باقی ہے۔ |
| رائیڈر کے شاپ cart اور تصویری-list آرڈر | اسی dashboard کے الگ table reads اور contact calls؛ function کی دونوں branches | دونوں اسی کمزور server guard سے متاثر ہیں؛ مشترک function کی درستگی تینوں kinds پر لاگو ہوگی۔ |
| رائیڈر realtime refresh | dashboard میں rider-filtered updates اور `fetchData` | نیا الگ contact endpoint نہیں؛ وہی contact path دوبارہ استعمال ہوتا ہے۔ |
| ایڈمن وینڈر ادائیگی کی درخواست | `PayoutsTab.tsx` کا `requestPayment` اور deployed `request_secure_approval` | UI internal helper براہِ راست نہیں بلاتا؛ authorized wrapper پہلے vendor scope اور exact terms دیکھتا ہے، مگر helper کی غیر ضروری direct grant باقی ہے۔ |
| ایڈمن رائیڈر تنخواہ کی درخواست | `RiderPayTab.tsx` preview اور `requestPayment`؛ deployed approval wrapper | وہی اندرونی dependency، helper کی direct authenticated grant ہٹانے کی ضرورت؛ financial terms نہیں بدلے۔ |
| ایڈمن refund درخواست | `ApprovalsTab.tsx` اور deployed `staff_request_exact_refund` | scoped wrapper سے approval تک جاتا ہے؛ helper کی direct grant اس UI کے لیے ضروری نہیں۔ |
| وینڈر payout، rider salary، refund insert اور refund approval update | deployed `enforce_two_person_approval` اور اس کے 4 trigger definitions | helper function-owner context میں استعمال ہوتا ہے؛ proposed client revoke میں اس اندرونی عمل کو برقرار رکھنا ہے۔ Exact payload، expiry، single-use اور independent approval code موجود ہے؛ runtime certification نہیں۔ |
| سروسز، لاگ ان کے بعد nearby list / city/category / distance | `Services.tsx` اور deployed `list_public_service_providers` | فعال entries اور category filter موجود؛ exact coordinates واپس آنے کا مسئلہ برقرار۔ |
| سروسز، لاگ آؤٹ کے بعد وہی فہرست | `Services.tsx` کا الگ view path اور deployed `service_providers_public` | فون واپس نہیں کرتا، coordinates 2 decimals پر round ہیں؛ یہی موجودہ public-data contract لاگ ان والے function میں بھی استعمال ہونا چاہیے۔ Address field کی عمومی public policy اس منتخب کام میں نہیں بدلی۔ |
| Edge functions اور workflow jobs | `supabase/functions` اور `.github` میں تینوں exact function names کی مکمل recursive search | کوئی exact direct caller نہیں ملا؛ dynamic/بیرونی callers کی غیر موجودگی کا دعویٰ نہیں۔ Deployed public functions کے source search میں صرف مذکورہ approval اور trigger helper callers ملے۔ |
| موجودہ SQL regression fixture | `src/test/staffCasesRegression.sql` | helper براہِ راست بلاتا ہے؛ revoke کے بعد اسے authorized client کے بجائے privileged test context میں چلانا ہوگا۔ اس قدم میں fixture چلایا یا تبدیل نہیں کیا۔ |

اس اضافی قدم میں source/database definitions پڑھی گئیں، browser flows یا مالی actions نہیں چلائے گئے۔ کوئی settled/paid/refunded/closed record، setting، example data یا متعلقہ حد سے باہر permission نہیں بدلی۔ پہلے کی migration collision اور end-to-end verification کی پابندی برقرار ہے؛ Fixed 0، Remaining 3 منتخب نتائج۔