import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Phone, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Eye, EyeOff, Calendar, Pencil, Check, X, ArrowUp, ArrowDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServiceJobPanel from "@/components/services/ServiceJobPanel";
import TicketsQueue from "@/components/support/TicketsQueue";
import { Link } from "react-router-dom";

const ICON_OPTIONS = [
  "Wrench", "Zap", "Droplets", "Paintbrush", "Hammer", "HardHat",
  "Truck", "Scissors", "Thermometer", "Shield", "Home", "Building",
  "Shovel", "Cog", "Fan", "Plug", "Wifi", "Camera", "Car",
];

const COLOR_OPTIONS = [
  { label: "نیلا / Blue", value: "bg-blue-100 text-blue-600" },
  { label: "سبز / Green", value: "bg-green-100 text-green-600" },
  { label: "نارنجی / Orange", value: "bg-orange-100 text-orange-600" },
  { label: "سرخ / Red", value: "bg-red-100 text-red-600" },
  { label: "جامنی / Purple", value: "bg-purple-100 text-purple-600" },
  { label: "پیلا / Yellow", value: "bg-yellow-100 text-yellow-600" },
  { label: "گلابی / Pink", value: "bg-pink-100 text-pink-600" },
  { label: "سیان / Cyan", value: "bg-cyan-100 text-cyan-600" },
];

const ServicesTab = () => {
  return (
    <Tabs defaultValue="bookings">
      <TabsList className="mb-4 grid w-full grid-cols-5">
        <TabsTrigger value="bookings" className="text-xs px-1"><Calendar className="h-3 w-3 mr-0.5" /> بکنگز</TabsTrigger>
        <TabsTrigger value="complaints" className="text-xs px-1">شکایات</TabsTrigger>
        <TabsTrigger value="services" className="text-xs px-1">سروسز</TabsTrigger>
        <TabsTrigger value="categories" className="text-xs px-1">کیٹیگریز</TabsTrigger>
        <TabsTrigger value="settings" className="text-xs px-1">⚙️ سیٹنگز</TabsTrigger>
      </TabsList>
      <TabsContent value="bookings"><BookingsSection /></TabsContent>
      <TabsContent value="complaints"><TicketsQueue serviceOnly /></TabsContent>
      <TabsContent value="services"><ServicesSection /></TabsContent>
      <TabsContent value="categories"><CategoriesSection /></TabsContent>
      <TabsContent value="settings"><Button asChild variant="outline" className="mb-4"><Link to="/service-manager">شعبہ وار نگرانی اور چیک لسٹس</Link></Button><SettingsSection /></TabsContent>
    </Tabs>
  );
};

