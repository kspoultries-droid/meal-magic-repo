import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { eligibleApprovals } from "@/lib/adminApproval";
import { AdminListTools, AdminPagination } from "./AdminListTools";
import { approvalUsable } from "@/lib/staffCases";

const KIND: Record<string, string> = { refund: "ریفنڈ", payout: "وینڈر ادائیگی", other: "دیگر" };
const STATUS: Record<string, string> = { pending: "زیر التوا", approved: "منظور", rejected: "مسترد" };

const ApprovalsTab = () => {
  const db = supabase as any;
  const { user, permissions } = useAuth();
  const canApprove = permissions.includes("approve");
  const [rows, setRows] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    let q = db.from("approval_requests").select("*", { count: "exact" }).order("created_at", { ascending: false }).order("id");
    const safe = query.replace(/[%,()]/g, " ").trim();
    if (safe) q = q.or(`reference_id.ilike.%${safe}%,note.ilike.%${safe}%`);
    const { data, count } = await q.range((page - 1) * 20, page * 20 - 1);
    setCount(count || 0);
    setRows(data || []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("approvals").on("postgres_changes", { event: "*", schema: "public", table: "approval_requests" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [page, query]);

  const decide = async (id: string, approve: boolean) => {
    const n = approve ? "" : window.prompt("مسترد کرنے کی وجہ") || "";
    const { error } = await db.rpc("decide_approval", { _id: id, _approve: approve, _note: n });
    if (error) return toast.error(error.message.includes("own") ? "اپنی درخواست خود منظور نہیں کر سکتے" : error.message);
    toast.success(approve ? "منظور کر دیا" : "مسترد کر دیا");
  };

  const [count, setCount] = useState(0);
  const filtered = rows;
  const eligible = eligibleApprovals(filtered.filter(r => approvalUsable(r)), filtered.map(r => r.id), user?.id, canApprove);
  const bulkApprove = async () => {
    if (busy) return;
    const targets = eligibleApprovals(rows.filter(r => approvalUsable(r)), selected, user?.id, canApprove);
    if (!targets.length || !window.confirm(`${targets.length} درخواستوں کی منظوری کی تصدیق کریں؟`)) return;
    setBusy(true);
    let approved = 0;
    try {
      for (const row of targets) {
        const { error } = await db.rpc("decide_approval", { _id: row.id, _approve: true, _note: "" });
        if (!error) approved++;
      }
      toast.info(`${approved} منظور؛ ${targets.length - approved} نامکمل`);
      setSelected([]); await load();
    } catch { toast.error("منظوری مکمل نہیں ہوئی؛ فہرست دوبارہ تازہ کریں۔"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">درخواستیں</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <AdminListTools query={query} onQuery={v => { setQuery(v); setPage(1); setSelected([]); }} count={count} />
          {eligible.length > 0 && <div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => setSelected(selected.length ? [] : eligible.map(r => r.id))}>{selected.length ? "غیر منتخب" : "سب منتخب"}</Button><Button size="sm" disabled={busy || selected.length === 0} onClick={() => void bulkApprove()}>{busy ? "منظوری جاری…" : `${selected.length} منظور کریں`}</Button></div>}
          {rows.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">کوئی درخواست نہیں</p>}
          {filtered.map((r) => (
            <div key={r.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                {eligible.some(row => row.id === r.id) && <input type="checkbox" aria-label={`منتخب ${r.id}`} disabled={busy} checked={selected.includes(r.id)} onChange={e => setSelected(current => e.target.checked ? [...current, r.id] : current.filter(id => id !== r.id))} />}
                <span className="text-sm font-bold">{KIND[r.kind]} — Rs {Number(r.amount).toLocaleString()}</span>
                <Badge variant={r.status === "pending" ? "default" : r.status === "approved" ? "secondary" : "destructive"}>{STATUS[r.status]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{r.note}{r.reference_id ? ` · #${r.reference_id}` : ""}</p>
              <p className="text-xs">میعاد: {new Date(r.expires_at).toLocaleString("en-PK")}{r.used_at ? " · استعمال شدہ" : new Date(r.expires_at).getTime() <= Date.now() ? " · ختم" : ""}</p>
              <details className="text-xs"><summary className="cursor-pointer">عین منظور کی جانے والی تفصیل</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-muted p-2" dir="ltr">{JSON.stringify(r.payload, null, 2)}</pre></details>
              <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("en-PK")}{r.requested_by === user?.id ? " · آپ کی درخواست" : ""}</p>
              {r.decision_note && <p className="text-xs">نوٹ: {r.decision_note}</p>}
              {approvalUsable(r) && canApprove && r.requested_by !== user?.id && (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => decide(r.id, true)}>منظور</Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => decide(r.id, false)}>مسترد</Button>
                </div>
              )}
            </div>
          ))}
          <AdminPagination page={page} count={count} onPage={setPage} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ApprovalsTab;
