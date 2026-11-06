import { tr } from "@/lib/i18n/tr";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Ticket, Eye, EyeOff } from "lucide-react";

const SCOPE_LABELS: Record<string, string> = {
  all: tr("🌐 Everywhere", "🌐 ہر جگہ"),
  food: tr("🍔 Food", "🍔 فوڈ"),
  grocery: tr("🛒 Grocery", "🛒 گروسری"),
  wholesale: tr("📦 Marketplace", "📦 بازار"),
};

const VouchersTab = () => {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [titleUr, setTitleUr] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [minOrder, setMinOrder] = useState("0");
  const [scope, setScope] = useState("all");
  const [validUntil, setValidUntil] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const fetchData = async () => {
    setLoading(true);
    const { data } = await (supabase.from("vouchers" as any).select("*").order("sort_order") as any);
    setVouchers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setCode(""); setTitle(""); setTitleUr(""); setDescription("");
    setDiscountType("percent"); setDiscountValue(""); setMaxDiscount("");
    setMinOrder("0"); setScope("all"); setValidUntil(""); setUsageLimit(""); setSortOrder("0");
    setEditId(null);
  };

  const saveVoucher = async () => {
    if (!code.trim() || !title.trim() || !discountValue) {
      toast.error(tr("Code, title, and discount value are required", "کوڈ، ٹائٹل اور رعایت کی قیمت ضروری ہے"));
      return;
    }
    const payload: any = {
      code: code.trim().toUpperCase(),
      title, title_ur: titleUr || null, description: description || null,
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      max_discount: maxDiscount ? parseFloat(maxDiscount) : null,
      min_order: parseFloat(minOrder) || 0,
      scope,
      valid_until: validUntil ? new Date(validUntil + "T23:59:59").toISOString() : null,
      usage_limit: usageLimit ? parseInt(usageLimit) : null,
      sort_order: parseInt(sortOrder) || 0,
    };

    let error;
    if (editId) {
      ({ error } = await (supabase.from("vouchers" as any).update(payload).eq("id", editId) as any));
    } else {
      ({ error } = await (supabase.from("vouchers" as any).insert(payload) as any));
    }
    if (error) { toast.error(error.message); return; }
    toast.success(editId ? tr("Voucher updated!", "واؤچر اپڈیٹ ہو گیا!") : tr("New voucher created! 🎟️", "نیا واؤچر بن گیا! 🎟️"));
    resetForm();
    setDialogOpen(false);
    fetchData();
  };

  const editVoucher = (v: any) => {
    setEditId(v.id); setCode(v.code); setTitle(v.title); setTitleUr(v.title_ur || "");
    setDescription(v.description || ""); setDiscountType(v.discount_type);
    setDiscountValue(v.discount_value?.toString()); setMaxDiscount(v.max_discount?.toString() || "");
    setMinOrder(v.min_order?.toString() || "0"); setScope(v.scope);
    setValidUntil(v.valid_until ? v.valid_until.split("T")[0] : "");
    setUsageLimit(v.usage_limit?.toString() || ""); setSortOrder(v.sort_order?.toString() || "0");
    setDialogOpen(true);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await (supabase.from("vouchers" as any).update({ is_active: !current }).eq("id", id) as any);
    toast.success(!current ? tr("Voucher Active", "واؤچر فعال") : tr("Voucher Inactive", "واؤچر غیر فعال"));
    fetchData();
  };

  const deleteVoucher = async (id: string) => {
    if (!confirm(tr("Are you sure you want to delete this voucher?", "کیا آپ واقعی یہ واؤچر حذف کرنا چاہتے ہیں؟"))) return;
    await (supabase.from("vouchers" as any).delete().eq("id", id) as any);
    toast.success(tr("Voucher deleted", "واؤچر حذف ہو گیا"));
    fetchData();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Ticket className="w-5 h-5" /> {tr("Vouchers & Deals", "واؤچرز اور ڈیلز")}</CardTitle>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> {tr("New Voucher", "نیا واؤچر")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editId ? tr("Edit Voucher", "واؤچر ایڈٹ کریں") : tr("Create New Voucher", "نیا واؤچر بنائیں")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder={tr("Code * (e.g. BAZAR10)", "کوڈ * (مثلاً BAZAR10)")} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                  <Input placeholder={tr("Title * (English)", "ٹرٹل * (English)")} value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <Input placeholder={tr("Urdu Title (e.g. 10% off on Bazar)", "اردو ٹائٹل (مثلاً بازار پر 10% رعایت)")} value={titleUr} onChange={(e) => setTitleUr(e.target.value)} />
                <Input placeholder={tr("Description (Optional)", "تفصیل (اختیاری)")} value={description} onChange={(e) => setDescription(e.target.value)} />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">{tr("Discount Type", "رعایت کی قسم")}</label>
                    <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                      <option value="percent">{tr("Percentage (%)", "فیصد (%)")}</option>
                      <option value="flat">{tr("Fixed Amount (Rs)", "فکیسڈ رقم (Rs)")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{tr("Discount Value *", "رعایت کی قیمت *")}</label>
                    <Input type="number" placeholder="10" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">{tr("Max discount (Rs)", "زیادہ سے زیادہ رعایت (Rs)")}</label>
                    <Input type="number" placeholder={tr("No limit", "بغیر حد")} value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{tr("Min order (Rs)", "کم از کم آرڈر (Rs)")}</label>
                    <Input type="number" placeholder="0" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">{tr("Applicable on", "کہاں لاگو ہوگا")}</label>
                    <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={scope} onChange={(e) => setScope(e.target.value)}>
                      {Object.entries(SCOPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{tr("Expiry date", "میعاد ختم (تاریخ)")}</label>
                    <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">{tr("Usage limit (total)", "استعمال کی حد (کل)")}</label>
                    <Input type="number" placeholder={tr("Unlimited", "لامحدود")} value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{tr("Sort", "ترتیب (Sort)")}</label>
                    <Input type="number" placeholder="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
                  </div>
                </div>

                <Button className="w-full" onClick={saveVoucher}>{editId ? tr("Update", "اپڈیٹ کریں") : tr("Create", "بنائیں")}</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">{tr("Loading...", "لوڈ ہو رہا ہے...")}</p> : vouchers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{tr("No vouchers — create one via \"New Voucher\" above", "کوئی واؤچر نہیں — اوپر \"نیا واؤچر\" سے بنائیں")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr("Code", "کوڈ")}</TableHead>
                  <TableHead>{tr("Discount", "رعایت")}</TableHead>
                  <TableHead>{tr("Section", "سیکشن")}</TableHead>
                  <TableHead>{tr("Min", "کم از کم")}</TableHead>
                  <TableHead>{tr("Usage", "استعمال")}</TableHead>
                  <TableHead>{tr("Expiry", "میعاد")}</TableHead>
                  <TableHead>{tr("Status", "سٹیٹس")}</TableHead>
                  <TableHead>{tr("Actions", "ایکشنز")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <p className="font-mono font-bold text-sm">{v.code}</p>
                      <p className="text-xs text-muted-foreground">{v.title_ur || v.title}</p>
                    </TableCell>
                    <TableCell className="text-sm font-semibold">
                      {v.discount_type === "percent" ? `${v.discount_value}%` : `Rs ${v.discount_value}`}
                      {v.max_discount && <span className="block text-[10px] text-muted-foreground">max Rs {v.max_discount}</span>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{SCOPE_LABELS[v.scope] || v.scope}</Badge></TableCell>
                    <TableCell className="text-xs">Rs {v.min_order}</TableCell>
                    <TableCell className="text-xs">{v.used_count}{v.usage_limit ? ` / ${v.usage_limit}` : ""}</TableCell>
                    <TableCell className="text-xs">{v.valid_until ? v.valid_until.split("T")[0] : "—"}</TableCell>
                    <TableCell>
                      <Badge className={v.is_active ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                        {v.is_active ? tr("Active", "فعال") : tr("Inactive", "غیر فعال")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => editVoucher(v)}>✏️</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => toggleActive(v.id, v.is_active)}>
                          {v.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => deleteVoucher(v.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VouchersTab;
