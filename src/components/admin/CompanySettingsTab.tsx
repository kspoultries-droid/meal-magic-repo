import { useEffect,useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { companyDefaults,companySchema } from "@/lib/companySettings";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
export default function CompanySettingsTab(){
 const {data,isLoading,error}=useCompanySettings();const client=useQueryClient();const [form,setForm]=useState(companyDefaults);const [busy,setBusy]=useState(false);
 useEffect(()=>{if(data)setForm(data);},[data]);
 const save=async()=>{const p=companySchema.safeParse(form);if(!p.success){toast.error(p.error.issues[0]?.message);return;}setBusy(true);const {error}=await supabase.rpc("save_company_settings",{_values:p.data});setBusy(false);if(error){toast.error(error.message);return;}await client.invalidateQueries({queryKey:["company-settings"]});toast.success("کمپنی معلومات محفوظ ہو گئیں");};
 const groups:[string,[keyof typeof form,string][]][]=[
 ["کمپنی اور رابطہ",[["company_about","کمپنی کا تعارف"],["company_address","دفتر کا پتہ"],["helpline_phone","ہیلپ لائن (+92...)"],["whatsapp_number","واٹس ایپ (+92...)"],["contact_email","رابطہ ای میل"],["company_careers","ملازمتوں کا https لنک"],["company_blog","بلاگ کا https لنک"]]],
 ["سوشل میڈیا",[["social_facebook","Facebook https لنک"],["social_instagram","Instagram https لنک"],["social_x","X https لنک"]]],
 ["قانونی معلومات",[["legal_terms","شرائط و ضوابط"],["legal_privacy","رازداری کی پالیسی"],["legal_cookies","کوکی پالیسی"]]]];
 if(isLoading)return <p>لوڈ ہو رہا ہے…</p>;if(error)return <p role="alert">معلومات نہیں کھل سکیں۔</p>;
 return <form className="space-y-6 max-w-3xl" onSubmit={e=>{e.preventDefault();void save();}}>{groups.map(([title,fields])=><section key={title} className="border-b pb-5 space-y-3"><h2 className="font-bold">{title}</h2>{fields.map(([key,label])=><div key={key} className="space-y-1"><Label htmlFor={key}>{label}</Label>{key==="company_about"||key.startsWith("legal_")?<Textarea id={key} rows={6} maxLength={key.startsWith("legal_")?20000:10000} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/>:<Input id={key} maxLength={500} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/>}</div>)}</section>)}<Button disabled={busy} type="submit">{busy?"محفوظ ہو رہا ہے…":"محفوظ کریں"}</Button></form>;
}