// ─── Bookings ───
const BookingsSection = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const [{ data: b }, { data: s }] = await Promise.all([
      supabase.from("service_bookings").select("*,services(name,provider_id)").order("created_at", { ascending: false }).limit(50),
      supabase.from("services").select("id, name"),
    ]);
    setBookings(b || []);
    setServices(s || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const getServiceName = (id: string) => services.find(s => s.id === id)?.name || "—";

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.rpc("service_job_action", { _booking_id: id, _action: status === "completed" ? "complete" : status === "in_progress" ? "start" : "cancel", _note: "منتظم کی درخواست" });
    if (error) { toast.error(error.message); return; }
    toast.success("سٹیٹس اپڈیٹ ہو گئی / Status updated");
    fetch();
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { pending: "bg-warning text-warning-foreground", confirmed: "bg-primary text-primary-foreground", in_progress: "bg-accent text-accent-foreground", completed: "bg-success text-success-foreground", cancelled: "bg-destructive text-destructive-foreground" };
    return map[s] || "bg-muted text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>سروس بکنگز / Service Bookings</CardTitle>
        <Button variant="outline" size="sm" onClick={fetch}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <div className="space-y-1.5">
            {bookings.length === 0 && <p className="text-center text-muted-foreground py-4 text-xs">کوئی بکنگ نہیں / No bookings</p>}
            {bookings.map((b) => (
              <div key={b.id} className="rounded-lg border px-2.5 py-2 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] text-muted-foreground">#{b.id.slice(0, 8)}</span>
                  <span className="text-xs font-bold">{getServiceName(b.service_id)}</span>
                  <span className="text-xs font-bold">Rs {b.total_amount}</span>
                  <Badge className={`${statusColor(b.status)} h-5 px-1.5 text-[10px]`}>{b.status}</Badge>
                  <span className="ms-auto text-[10px] text-muted-foreground">{b.scheduled_date} · {b.scheduled_time}</span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">📍 {b.address} · 💳 {b.payment_method}{b.notes ? ` · 📝 ${b.notes}` : ""}</p>
                <div className="flex gap-1 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setSelected(b.id)}>تفصیل، مراحل اور بل</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!selected} onOpenChange={v => { if (!v) setSelected(null); }}><DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>بکنگ کی تفصیل</DialogTitle></DialogHeader>{bookings.find(b => b.id === selected) && <ServiceJobPanel booking={bookings.find(b => b.id === selected)} mode="staff" onChanged={fetch}/>}</DialogContent></Dialog>
      </CardContent>
    </Card>
  );
};

// ─── Services ───
const ServicesSection = () => {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", duration: "1-2 hours", category_id: "", description: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", price: "", duration: "", category_id: "", description: "" });

  const fetchData = async () => {
    setLoading(true);
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from("services").select("*").order("sort_order").order("name"),
      supabase.from("service_categories").select("id, name"),
    ]);
    setServices(s || []);
    setCategories(c || []);
    if (!form.category_id && c?.length) setForm(f => ({ ...f, category_id: c[0].id }));
    setLoading(false);
  };

  const moveService = async (id: string, direction: "up" | "down") => {
    const idx = services.findIndex(s => s.id === id);
    if ((direction === "up" && idx === 0) || (direction === "down" && idx === services.length - 1)) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const currentOrder = services[idx].sort_order ?? idx;
    const swapOrder = services[swapIdx].sort_order ?? swapIdx;
    await Promise.all([
      supabase.from("services").update({ sort_order: swapOrder }).eq("id", services[idx].id),
      supabase.from("services").update({ sort_order: currentOrder }).eq("id", services[swapIdx].id),
    ]);
    toast.success("ترتیب تبدیل ہو گئی / Order changed");
    fetchData();
  };

  const quickUpdateFee = async (id: string, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) { toast.error("درست قیمت درکار ہے"); return; }
    await supabase.from("services").update({ price: newPrice }).eq("id", id);
    toast.success("فیس اپڈیٹ ہو گئی / Fee updated");
    fetchData();
  };

  useEffect(() => { fetchData(); }, []);

  const getCatName = (id: string) => categories.find(c => c.id === id)?.name || "—";

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("services").update({ is_active: !current }).eq("id", id);
    toast.success("اپڈیٹ ہو گیا / Updated");
    fetchData();
  };

  const deleteService = async (id: string) => {
    await supabase.from("services").delete().eq("id", id);
    toast.success("سروس حذف ہو گئی / Service deleted");
    fetchData();
  };

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditForm({
      name: s.name || "",
      price: String(s.price || ""),
      duration: s.duration || "",
      category_id: s.category_id || "",
      description: s.description || "",
    });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim() || !editForm.price || isNaN(Number(editForm.price))) {
      toast.error("نام اور درست قیمت درکار ہے"); return;
    }
    await supabase.from("services").update({
      name: editForm.name,
      price: Number(editForm.price),
      duration: editForm.duration || null,
      category_id: editForm.category_id,
      description: editForm.description || null,
    }).eq("id", id);
    toast.success("سروس اپڈیٹ ہو گئی / Service updated");
    setEditingId(null);
    fetchData();
  };

  const addService = async () => {
    if (!form.name.trim() || !form.price || !form.category_id) { toast.error("نام، قیمت اور کیٹیگری درکار ہے"); return; }
    const { error } = await supabase.from("services").insert({
      name: form.name, price: Number(form.price), duration: form.duration,
      category_id: form.category_id, description: form.description || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("سروس شامل ہو گئی / Service added");
    setForm({ name: "", price: "", duration: "1-2 hours", category_id: categories[0]?.id || "", description: "" });
    setShowAdd(false);
    fetchData();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>سروسز / Services</CardTitle>
        <div className="flex gap-2">
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> نئی سروس / Add Service</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>نئی سروس شامل کریں / Add New Service</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="نام / Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <Input placeholder="قیمت / Price" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                <Input placeholder="دورانیہ / Duration" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} />
                <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Input placeholder="تفصیل (اختیاری) / Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                <Button onClick={addService} className="w-full">شامل کریں / Add</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <div className="space-y-3">
            {services.map((s) => (
              <div key={s.id} className="border rounded-xl p-4 space-y-2">
                {editingId === s.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground">نام / Name</label>
                      <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="h-8 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground">قیمت / Price (Rs)</label>
                        <Input type="number" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} className="h-8 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground">دورانیہ / Duration</label>
                        <Input value={editForm.duration} onChange={e => setEditForm({...editForm, duration: e.target.value})} className="h-8 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground">کیٹیگری / Category</label>
                      <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={editForm.category_id} onChange={e => setEditForm({...editForm, category_id: e.target.value})}>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground">تفصیل / Description</label>
                      <Input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="h-8 text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(s.id)} className="h-8"><Check className="h-3 w-3 mr-1" /> محفوظ / Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-8"><X className="h-3 w-3 mr-1" /> منسوخ / Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-0.5">
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => moveService(s.id, "up")} disabled={services.indexOf(s) === 0}>
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => moveService(s.id, "down")} disabled={services.indexOf(s) === services.length - 1}>
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <div>
                          <span className="font-bold text-foreground">{s.name}</span>
                          <Badge className="ml-2 text-[10px]" variant="outline">{getCatName(s.category_id)}</Badge>
                        </div>
                      </div>
                      <Badge className={s.is_active ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                        {s.is_active ? "ایکٹو" : "غیر ایکٹو"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <span className="font-bold text-primary">Rs {s.price}</span>
                      <span>⏱ {s.duration}</span>
                      <div className="flex items-center gap-1 ml-auto">
                        <Input
                          type="number"
                          defaultValue={s.price}
                          className="h-7 w-24 text-xs"
                          placeholder="نئی فیس"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              quickUpdateFee(s.id, Number((e.target as HTMLInputElement).value));
                            }
                          }}
                        />
                        <span className="text-[10px] text-muted-foreground">Enter دبائیں</span>
                      </div>
                    </div>
                    {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                    <div className="flex gap-1 flex-wrap pt-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startEdit(s)}>
                        <Pencil className="h-3 w-3 mr-1" /> ترمیم / Edit
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleActive(s.id, s.is_active)}>
                        {s.is_active ? <><EyeOff className="h-3 w-3 mr-1" /> بند / Off</> : <><Eye className="h-3 w-3 mr-1" /> فعال / On</>}
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteService(s.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {services.length === 0 && <p className="text-center text-muted-foreground py-8">کوئی سروس نہیں / No services</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Categories ───
const CategoriesSection = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "Wrench", color: "bg-blue-100 text-blue-600" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIcon, setEditIcon] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editName, setEditName] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("service_categories").select("*").order("sort_order");
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("service_categories").update({ is_active: !current }).eq("id", id);
    toast.success("اپڈیٹ ہو گیا / Updated");
    fetchData();
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("service_categories").delete().eq("id", id);
    toast.success("کیٹیگری حذف ہو گئی / Category deleted");
    fetchData();
  };

  const startEdit = (cat: any) => {
    setEditingId(cat.id);
    setEditIcon(cat.icon);
    setEditColor(cat.color);
    setEditName(cat.name);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) { toast.error("نام درکار ہے"); return; }
    await supabase.from("service_categories").update({ icon: editIcon, color: editColor, name: editName.trim() }).eq("id", id);
    toast.success("کیٹیگری اپڈیٹ ہو گئی / Category updated");
    setEditingId(null);
    fetchData();
  };

  const moveCategory = async (id: string, direction: "up" | "down") => {
    const idx = categories.findIndex(c => c.id === id);
    if ((direction === "up" && idx === 0) || (direction === "down" && idx === categories.length - 1)) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const currentOrder = categories[idx].sort_order ?? idx;
    const swapOrder = categories[swapIdx].sort_order ?? swapIdx;
    await Promise.all([
      supabase.from("service_categories").update({ sort_order: swapOrder }).eq("id", categories[idx].id),
      supabase.from("service_categories").update({ sort_order: currentOrder }).eq("id", categories[swapIdx].id),
    ]);
    toast.success("ترتیب تبدیل ہو گئی / Order changed");
    fetchData();
  };

  const addCategory = async () => {
    if (!form.name.trim()) { toast.error("نام درکار ہے / Name required"); return; }
    const { error } = await supabase.from("service_categories").insert({ name: form.name, icon: form.icon, color: form.color });
    if (error) { toast.error(error.message); return; }
    toast.success("کیٹیگری شامل ہو گئی / Category added");
    setForm({ name: "", icon: "Wrench", color: "bg-blue-100 text-blue-600" });
    setShowAdd(false);
    fetchData();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>سروس کیٹیگریز / Service Categories</CardTitle>
        <div className="flex gap-2">
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> نئی کیٹیگری / Add Category</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>نئی کیٹیگری / New Category</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="نام / Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <div>
                  <label className="text-sm font-medium mb-1 block">آئیکن منتخب کریں / Select Icon</label>
                  <div className="grid grid-cols-6 gap-2">
                    {ICON_OPTIONS.map(icon => (
                      <button key={icon} onClick={() => setForm({...form, icon})}
                        className={`p-2 rounded-lg border text-xs text-center transition-colors ${form.icon === icon ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent"}`}>
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">رنگ منتخب کریں / Select Color</label>
                  <div className="grid grid-cols-2 gap-2">
                    {COLOR_OPTIONS.map(c => (
                      <button key={c.value} onClick={() => setForm({...form, color: c.value})}
                        className={`p-2 rounded-lg border text-xs transition-colors ${form.color === c.value ? "ring-2 ring-primary" : ""} ${c.value}`}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={addCategory} className="w-full">شامل کریں / Add</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ترتیب</TableHead>
                <TableHead>نام / Name</TableHead>
                <TableHead>آئیکن / Icon</TableHead>
                <TableHead>رنگ / Color</TableHead>
                <TableHead>ایکٹو / Active</TableHead>
                <TableHead>ایکشنز / Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => moveCategory(c.id, "up")} disabled={categories.indexOf(c) === 0}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => moveCategory(c.id, "down")} disabled={categories.indexOf(c) === categories.length - 1}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {editingId === c.id ? (
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-sm w-32" />
                    ) : (
                      c.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === c.id ? (
                      <select className="border rounded p-1 text-xs bg-background text-foreground" value={editIcon} onChange={e => setEditIcon(e.target.value)}>
                        {ICON_OPTIONS.map(icon => <option key={icon} value={icon}>{icon}</option>)}
                      </select>
                    ) : (
                      <span className="text-sm">{c.icon}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === c.id ? (
                      <select className="border rounded p-1 text-xs bg-background text-foreground" value={editColor} onChange={e => setEditColor(e.target.value)}>
                        {COLOR_OPTIONS.map(co => <option key={co.value} value={co.value}>{co.label}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs ${c.color}`}>{c.color.split(" ")[0]}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={c.is_active ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                      {c.is_active ? "ایکٹو" : "غیر ایکٹو"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-1">
                    {editingId === c.id ? (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => saveEdit(c.id)}>
                          <Check className="h-3 w-3 mr-1" /> محفوظ / Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startEdit(c)}>
                          <Pencil className="h-3 w-3 mr-1" /> ایڈٹ / Edit
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleActive(c.id, c.is_active)}>
                          {c.is_active ? "بند / Off" : "فعال / On"}
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteCategory(c.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">کوئی کیٹیگری نہیں / No categories</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Settings ───
const SettingsSection = () => {
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("app_settings").select("key, value").in("key", ["helpline_phone", "whatsapp_number"]);
    if (data) {
      data.forEach((s) => {
        if (s.key === "helpline_phone") setPhone(s.value);
        if (s.key === "whatsapp_number") setWhatsapp(s.value);
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const saveSettings = async () => {
    if (!phone.trim() || !whatsapp.trim()) { toast.error("دونوں نمبر درکار ہیں / Both numbers required"); return; }
    setSaving(true);
    await Promise.all([
      supabase.from("app_settings").update({ value: phone.trim() }).eq("key", "helpline_phone"),
      supabase.from("app_settings").update({ value: whatsapp.trim() }).eq("key", "whatsapp_number"),
    ]);
    setSaving(false);
    toast.success("نمبرز اپڈیٹ ہو گئے / Numbers updated ✅");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>⚙️ ایپ سیٹنگز / App Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <>
            <div>
              <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                <Phone className="w-4 h-4" /> ہیلپ لائن نمبر / Helpline Phone
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03001234567"
              />
              <p className="text-xs text-muted-foreground mt-1">یہ نمبر کال ہیلپ لائن میں دکھے گا</p>
            </div>
            <div>
              <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4" /> واٹس ایپ نمبر / WhatsApp Number
              </label>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="923001234567"
              />
              <p className="text-xs text-muted-foreground mt-1">92 سے شروع ہو، بغیر + کے (مثلاً 923001234567)</p>
            </div>
            <Button onClick={saveSettings} disabled={saving} className="w-full">
              {saving ? "سیو ہو رہا ہے..." : "سیو کریں / Save Settings ✅"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ServicesTab;
