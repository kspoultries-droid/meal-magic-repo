import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const KIND: Record<string, string> = { refund: "ریفنڈ", payout: "وینڈر ادائیگی", other: "دیگر" };
const STATUS: Record<string, string> = { pending: "زیر التوا", approved: "منظور", rejected: "مسترد" };

const ApprovalsTab = () => {
  const db = supabase as any;
  const { user, permissions } = useAuth();
  const canApprove = permissions.includes("approve");
  const [rows, setRows] = useState<any[]>([]);
  const [kind, setKind] = useState("refund");
  const [amount, setAmount] = useState("");
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");

  const load = async () => {
    const { data } = await db.from("approval_requests").select("*").order("created_at", { ascending: false }).limit(100);
    setRows(data || []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("approvals").on("postgres_changes", { event: "*", schema: "public", table: "approval_requests" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("درست رقم لکھیں");
    if (!note.trim()) return toast.error("وجہ لکھیں");
    const { error } = await db.rpc("request_approval", { _kind: kind, _amount: amt, _reference_id: ref.trim() || null, _note: note.trim() });
    if (error) return toast.error(error.message);
    toast.success("درخواست بھیج دی گئی"); setAmount(""); setRef(""); setNote("");
  };

  const decide = async (id: string, approve: boolean) => {
    const n = approve ? "" : window.prompt("مسترد کرنے کی وجہ") || "";
    const { error } = await db.rpc("decide_approval", { _id: id, _approve: approve, _note: n });
    if (error) return toast.error(error.message.includes("own") ? "اپنی درخواست خود منظور نہیں کر سکتے" : error.message);
    toast.success(approve ? "منظور کر دیا" : "مسترد کر دیا");
  };

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">نئی منظوری کی درخواست</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Rs 2,000 سے زیادہ ریفنڈ اور ہر وینڈر ادائیگی سے پہلے یہاں درخواست دیں۔ کوئی دوسرا (فنانس/مالک) منظور کرے گا۔</p>
          <div className="flex gap-1.5">
            {Object.entries(KIND).map(([k, v]) => (
              <button key={k} onClick={() => setKind(k)} className={`rounded-full border px-3 py-1 text-xs ${kind === k ? "border-primary bg-primary text-primary-foreground" : ""}`}>{v}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="رقم Rs" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Input placeholder="آرڈر / وینڈر نمبر" value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>
          <Input placeholder="وجہ" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button className="w-full" onClick={submit}>درخواست بھیجیں</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">درخواستیں</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">کوئی درخواست نہیں</p>}
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{KIND[r.kind]} — Rs {Number(r.amount).toLocaleString()}</span>
                <Badge variant={r.status === "pending" ? "default" : r.status === "approved" ? "secondary" : "destructive"}>{STATUS[r.status]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{r.note}{r.reference_id ? ` · #${r.reference_id}` : ""}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("ur-PK")}{r.requested_by === user?.id ? " · آپ کی درخواست" : ""}</p>
              {r.decision_note && <p className="text-xs">نوٹ: {r.decision_note}</p>}
              {r.status === "pending" && canApprove && r.requested_by !== user?.id && (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => decide(r.id, true)}>منظور</Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => decide(r.id, false)}>مسترد</Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApprovalsTab;
