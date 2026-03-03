import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Eye, EyeOff, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ServicesTab = () => {
  return (
    <Tabs defaultValue="bookings">
      <TabsList className="mb-4">
        <TabsTrigger value="bookings"><Calendar className="h-4 w-4 mr-1" /> بکنگز</TabsTrigger>
        <TabsTrigger value="services">سروسز</TabsTrigger>
        <TabsTrigger value="categories">کیٹیگریز</TabsTrigger>
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
    toast.success("سٹیٹس اپڈیٹ ہو گئی");
    fetch();
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = { pending: "bg-warning text-warning-foreground", confirmed: "bg-primary text-primary-foreground", in_progress: "bg-accent text-accent-foreground", completed: "bg-success text-success-foreground", cancelled: "bg-destructive text-destructive-foreground" };
    return map[s] || "bg-muted text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>سروس بکنگز</CardTitle>
        <Button variant="outline" size="sm" onClick={fetch}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <div className="space-y-3">
            {bookings.length === 0 && <p className="text-center text-muted-foreground py-8">کوئی بکنگ نہیں</p>}
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

  const fetch = async () => {
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

  useEffect(() => { fetch(); }, []);

  const getCatName = (id: string) => categories.find(c => c.id === id)?.name || "—";

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("services").update({ is_active: !current }).eq("id", id);
    toast.success("اپڈیٹ ہو گیا");
    fetch();
  };

  const deleteService = async (id: string) => {
    await supabase.from("services").delete().eq("id", id);
    toast.success("سروس حذف ہو گئی");
    fetch();
  };

  const addService = async () => {
    if (!form.name.trim() || !form.price || !form.category_id) { toast.error("نام، قیمت اور کیٹیگری درکار ہے"); return; }
    const { error } = await supabase.from("services").insert({
      name: form.name, price: Number(form.price), duration: form.duration,
      category_id: form.category_id, description: form.description || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("سروس شامل ہو گئی");
    setForm({ name: "", price: "", duration: "1-2 hours", category_id: categories[0]?.id || "", description: "" });
    setShowAdd(false);
    fetch();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>سروسز</CardTitle>
        <div className="flex gap-2">
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> نئی سروس</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>نئی سروس شامل کریں</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="نام" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <Input placeholder="قیمت" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                <Input placeholder="دورانیہ" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} />
                <select className="w-full border rounded-md p-2 bg-background text-foreground text-sm" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Input placeholder="تفصیل (اختیاری)" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                <Button onClick={addService} className="w-full">شامل کریں</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={fetch}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>کیٹیگری</TableHead>
                <TableHead>قیمت</TableHead>
                <TableHead>دورانیہ</TableHead>
                <TableHead>ایکٹو</TableHead>
                <TableHead>ایکشنز</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{getCatName(s.category_id)}</TableCell>
                  <TableCell>Rs {s.price}</TableCell>
                  <TableCell>{s.duration}</TableCell>
                  <TableCell>
                    <Badge className={s.is_active ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                      {s.is_active ? "ایکٹو" : "غیر ایکٹو"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleActive(s.id, s.is_active)}>
                      {s.is_active ? "بند" : "فعال"}
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteService(s.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {services.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">کوئی سروس نہیں</TableCell></TableRow>}
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

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("service_categories").select("*").order("sort_order");
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("service_categories").update({ is_active: !current }).eq("id", id);
    toast.success("اپڈیٹ ہو گیا");
    fetch();
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("service_categories").delete().eq("id", id);
    toast.success("کیٹیگری حذف ہو گئی");
    fetch();
  };

  const addCategory = async () => {
    if (!form.name.trim()) { toast.error("نام درکار ہے"); return; }
    const { error } = await supabase.from("service_categories").insert({ name: form.name, icon: form.icon, color: form.color });
    if (error) { toast.error(error.message); return; }
    toast.success("کیٹیگری شامل ہو گئی");
    setForm({ name: "", icon: "Wrench", color: "bg-blue-100 text-blue-600" });
    setShowAdd(false);
    fetch();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>سروس کیٹیگریز</CardTitle>
        <div className="flex gap-2">
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> نئی کیٹیگری</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>نئی کیٹیگری</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="نام" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <Input placeholder="آئیکن (e.g. Wrench, Zap)" value={form.icon} onChange={e => setForm({...form, icon: e.target.value})} />
                <Input placeholder="رنگ (e.g. bg-blue-100 text-blue-600)" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
                <Button onClick={addCategory} className="w-full">شامل کریں</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={fetch}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">لوڈ ہو رہا ہے...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>آئیکن</TableHead>
                <TableHead>ایکٹو</TableHead>
                <TableHead>ایکشنز</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.icon}</TableCell>
                  <TableCell>
                    <Badge className={c.is_active ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                      {c.is_active ? "ایکٹو" : "غیر ایکٹو"}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleActive(c.id, c.is_active)}>
                      {c.is_active ? "بند" : "فعال"}
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => deleteCategory(c.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">کوئی کیٹیگری نہیں</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ServicesTab;
