import { Link } from "react-router-dom";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { safeCompanyLink } from "@/lib/companySettings";
export default function Footer(){
 const {data}=useCompanySettings();const {lang,dir}=useLanguage();const L=(en:string,ur:string)=>lang==="ur"?ur:en;
 const external=(value:string|undefined,label:string)=>{const href=safeCompanyLink(value);return href?<li key={label}><a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-background">{label}</a></li>:null;};
 return <footer className="bg-foreground text-background/70 py-10" dir={dir}><div className="container mx-auto px-4"><div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
 <section><h4 className="text-background font-bold mb-3">{L("Company","کمپنی")}</h4><ul className="space-y-2 text-sm"><li><Link to="/company/about">{L("About EasyLife","ایزی لائف کا تعارف")}</Link></li>{external(data?.company_careers,L("Careers","ملازمتیں"))}{external(data?.company_blog,L("Blog","بلاگ"))}</ul></section>
 <section><h4 className="text-background font-bold mb-3">{L("Contact","رابطہ")}</h4><ul className="space-y-2 text-sm"><li><Link to="/company/contact">{L("Contact & help","رابطہ اور مدد")}</Link></li><li><Link to="/partner">{L("Become a partner","پارٹنر بنیں")}</Link></li></ul></section>
 <section><h4 className="text-background font-bold mb-3">{L("Legal","قانونی")}</h4><ul className="space-y-2 text-sm">{[["terms","Terms & conditions","شرائط و ضوابط"],["privacy","Privacy policy","رازداری کی پالیسی"],["cookies","Cookie policy","کوکی پالیسی"]].map(([path,en,ur])=><li key={path}><Link to={`/company/${path}`}>{L(en,ur)}</Link></li>)}</ul></section>
 <section><h4 className="text-background font-bold mb-3">{L("Follow us","ہمیں فالو کریں")}</h4><ul className="space-y-2 text-sm">{external(data?.social_facebook,"Facebook")}{external(data?.social_instagram,"Instagram")}{external(data?.social_x,"X")}{!safeCompanyLink(data?.social_facebook)&&!safeCompanyLink(data?.social_instagram)&&!safeCompanyLink(data?.social_x)&&<li className="text-xs">{L("No published social links yet","سماجی لنکس ابھی شائع نہیں ہوئے")}</li>}</ul></section>
 </div><div className="border-t border-background/10 pt-6 text-center text-xs">© 2026 EasyLife. {L("All rights reserved.","جملہ حقوق محفوظ ہیں۔")}</div></div></footer>;
}
