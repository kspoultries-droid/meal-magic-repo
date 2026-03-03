import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Eye, EyeOff, Calendar, Pencil, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      <TabsList className="mb-4">
        <TabsTrigger value="bookings"><Calendar className="h-4 w-4 mr-1" /> بکنگز / Bookings</TabsTrigger>
        <TabsTrigger value="services">سروسز / Services</TabsTrigger>
        <TabsTrigger value="categories">کیٹیگریز / Categories</TabsTrigger>
      </TabsList>
      <TabsContent value="bookings"><BookingsSection /></TabsContent>
      <TabsContent value="services"><ServicesSection /></TabsContent>
      <TabsContent value="categories"><CategoriesSection /></TabsContent>
    </Tabs>
  );
};

// ─── Bookings ───
const BookingsSection = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const [{ data: b }, { data: s }] = await Promise.all([
      supabase.from("service_bookings").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("services").select("id, name"),
    ]);
    setBookings(b || []);
    setServices(s || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const getServiceName = (id: string) => services.find(s => s.id === id)?.name || "—";

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("service_bookings").update({ status }).eq("id", id);
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
          <div className="space-y-3">
            {bookings.length === 0 && <p className="text-center text-muted-foreground py-8">کوئی بکنگ نہیں / No bookings</p>}
            {bookings.map((b) => (
              <div key={b.id} className="border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">#{b.id.slice(0, 8)}</span>
                    <span className="ml-3 font-bold">{getServiceName(b.service_id)}</span>
                    <span className="ml-2 font-bold">Rs {b.total_amount}</span>
                  </div>
                  <Badge className={statusColor(b.status)}>{b.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>📅 {b.scheduled_date} — {b.scheduled_time}</p>
                  <p>📍 {b.address}</p>
                  {b.notes && <p>📝 {b.notes}</p>}
                  <p>💳 {b.payment_method}</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {["confirmed", "in_progress", "completed", "cancelled"].map((s) =>
                    s !== b.status ? (
                      <Button key={s} size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => updateStatus(b.id, s)}>
                        {s}
                      </Button>
                    ) : null
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
  const [editPrice, setEditPrice] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from("services").select("*").order("name"),
      supabase.from("service_categories").select("id, name"),
    ]);
    setServices(s || []);
    setCategories(c || []);
    if (!form.category_id && c?.length) setForm(f => ({ ...f, category_id: c[0].id }));
    setLoading(false);
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

  const startEditPrice = (id: string, currentPrice: number) => {
    setEditingId(id);
    setEditPrice(String(currentPrice));
  };

  const savePrice = async (id: string) => {
    if (!editPrice || isNaN(Number(editPrice))) { toast.error("درست قیمت درج کریں"); return; }
    await supabase.from("services").update({ price: Number(editPrice) }).eq("id", id);
    toast.success("قیمت اپڈیٹ ہو گئی / Price updated");
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام / Name</TableHead>
                <TableHead>کیٹیگری / Category</TableHead>
                <TableHead>قیمت / Price</TableHead>
                <TableHead>دورانیہ / Duration</TableHead>
                <TableHead>ایکٹو / Active</TableHead>
                <TableHead>ایکشنز / Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{getCatName(s.category_id)}</TableCell>
                  <TableCell>
                    {editingId === s.id ? (
                      <div className="flex items-center gap-1">
                        <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-20 h-7 text-xs" />
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => savePrice(s.id)}><Check className="h-3 w-3 text-green-600" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}><X className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 cursor-pointer group" onClick={() => startEditPrice(s.id, s.price)}>
                        Rs {s.price} <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{s.duration}</TableCell>
                  <TableCell>
                    <Badge className={s.is_active ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                      {s.is_active ? "ایکٹو" : "غیر ایکٹو"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleActive(s.id, s.is_active)}>
                      {s.is_active ? "بند / Off" : "فعال / On"}
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteService(s.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {services.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">کوئی سروس نہیں / No services</TableCell></TableRow>}
            </TableBody>
          </Table>
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
  };

  const saveEdit = async (id: string) => {
    await supabase.from("service_categories").update({ icon: editIcon, color: editColor }).eq("id", id);
    toast.success("آئیکن/رنگ اپڈیٹ ہو گیا / Icon/color updated");
    setEditingId(null);
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
                  <TableCell className="font-medium">{c.name}</TableCell>
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
              {categories.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">کوئی کیٹیگری نہیں / No categories</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ServicesTab;
