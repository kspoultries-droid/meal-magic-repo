import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Clock3, CheckCircle2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AdminListTools, AdminPagination } from "./AdminListTools";
import { CASE_DEPARTMENTS, CASE_STATUS, caseOverdue } from "@/lib/staffCases";
import type { Tables } from "@/integrations/supabase/types";

type Case = Tables<"staff_cases">;
const date = (v: string | null) => v ? new Date(v).toLocaleString("en-PK") : "مدت مقرر نہیں";
export default function StaffCasesTab({ onNavigate }: { onNavigate?: (section: string, sub?: string, query?: string) => void }) {
  const { user, isAdmin, permissions } = useAuth();
  const manager = isAdmin || permissions.includes("audit") || permissions.includes("team");
  const [health, setHealth] = useState<{ status?: string; finished_at?: string; error_code?: string }>({});
  const [rows, setRows] = useState<Case[]>([]);
  const [metrics, setMetrics] = useState<Tables<"staff_case_metrics">[]>([]);
  const [cities, setCities] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<{ user_id: string; full_name: string | null }[]>([]);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("open");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Case | null>(null);
  const [events, setEvents] = useState<Tables<"staff_case_events">[]>([]);
  const [reviews, setReviews] = useState<Tables<"staff_quality_reviews">[]>([]);
  const [note, setNote] = useState("");
  const [member, setMember] = useState("");
  const [review, setReview] = useState("satisfactory");
  const [improvement, setImprovement] = useState("");
  const [department, setDepartment] = useState("support");
  const [minutes, setMinutes] = useState("");
  const [rules, setRules] = useState<Tables<"staff_case_rules">[]>([]);
  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("staff_cases").select("*", { count: "exact" });
    if (mode === "mine" && user) q = q.eq("assignee_id", user.id).neq("status", "resolved");
    else if (mode === "overdue") q = q.neq("status", "resolved").lt("due_at", new Date().toISOString());
    else if (mode === "resolved") q = q.eq("status", "resolved");
    else q = q.neq("status", "resolved");
    const safe = query.replace(/[%,()]/g, " ").trim();
    if (safe) q = q.or(`title.ilike.%${safe}%,source_id.ilike.%${safe}%,next_action.ilike.%${safe}%`);
    const { data, error, count: total } = await q.order("due_at", { nullsFirst: false }).order("id").range((page - 1) * 20, page * 20 - 1);
    if (error) toast.error(error.message); else { setRows(data || []); setCount(total || 0); }
    const summary = await supabase.from("staff_case_metrics").select("*");
    setMetrics(summary.data || []);
    if (isAdmin) { const { data } = await supabase.rpc("staff_monitor_health"); if (data && typeof data === "object" && !Array.isArray(data)) setHealth(data); }
    setLoading(false);
  }, [mode, query, page, user?.id, isAdmin]);
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 60000); return () => clearInterval(timer); }, [load]);
  useEffect(() => {
    void supabase.from("cities").select("id,name").then(({ data }) => setCities(Object.fromEntries((data || []).map(c => [c.id, c.name]))));
    void supabase.rpc("staff_case_members").then(({ data }) => setMembers(data || []));
    void supabase.from("staff_case_rules").select("*").then(({ data }) => setRules(data || []));
  }, []);
  const history = async (c: Case) => {
    setSelected(c); setNote(""); setMember("");
    const { data: candidates } = await supabase.rpc("staff_case_candidates", { _case: c.id }); setMembers(candidates || []);
    const [e, r] = await Promise.all([supabase.from("staff_case_events").select("*").eq("case_id", c.id).order("created_at", { ascending: false }).limit(100), supabase.from("staff_quality_reviews").select("*").eq("case_id", c.id).order("created_at", { ascending: false })]);
    setEvents(e.data || []); setReviews(r.data || []);
  };
  const act = async (action: string) => {
    if (!selected || busy) return;
    setBusy(true);
    const { error } = await supabase.rpc("staff_case_action", { _id: selected.id, _action: action, _note: note || null, _member: member || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("کام کا ریکارڈ محفوظ ہوا"); setSelected(null); await load();
  };
  const reviewCase = async () => {
    if (!selected || busy) return;
    setBusy(true);
    const { error } = await supabase.rpc("staff_case_review", { _case: selected.id, _outcome: review, _note: note, _improvement_due: improvement || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    await history(selected); toast.success("جائزہ محفوظ ہوا");
  };
  const saveRule = async () => {
    const n = minutes === "" ? null : Number(minutes);
    const { error } = await supabase.rpc("staff_set_case_rule", { _department: department, _minutes: n });
    if (error) return toast.error(error.message);
    const { data } = await supabase.from("staff_case_rules").select("*"); setRules(data || []); toast.success("مدت محفوظ ہوئی");
  };
  const memberName = (id: string | null) => members.find(m => m.user_id === id)?.full_name || (id ? id.slice(0, 8) : "غیر تفویض شدہ");
  const sum = (key: "open_cases" | "overdue_cases" | "resolved_cases" | "reopened_cases") => metrics.reduce((n, m) => n + Number(m[key] || 0), 0);
  const openSource = (c: Case) => {
    const target: Record<string, [string, string]> = { orders: ["operations", "orders"], grocery_cart_orders: ["operations", "grocery-dispatch"], grocery_list_orders: ["operations", "photo-orders"], support_tickets: ["operations", "support"], partner_applications: ["partners", "applications"], rider_remittances: ["finance", "rider-remit"], bank_ledger: ["finance", "banks"] };
    const t = target[c.source_kind]; if (t) { setSelected(null); onNavigate?.(t[0], t[1], c.source_id); }
  };
  return <section dir="rtl" className="space-y-4">
    <div className="flex items-center justify-between border-b pb-3"><h2 className="font-bold">آج کا کام اور نگرانی</h2><Button size="icon" variant="outline" aria-label="کام تازہ کریں" onClick={() => void load()}><RefreshCw className="size-4" /></Button></div>
    {isAdmin && <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-xs"><span>خودکار نگرانی: {health.status === "ok" ? "کامیاب" : health.status === "failed" ? "نامکمل؛ دوبارہ جانچ درکار" : "ابھی جانچ نہیں ہوئی"} · {date(health.finished_at || null)}</span><Button size="sm" variant="outline" disabled={busy} onClick={async () => { setBusy(true); const { error } = await supabase.rpc("staff_run_monitor_now"); setBusy(false); if (error) toast.error(error.message); await load(); }}>نگرانی دوبارہ چلائیں</Button></div>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["کھلے کیس", sum("open_cases")], ["تاخیر", sum("overdue_cases")], ["حل شدہ", sum("resolved_cases")], ["دوبارہ کھلے", sum("reopened_cases")]].map(([label, value]) => <div className="border-s-2 border-primary ps-3" key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>)}</div>
    <Tabs value={mode} onValueChange={v => { setMode(v); setPage(1); }}><TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="open">تمام کھلے</TabsTrigger><TabsTrigger value="mine">میرے کام</TabsTrigger><TabsTrigger value="overdue">تاخیر</TabsTrigger><TabsTrigger value="resolved">حل شدہ</TabsTrigger></TabsList></Tabs>
    <AdminListTools query={query} count={count} onQuery={v => { setQuery(v); setPage(1); }} />
    {loading ? <p className="text-sm text-muted-foreground">کام آ رہے ہیں…</p> : rows.length === 0 ? <p className="py-6 text-center text-muted-foreground">کوئی کیس نہیں ملا</p> : <div className="divide-y border-y">{rows.map(c => <div key={c.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto]">
      <div className="min-w-0"><div className="flex flex-wrap gap-2"><strong className="text-sm">{c.title}</strong><Badge variant={caseOverdue(c) ? "destructive" : "secondary"}>{CASE_STATUS[c.status]}</Badge><Badge variant="outline">{CASE_DEPARTMENTS[c.department]}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{cities[c.city_id || ""] || "مرکزی جائزہ / شہر نامعلوم"} · #{c.source_id.slice(0, 8)}</p><p className="mt-2 flex items-center gap-1 text-xs"><UserRound className="size-3" />{memberName(c.assignee_id)} · <Clock3 className="size-3" />{date(c.due_at)}</p><p className="mt-1 text-sm">{c.next_action}</p>{c.blocked_reason && <p className="text-xs text-destructive">رکاوٹ: {c.blocked_reason}</p>}</div>
      <div className="flex items-start gap-2">{!c.assignee_id && c.status !== "resolved" && <Button size="sm" disabled={busy} onClick={async () => { setBusy(true); const { error } = await supabase.rpc("staff_case_action", { _id: c.id, _action: "claim" }); setBusy(false); if (error) toast.error(error.message); else await load(); }}>ذمہ داری لیں</Button>}<Button size="sm" variant="outline" onClick={() => void history(c)}>تفصیل</Button></div>
    </div>)}</div>}
    <AdminPagination page={page} count={count} onPage={setPage} />
    {manager && <div className="border-t pt-4"><h3 className="mb-3 text-sm font-bold">شہر اور شعبہ وار نتائج</h3><div className="overflow-x-auto"><table className="w-full text-right text-xs"><thead><tr className="border-b"><th className="p-2">شہر / شعبہ</th><th>ذمہ دار</th><th>کھلے</th><th>تاخیر</th><th>بروقت حل</th><th>رکاوٹ</th></tr></thead><tbody>{metrics.map((m, i) => <tr key={i} className="border-b"><td className="p-2">{cities[m.city_id || ""] || "مرکزی"} / {CASE_DEPARTMENTS[m.department || ""]}</td><td>{memberName(m.assignee_id)}</td><td>{m.open_cases}</td><td className="text-destructive">{m.overdue_cases}</td><td>{m.on_time_resolved} / {m.resolved_cases}</td><td>{m.blocked_cases}</td></tr>)}</tbody></table></div></div>}
    {isAdmin && <div className="space-y-2 border-t pt-4"><h3 className="text-sm font-bold">شعبے کی آخری مدت</h3><div className="flex flex-wrap gap-2"><select aria-label="شعبہ" className="rounded-md border bg-background p-2 text-sm" value={department} onChange={e => { setDepartment(e.target.value); setMinutes(String(rules.find(r => r.department === e.target.value)?.sla_minutes ?? "")); }}>{Object.entries(CASE_DEPARTMENTS).map(([k,v]) => <option value={k} key={k}>{v}</option>)}</select><Input aria-label="مدت منٹ" className="w-32" type="number" min="1" placeholder="منٹ" value={minutes} onChange={e => setMinutes(e.target.value)} /><Button onClick={() => void saveRule()}>مدت محفوظ کریں</Button></div><div className="flex flex-wrap gap-2">{rules.map(r => <Badge variant="outline" key={r.department}>{CASE_DEPARTMENTS[r.department]}: {r.sla_minutes ?? "—"} منٹ</Badge>)}</div></div>}
    <Dialog open={!!selected} onOpenChange={o => { if (!o && !busy) setSelected(null); }}><DialogContent aria-describedby={undefined} className="max-h-[85dvh] overflow-y-auto sm:max-w-xl" dir="rtl"><DialogHeader><DialogTitle>{selected?.title}</DialogTitle></DialogHeader>{selected && <div className="space-y-3"><p className="text-xs">{memberName(selected.assignee_id)} · آخری وقت: {date(selected.due_at)}</p><p className="break-all text-xs text-muted-foreground">{selected.source_id}</p><Button size="sm" variant="outline" onClick={() => openSource(selected)}>اصل معاملہ</Button>{selected.resolution && <p className="text-sm">حل: {selected.resolution}</p>}<Input aria-label="اگلا قدم یا ثبوت" placeholder="اگلا قدم، رکاوٹ، حل کا ثبوت یا جائزہ" value={note} onChange={e => setNote(e.target.value)} /><div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy} onClick={() => void act("next")}>اگلا قدم</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void act("block")}>رکاوٹ درج کریں</Button><Button size="sm" disabled={busy} onClick={() => void act("resolve")}><CheckCircle2 className="size-3" />حل کی تصدیق</Button>{manager && <Button size="sm" variant="outline" disabled={busy} onClick={() => void act("reopen")}>دوبارہ کھولیں</Button>}</div><div className="flex flex-wrap gap-2"><select aria-label="حوالگی کا فرد" className="max-w-full flex-1 rounded-md border bg-background p-2 text-xs" value={member} onChange={e => setMember(e.target.value)}><option value="">فرد منتخب کریں</option>{members.map(m => <option value={m.user_id} key={m.user_id}>{m.full_name || m.user_id.slice(0,8)}</option>)}</select><Button size="sm" disabled={busy} onClick={() => void act("handoff")}>حوالگی</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void act("backup")}>متبادل</Button></div><div className="space-y-2 border-t pt-3"><h3 className="text-sm font-bold">آزاد معیار اور نظرثانی</h3><select aria-label="جائزے کا نتیجہ" className="w-full rounded-md border bg-background p-2 text-xs" value={review} onChange={e => setReview(e.target.value)}>{manager && <><option value="satisfactory">تسلی بخش</option><option value="coaching">تربیت / بہتری</option><option value="investigate">تحقیق درکار، جرم ثابت نہیں</option></>}<option value="appeal">فرد کی وضاحت / نظرثانی</option></select><Input aria-label="بہتری کی تاریخ" type="date" value={improvement} onChange={e => setImprovement(e.target.value)} /><Button size="sm" disabled={busy} onClick={() => void reviewCase()}>جائزہ درج کریں</Button>{reviews.map(r => <div key={r.id} className="border-s-2 border-muted ps-2 text-xs"><strong>{r.outcome}</strong><p>{r.note}</p>{r.improvement_due && <p>{r.improvement_due}</p>}</div>)}</div><div className="space-y-2 border-t pt-3"><h3 className="text-sm font-bold">محفوظ تاریخ</h3>{events.map(e => <div key={e.id} className="border-b pb-2 text-xs"><span className="font-semibold">{e.action}</span> · {date(e.created_at)}<p>{e.note}</p></div>)}</div></div>}</DialogContent></Dialog>
  </section>;
}