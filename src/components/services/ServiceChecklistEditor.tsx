import {useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Switch} from '@/components/ui/switch';
import {useLanguage} from '@/contexts/LanguageContext';
import {defaultServiceChecklist,ServiceCheck} from '@/lib/serviceChecklists';
import {Plus,Trash2,Save} from 'lucide-react';
import {toast} from 'sonner';
export default function ServiceChecklistEditor({categories,onSaved}:{categories:any[];onSaved:()=>void}) {
 const {lang}=useLanguage();const L=(en:string,ur:string)=>lang==='ur'?ur:en;const [id,setId]=useState('');const [items,setItems]=useState<ServiceCheck[]>([]);const [busy,setBusy]=useState(false);
 const choose=(v:string)=>{setId(v);const c=categories.find(c=>c.id===v);setItems(Array.isArray(c?.work_checklist)&&c.work_checklist.length?c.work_checklist:defaultServiceChecklist(c?.name||''));};
 const save=async()=>{setBusy(true);const {error}=await supabase.rpc('set_service_checklist',{_category_id:id,_items:items as any});setBusy(false);if(error)toast.error(error.message);else{toast.success(L('Checklist saved','چیک لسٹ محفوظ ہو گئی'));onSaved();}};
 return <section className="space-y-4"><select aria-label={L('Checklist category','چیک لسٹ کا شعبہ')} value={id} onChange={e=>choose(e.target.value)} className="w-full border rounded-md p-2 bg-background"><option value="">{L('Select category','شعبہ منتخب کریں')}</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>{id&&<>{items.map((i,n)=><div key={i.id} className="border-b py-3 space-y-2"><div className="flex items-center justify-between"><b className="text-sm">{n+1}</b><div className="flex items-center gap-2 text-xs">{L('Required','لازمی')}<Switch checked={i.required} onCheckedChange={v=>setItems(items.map(x=>x.id===i.id?{...x,required:v}:x))}/><Button size="icon" variant="ghost" aria-label={L('Remove check','نکتہ ہٹائیں')} onClick={()=>setItems(items.filter(x=>x.id!==i.id))}><Trash2 className="h-4 w-4"/></Button></div></div><Input aria-label={`English ${n+1}`} value={i.en} onChange={e=>setItems(items.map(x=>x.id===i.id?{...x,en:e.target.value}:x))}/><Input aria-label={`اردو ${n+1}`} value={i.ur} dir="rtl" onChange={e=>setItems(items.map(x=>x.id===i.id?{...x,ur:e.target.value}:x))}/></div>)}<div className="flex gap-2"><Button variant="outline" disabled={items.length>=30} onClick={()=>setItems([...items,{id:crypto.randomUUID(),en:'',ur:'',required:true}])}><Plus className="h-4 w-4 me-1"/>{L('Add check','نکتہ شامل کریں')}</Button><Button disabled={busy||!items.length} onClick={()=>void save()}><Save className="h-4 w-4 me-1"/>{L('Save checklist','چیک لسٹ محفوظ کریں')}</Button></div></>}</section>;
}
