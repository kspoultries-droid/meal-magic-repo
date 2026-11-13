import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Store } from "lucide-react";
import { toast } from "sonner";

/** First-time setup: a user who holds the restaurant role but owns no restaurant creates their own. */
const RestaurantSelfSetup = ({ userId, onCreated }: { userId: string; onCreated: () => void }) => {
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [name, setName] = useState("");
  const [cityId, setCityId] = useState("");
  const [address, setAddress] = useState("");
  const [cuisines, setCuisines] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("cities").select("id,name").order("name").then(({ data }) => {
      setCities(data || []);
      if (data?.length) setCityId((c) => c || data[0].id);
    });
  }, []);

  const save = async () => {
    if (name.trim().length < 2 || !cityId) { toast.error(tr("Enter restaurant name and city", "ریسٹورنٹ کا نام اور شہر درج کریں")); return; }
    setSaving(true);
    const { error } = await supabase.from("restaurants").insert({
      owner_id: userId,
      name: name.trim(),
      city_id: cityId,
      pickup_address: address.trim() || null,
      cuisines: cuisines.split(",").map((s) => s.trim()).filter(Boolean),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(tr("Restaurant created! Now add your menu.", "ریسٹورنٹ بن گیا! اب اپنا مینو شامل کریں۔"));
    onCreated();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Store className="mx-auto mb-2 h-12 w-12 text-primary" />
          <CardTitle>{tr("Set up your restaurant", "اپنا ریسٹورنٹ سیٹ اپ کریں")}</CardTitle>
          <p className="text-sm text-muted-foreground">{tr("Menu, photos and location can be added after this step.", "مینو، تصاویر اور مقام اس کے بعد شامل کر سکتے ہیں۔")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder={tr("Restaurant name", "ریسٹورنٹ کا نام")} value={name} onChange={(e) => setName(e.target.value)} />
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={cityId} onChange={(e) => setCityId(e.target.value)}>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input placeholder={tr("Address", "پتہ")} value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input placeholder={tr("Food types (e.g. BBQ, Karahi)", "کھانے کی اقسام (مثلاً BBQ، کڑاہی)")} value={cuisines} onChange={(e) => setCuisines(e.target.value)} />
          <Button className="w-full" disabled={saving} onClick={save}>{saving ? tr("Saving...", "محفوظ ہو رہا ہے...") : tr("Create restaurant", "ریسٹورنٹ بنائیں")}</Button>
        </CardContent>
      </Card>
    </div>
  );
};
export default RestaurantSelfSetup;
