import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Banknote, RefreshCw, ExternalLink } from "lucide-react";

const STATUS_TABS = [
  { key: "pending", label: "زیرِ تصدیق" },
  { key: "approved", label: "منظور شدہ" },
  { key: "rejected", label: "مسترد" },
];

const RiderRemittancesTab = () => {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: accs }] = await Promise.all([
      supabase.from("rider_remittances").select("*").eq("status", tab).order("created_at", { ascending: false }).limit(100),
      supabase.from("payment_accounts").select("id, label"),
    ]);
    const accMap: Record<string, string> = {};
    (accs || []).forEach((a: any) => { accMap[a.id] = a.label; });
    setAccounts(accMap);
    setRows(data || []);
    const ids = Array.from(new Set((data || []).map((r: any) => r.rider_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, phone").in("id", ids);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.id] = `${p.full_name || "رائیڈر"}${p.phone ? ` • ${p.phone}` : ""}`; });
      setNames(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const review = async (id: string, approve: boolean) => {
    setBusyId(id);
    const { error } = await supabase.rpc("review_rider_remittance", {
      _id: id,
      _approve: approve,
      _note: notes[id]?.trim() || null,
    });
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "منظور — رائیڈر کا بیلنس اپڈیٹ ہو گیا ✅" : "درخواست مسترد کر دی گئی");
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Banknote className="w-4 h-4" /> رائیڈر سیٹلمنٹ</CardTitle>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${tab === t.key ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">لوڈ ہو رہا ہے…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">کوئی ریکارڈ نہیں</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-extrabold">Rs {r.amount}</p>
                    <p className="text-xs text-muted-foreground">{names[r.rider_id] || r.rider_id.slice(0, 8)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("ur-PK")} • {r.method}
                    </p>
                    {r.note && <p className="text-xs mt-1">📝 {r.note}</p>}
                  </div>
                  <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                </div>

                {r.receipt_url && (
                  <a href={r.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" /> رسید دیکھیں
                  </a>
                )}

                {r.status === "pending" && (
                  <div className="space-y-2">
                    <Input
                      value={notes[r.id] || ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                      placeholder="نوٹ (اختیاری)"
                      className="h-9 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-9 text-xs font-bold" disabled={busyId === r.id} onClick={() => review(r.id, true)}>
                        منظور کریں
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1 h-9 text-xs font-bold" disabled={busyId === r.id} onClick={() => review(r.id, false)}>
                        مسترد
                      </Button>
                    </div>
                  </div>
                )}
                {r.admin_note && r.status !== "pending" && (
                  <p className="text-[11px] text-muted-foreground">ایڈمن نوٹ: {r.admin_note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RiderRemittancesTab;
