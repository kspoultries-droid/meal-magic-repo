import { tr } from "@/lib/i18n/tr";
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
 const save=async()=>{const p=companySchema.safeParse(form);if(!p.success){toast.error(p.error.issues[0]?.message);return;}setBusy(true);const {error}=await supabase.rpc("save_company_settings",{_values:p.data});setBusy(false);if(error){toast.error(error.message);return;}await client.invalidateQueries({queryKey:["company-settings"]});toast.success(tr("Company info saved", "کمپنی معلومات محفوظ ہو گئیں"));};
 const groups:[string,[keyof typeof form,string][]][]=[
 [tr("Company & Contact", "کمپنی اور رابطہ"),[["company_about",tr("About Company", "کمپنی کا تعارف")],["company_address",tr("Office Address", "دفتر کا پتہ")],["helpline_phone",tr("Helpline (+92...)", "ہیلپ لائن (+92...)")],["whatsapp_number",tr("WhatsApp (+92...)", "واٹس ایپ (+92...)")],["contact_email",tr("Contact Email", "رابطہ ای میل")],["company_careers",tr("Careers https Link", "ملازمتوں کا https لنک")],["company_blog",tr("Blog https Link", "بلاگ کا https لنک")]]],
 [tr("Social Media", "سوشل میڈیا"),[["social_facebook",tr("Facebook https Link", "Facebook https لنک")],["social_instagram",tr("Instagram https Link", "Instagram https لنک")],["social_x",tr("X https link", "X https لنک")]]],
 [tr("Legal Information", "قانونی معلومات"),[["legal_terms",tr("Terms & Conditions", "شرائط و ضوابط")],["legal_privacy",tr("Privacy Policy", "رازداری کی پالیسی")],["legal_cookies",tr("Cookie Policy", "کوکی پالیسی")]]]];
 if(isLoading)return <p>{tr("Loading…", "لوڈ ہو رہا ہے…")}</p>;if(error)return <p role="alert">{tr("Could not load information.", "معلومات نہیں کھل سکیں۔")}</p>;
 return <form className="space-y-6 max-w-3xl" onSubmit={e=>{e.preventDefault();void save();}}>{groups.map(([title,fields])=><section key={title} className="border-b pb-5 space-y-3"><h2 className="font-bold">{title}</h2>{fields.map(([key,label])=><div key={key} className="space-y-1"><Label htmlFor={key}>{label}</Label>{key==="company_about"||key.startsWith("legal_")?<Textarea id={key} rows={6} maxLength={key.startsWith("legal_")?20000:10000} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/>:<Input id={key} maxLength={500} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/>}</div>)}</section>)}<Button disabled={busy} type="submit">{busy?tr("Saving…", "محفوظ ہو رہا ہے…"):tr("Save", "محفوظ کریں")}</Button></form>;
}