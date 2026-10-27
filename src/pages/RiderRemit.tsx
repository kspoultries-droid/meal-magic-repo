import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import RiderRemittance from "@/components/rider/RiderRemittance";

const RiderRemit = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_rider_summary");
    setSummary(Array.isArray(data) ? data[0] : data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const cashDue = Number(summary?.cash_due ?? 0);
  const pending = Number(summary?.pending_remit ?? 0);

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur px-3 py-2.5 flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/rider-dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-sm font-extrabold text-primary leading-tight">رقم جمع کرائیں</h1>
          <p className="text-[10px] text-muted-foreground">کیش آن ڈلیوری کی رقم EasyLife کو جمع کرائیں</p>
        </div>
      </header>
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-[10px] text-muted-foreground">واجب الادا</p>
            <p className="text-lg font-extrabold text-destructive">Rs {Math.round(cashDue)}</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-[10px] text-muted-foreground">تصدیق کے انتظار میں</p>
            <p className="text-lg font-extrabold text-warning">Rs {Math.round(pending)}</p>
          </div>
        </div>
        <RiderRemittance cashDue={cashDue} onSubmitted={load} />
      </div>
    </div>
  );
};

export default RiderRemit;
