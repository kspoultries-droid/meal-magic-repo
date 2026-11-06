import { tr } from "@/lib/i18n/tr";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Banknote, RefreshCw, ExternalLink } from "lucide-react";

// Receipts are stored as storage paths (older rows hold a full signed URL); open with a 5-minute link.
const openReceipt = async (stored: string) => {
  const m = stored.match(/\/partner-documents\/([^?]+)/);
  const path = m ? decodeURIComponent(m[1]) : stored;
  const win = window.open("", "_blank", "noopener");
  const { data, error } = await supabase.functions.invoke("staff-private-document", { body: { path } });
  if (error || !data?.signedUrl) { win?.close(); toast.error(tr("Couldn't open receipt", "رسید نہیں کھل سکی")); return; }
  if (win) win.location.href = data.signedUrl; else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
};

const STATUS_TABS = [
  { key: "pending", label: tr("Under review", "زیرِ تصدیق") },
  { key: "approved", label: tr("Approved", "منظور شدہ") },
  { key: "rejected", label: tr("Rejected", "مسترد") },
];

const RiderRemittancesTab = () => {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expected, setExpected] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Record<string, string>>({});
  const [cashLimit, setCashLimit] = useState("");
  const [savingLimit, setSavingLimit] = useState(false);
  const [outstanding, setOutstanding] = useState<{ rider_id: string; amount: number }[]>([]);

  const loadCash = async () => {
    const [{ data: setting }, { data: journal }] = await Promise.all([
      supabase.from("app_settings").select("value").eq("key", "rider_cash_limit").maybeSingle(),
      supabase.from("rider_cash_journal" as any).select("rider_id, amount").limit(5000),
    ]);
    setCashLimit(String((setting as any)?.value ?? "20000"));
    const map = new Map<string, number>();
    ((journal as any[]) || []).forEach((r) => map.set(r.rider_id, (map.get(r.rider_id) || 0) + Number(r.amount || 0)));
    setOutstanding(Array.from(map.entries()).map(([rider_id, amount]) => ({ rider_id, amount })).filter((r) => r.amount > 0).sort((a, b) => b.amount - a.amount));
  };

  const saveLimit = async () => {
    const val = Number(cashLimit);
    if (!val || val <= 0) { toast.error(tr("Enter valid limit", "درست حد درج کریں")); return; }
    setSavingLimit(true);
    const { error } = await supabase.from("app_settings").upsert(
      { key: "rider_cash_limit", value: String(Math.round(val)), label: tr("Rider Cash Limit (Rs)", "رائیڈر کیش حد (Rs)") } as any,
      { onConflict: "key" },
    );
    setSavingLimit(false);
    if (error) { toast.error(error.message); return; }
    toast.success(tr("Cash limit saved", "کیش حد محفوظ ہو گئی"));
  };

  const load = async () => {
    setLoading(true);
    void loadCash();
    const [{ data }, { data: accs }] = await Promise.all([
      supabase.from("rider_remittances").select("*").eq("status", tab).order("created_at", { ascending: false }).limit(100),
      isAdmin ? supabase.from("payment_accounts").select("id, label") : supabase.rpc("staff_payment_accounts"),
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

  useEffect(() => {
    const channel = supabase.channel("rider-remittances-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rider_remittances" }, () => {
        setTab("pending");
        load();
        toast.info(tr("New rider payment slip received", "نئی رائیڈر ادائیگی سلپ موصول ہوئی"), { id: "remittance-tab-alert" });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rider_remittances" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const review = async (id: string, approve: boolean) => {
    setBusyId(id);
    const expectedRaw = expected[id]?.trim();
    const { error } = await (supabase.rpc as any)("review_rider_remittance", {
      _id: id,
      _approve: approve,
      _note: notes[id]?.trim() || null,
      _expected: expectedRaw ? Number(expectedRaw) : null,
    });
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? tr("Approved — Rider balance updated ✅", "منظور — رائیڈر کا بیلنس اپڈیٹ ہو گیا ✅") : tr("Request rejected", "درخواست مسترد کر دی گئی"));
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Banknote className="w-4 h-4" /> {tr("Rider Settlement", "رائیڈر سیٹلمنٹ")}</CardTitle>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-xl border p-3 space-y-2 bg-muted/30">
          <p className="text-xs font-bold">{tr("Rider cash limit", "رائیڈر کیش حد")}</p>
          <div className="flex gap-2">
            <Input disabled={!isAdmin} value={cashLimit} onChange={(e) => setCashLimit(e.target.value)} inputMode="numeric" className="h-9 text-xs" placeholder="20000" />
            {isAdmin && <Button size="sm" className="h-9 text-xs font-bold" disabled={savingLimit} onClick={saveLimit}>{tr("Saved", "محفوظ")}</Button>}
          </div>
          <p className="text-[10px] text-muted-foreground">{tr("Riders exceeding cash limit won't receive new cash orders.", "حد سے زیادہ نقدی رکھنے والے رائیڈر کو نیا کیش آرڈر آفر نہیں ہوگا۔")}</p>
          {outstanding.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[11px] font-bold text-muted-foreground">{tr("Cash in hand with riders", "رائیڈرز کے پاس موجود نقدی")}</p>
              {outstanding.slice(0, 8).map((r) => (
                <div key={r.rider_id} className="flex items-center justify-between text-[11px]">
                  <span>{names[r.rider_id] || r.rider_id.slice(0, 8)}</span>
                  <span className={`font-extrabold ${r.amount >= Number(cashLimit || 0) ? "text-destructive" : ""}`}>Rs {Math.round(r.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

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
          <p className="text-sm text-muted-foreground">{tr("Loading…", "لوڈ ہو رہا ہے…")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{tr("No records found", "کوئی ریکارڈ نہیں")}</p>
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
                      {r.account_id ? ` • ${accounts[r.account_id] || "اکاؤنٹ"}` : ""}
                      {r.reference_no ? ` ${tr("• Reference", "• ریفرنس")} ${r.reference_no}` : ""}
                    </p>
                    {r.note && <p className="text-xs mt-1">📝 {r.note}</p>}
                  </div>
                  <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                </div>

                {r.receipt_url && (
                  <button type="button" onClick={() => openReceipt(r.receipt_url)} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" /> {tr("View receipt", "رسید دیکھیں")}
                  </button>
                )}

                {r.status === "pending" && (
                  <div className="space-y-2">
                    <Input
                      value={notes[r.id] || ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                      placeholder={tr("Note (Optional)", "نوٹ (اختیاری)")}
                      className="h-9 text-xs"
                    />
                    <Input
                      value={expected[r.id] || ""}
                      onChange={(e) => setExpected((n) => ({ ...n, [r.id]: e.target.value }))}
                      inputMode="numeric"
                      placeholder={tr("Expected cash (optional) — Shortage/excess will be calculated automatically", "متوقع نقدی (اختیاری) — کمی/زیادتی خودکار حساب ہوگی")}
                      className="h-9 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-9 text-xs font-bold" disabled={busyId === r.id} onClick={() => review(r.id, true)}>
                        {tr("Approve", "منظور کریں")}
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1 h-9 text-xs font-bold" disabled={busyId === r.id} onClick={() => review(r.id, false)}>
                        {tr("Rejected", "مسترد")}
                      </Button>
                    </div>
                  </div>
                )}
                {(Number(r.shortage_amount) > 0 || Number(r.overage_amount) > 0) && (
                  <p className={`text-[11px] font-bold ${Number(r.shortage_amount) > 0 ? "text-destructive" : "text-green-700"}`}>
                    {Number(r.shortage_amount) > 0
                      ? `${tr("Shortage: Rs", "کمی: Rs")} ${Number(r.shortage_amount)} ${tr("(Expected Rs", "(متوقع Rs")} ${Number(r.expected_amount)})`
                      : `${tr("Excess: Rs", "زیادتی: Rs")} ${Number(r.overage_amount)} ${tr("(Expected Rs", "(متوقع Rs")} ${Number(r.expected_amount)})`}
                  </p>
                )}
                {r.admin_note && r.status !== "pending" && (
                  <p className="text-[11px] text-muted-foreground">{tr("Admin Note:", "ایڈمن نوٹ:")} {r.admin_note}</p>
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
