import { useState, useEffect } from "react";
import { Phone, MessageCircle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const HelplineSection = () => {
  const [phone, setPhone] = useState("03001234567");
  const [whatsapp, setWhatsapp] = useState("923001234567");

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["helpline_phone", "whatsapp_number"]);
      if (data) {
        data.forEach((s) => {
          if (s.key === "helpline_phone") setPhone(s.value);
          if (s.key === "whatsapp_number") setWhatsapp(s.value);
        });
      }
    };
    fetchSettings();
  }, []);

  return (
    <div className="container mx-auto px-4 pb-6">
      <h2 className="text-xl font-extrabold text-foreground mb-4">Helpline & Support / ہیلپ لائن اور سپورٹ</h2>
      <div className="grid grid-cols-1 gap-3">
        <a
          href={`tel:${phone}`}
          className="flex items-center gap-4 bg-card rounded-2xl p-4 border hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center shrink-0">
            <Phone className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">Call Helpline / ہیلپ لائن کال کریں</h3>
            <p className="text-xs text-muted-foreground">{phone} (9 AM - 9 PM / صبح 9 سے رات 9 تک)</p>
          </div>
        </a>

        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 bg-card rounded-2xl p-4 border hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">WhatsApp Support / واٹس ایپ سپورٹ</h3>
            <p className="text-xs text-muted-foreground">Message for instant help / فوری مدد کے لیے میسج کریں</p>
          </div>
        </a>

        <div className="flex items-center gap-4 bg-card rounded-2xl p-4 border">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">Service Guarantee / سروس گارنٹی</h3>
            <p className="text-xs text-muted-foreground">File a complaint within 24 hours if not satisfied / اگر مطمئن نہ ہوں تو 24 گھنٹے میں شکایت درج کرائیں</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelplineSection;
