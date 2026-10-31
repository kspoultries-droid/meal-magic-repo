export type ServiceCheck = { id: string; en: string; ur: string; required: boolean };
export function defaultServiceChecklist(name: string): ServiceCheck[] {
 const item=(id:string,en:string,ur:string):ServiceCheck=>({id,en,ur,required:true});
 const common=[item('scope','Confirm job scope and customer consent','کام کی حدود اور گاہک کی اجازت کی تصدیق'),item('safety','Check site safety and protective equipment','جگہ کی حفاظت اور حفاظتی سامان کی جانچ')];
 let specific:ServiceCheck[];
 if (/poultry/i.test(name)) specific=[item('biosecurity','Follow farm biosecurity and entry hygiene','فارم کی حیاتیاتی حفاظت اور داخلے کی صفائی'),item('ventilation','Check ventilation before entering work area','کام کی جگہ میں داخلے سے پہلے ہوا کی جانچ')];
 else if (/AC/i.test(name)) specific=[item('power','Isolate electrical power before repair','مرمت سے پہلے بجلی بند کریں'),item('leak','Check leaks, drainage and cooling performance','لیک، نکاسی اور ٹھنڈک کی جانچ')];
 else if (/electric/i.test(name)) specific=[item('power','Isolate and verify power is off','بجلی بند کرکے تصدیق کریں'),item('wiring','Check wiring, earthing and load safety','وائرنگ، ارتھنگ اور لوڈ کی حفاظت')];
 else if (/\bcar\b/i.test(name)) specific=[item('vehicle','Confirm vehicle model and requested work','گاڑی کا ماڈل اور مطلوبہ کام کی تصدیق'),item('materials','Confirm oil brand or parts before use','استعمال سے پہلے آئل برانڈ یا پرزوں کی تصدیق'),item('station','Confirm station visit when car wash is booked','کار واش کی بکنگ پر اسٹیشن وزٹ کی تصدیق')];
 else if (/water|plumb/i.test(name)) specific=[item('supply','Check water source and isolate supply if needed','پانی کا ذریعہ دیکھیں اور ضرورت پر سپلائی بند کریں'),item('leak','Check leaks, flow and sanitation','لیک، بہاؤ اور صفائی کی جانچ')];
 else if (/clean/i.test(name)) specific=[item('surface','Confirm tank or solar cleaning scope','ٹینکی یا سولر کی صفائی کی حدود طے کریں'),item('isolation','Isolate power/water and prevent contamination','بجلی یا پانی بند کریں اور آلودگی سے بچائیں')];
 else if (/paint/i.test(name)) specific=[item('surface','Protect furniture and prepare surfaces','فرنیچر محفوظ کرکے سطح تیار کریں'),item('materials','Confirm paint type, colour and finish','پینٹ کی قسم، رنگ اور فنش کی تصدیق')];
 else if (/carpent/i.test(name)) specific=[item('measure','Confirm dimensions and material','پیمائش اور مواد کی تصدیق'),item('tools','Secure tools and inspect fittings','اوزار محفوظ رکھیں اور فٹنگ دیکھیں')];
 else specific=[item('tools','Confirm tools, materials and safe lifting','اوزار، سامان اور محفوظ وزن اٹھانے کی تصدیق'),item('work','Check dimensions and agreed work quality','پیمائش اور طے شدہ کام کے معیار کی جانچ')];
 return [...common,...specific,item('test','Test finished work with customer','گاہک کے ساتھ مکمل کام کی جانچ'),item('bill','Attach final bill and leave site clean','حتمی بل شامل کریں اور جگہ صاف چھوڑیں')];
}
export function checklistComplete(items:ServiceCheck[],done:string[]) {return items.filter(i=>i.required).every(i=>done.includes(i.id));}
export function canReplaceService(status:string,advancePaid:boolean) {return !['completed','cancelled'].includes(status)&&!advancePaid;}
