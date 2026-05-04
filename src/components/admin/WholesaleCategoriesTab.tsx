import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

interface Cat {
  id: string;
  name: string;
  name_ur: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

const WholesaleCategoriesTab = () => {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", name_ur: "", icon: "Package", sort_order: 0 });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Cat>>({});

  const fetchCats = async () => {
    setLoading(true);
    const { data } = await supabase.from("wholesale_categories").select("*").order("sort_order");
    setCats((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCats(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) return toast.error("نام درج کریں");
    const { error } = await supabase.from("wholesale_categories").insert(form as any);
    if (error) return toast.error(error.message);
    toast.success("کیٹیگری شامل ہو گئی");
    setForm({ name: "", name_ur: "", icon: "Package", sort_order: 0 });
    setAdding(false);
    fetchCats();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ڈلیٹ کریں؟")) return;
    const { error } = await supabase.from("wholesale_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("ڈلیٹ ہو گیا");
    fetchCats();
  };

  const handleToggleActive = async (c: Cat) => {
    await supabase.from("wholesale_categories").update({ is_active: !c.is_active }).eq("id", c.id);
    fetchCats();
  };

  const startEdit = (c: Cat) => { setEditId(c.id); setEditForm(c); };
  const saveEdit = async () => {
    if (!editId) return;
    const { error } = await supabase.from("wholesale_categories").update({
      name: editForm.name, name_ur: editForm.name_ur, icon: editForm.icon, sort_order: editForm.sort_order,
    }).eq("id", editId);
    if (error) return toast.error(error.message);
    toast.success("اپڈیٹ ہو گیا");
    setEditId(null);
    fetchCats();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>ہول سیل کیٹیگریز / Wholesale Categories</CardTitle>
        <Button size="sm" onClick={() => setAdding(!adding)}>
          <Plus className="h-4 w-4 mr-1" /> نئی کیٹیگری
        </Button>
      </CardHeader>
      <CardContent>
        {adding && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4 p-3 border rounded-lg bg-muted/30">
            <Input placeholder="Name (Toys)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="نام اردو" value={form.name_ur} onChange={(e) => setForm({ ...form, name_ur: e.target.value })} />
            <Input placeholder="Icon (Package)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
            <Input type="number" placeholder="Sort" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} />
            <Button onClick={handleAdd}>Save</Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground mb-3">
          💡 Icon names from <a href="https://lucide.dev/icons" target="_blank" rel="noreferrer" className="text-primary underline">lucide.dev</a> (e.g. Package, Shirt, Cpu, ToyBrick, Wheat).
        </p>
        {loading ? <p>لوڈ ہو رہا ہے...</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sort</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>اردو</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cats.map((c) => (
                <TableRow key={c.id}>
                  {editId === c.id ? (
                    <>
                      <TableCell><Input className="w-16" type="number" value={editForm.sort_order ?? 0} onChange={(e) => setEditForm({ ...editForm, sort_order: +e.target.value })} /></TableCell>
                      <TableCell><Input value={editForm.name ?? ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></TableCell>
                      <TableCell><Input value={editForm.name_ur ?? ""} onChange={(e) => setEditForm({ ...editForm, name_ur: e.target.value })} /></TableCell>
                      <TableCell><Input value={editForm.icon ?? ""} onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })} /></TableCell>
                      <TableCell>{c.is_active ? "✅" : "❌"}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={saveEdit}><Check className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{c.sort_order}</TableCell>
                      <TableCell className="font-semibold">{c.name}</TableCell>
                      <TableCell>{c.name_ur}</TableCell>
                      <TableCell><code className="text-xs">{c.icon}</code></TableCell>
                      <TableCell>
                        <button onClick={() => handleToggleActive(c)}>{c.is_active ? "✅" : "❌"}</button>
                      </TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default WholesaleCategoriesTab;
