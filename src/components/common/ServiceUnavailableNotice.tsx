import { useNavigate } from "react-router-dom";
import { Package, Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CityService } from "@/hooks/useCityServices";

interface Props {
  kind: "food" | "grocery";
  city: CityService | null;
  cities: CityService[];
  onCityChange: (id: string) => void;
}

const labels = {
  food: { ur: "فوڈ ڈلیوری", en: "Food delivery" },
  grocery: { ur: "گروسری ڈلیوری", en: "Grocery delivery" },
};

const ServiceUnavailableNotice = ({ kind, city, cities, onCityChange }: Props) => {
  const navigate = useNavigate();
  const label = labels[kind];

  return (
    <section className="container mx-auto px-4 py-10">
      <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-gradient-card p-6 text-center shadow-card">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
          <Bike className="h-7 w-7 text-muted-foreground" />
        </span>
        <h2 className="text-lg font-extrabold text-foreground">
          {city?.name ? `${city.name} میں ` : ""}
          {label.ur} فی الحال دستیاب نہیں
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          یہاں ابھی ہمارے رائیڈرز موجود نہیں۔ آپ بازار (کورئیر ڈلیوری) سے پورے پاکستان میں خریداری کر سکتے ہیں۔
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">{label.en} is not available in your city yet.</p>

        <Button className="mt-5 h-11 w-full rounded-xl font-extrabold gap-2" onClick={() => navigate("/wholesale")}>
          <Package className="h-4 w-4" /> بازار دیکھیں — کورئیر ڈلیوری
        </Button>

        {cities.length > 0 && (
          <div className="mt-4 text-right">
            <label className="mb-1 block text-[11px] font-bold text-muted-foreground">شہر تبدیل کریں</label>
            <select
              value={city?.id || ""}
              onChange={(e) => onCityChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">شہر منتخب کریں</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </section>
  );
};

export default ServiceUnavailableNotice;
