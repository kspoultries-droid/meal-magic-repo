import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { shareLink } from "@/lib/referral";
import { tr } from "@/lib/i18n/tr";

interface AppShareButtonProps {
  section?: "food" | "grocery" | "bazar" | "services" | "general";
  inline?: boolean;
}

const SECTION_MESSAGES: Record<string, string> = {
  food: "🍔 بہترین ریسٹورنٹس سے کھانا آرڈر کریں!\n\nEasy Life ایپ ڈاؤنلوڈ کریں:",
  bazar: "🛍️ کپڑے، الیکٹرانکس اور گھریلو اشیاء — بازار سے سستے ریٹ پر منگوائیں!\n\nEasy Life ایپ ڈاؤنلوڈ کریں:",
  grocery: "🛒 گھر بیٹھے راشن، سبزی اور گوشت منگوائیں!\n\nEasy Life ایپ ڈاؤنلوڈ کریں:",
  services: "🔧 AC ریپیئر، مستری، الیکٹریشن — سب ایک ایپ میں!\n\nEasy Life ایپ ڈاؤنلوڈ کریں:",
  general: "📱 EasyLife — کھانا، گروسری، بازار اور ہوم سروسز، سب ایک ہی ایپ میں!\n\nEasy Life ایپ ڈاؤنلوڈ کریں:",
};

const AppShareButton = ({ section = "general", inline = false }: AppShareButtonProps) => {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("referral_code").eq("id", data.user.id).maybeSingle();
      setCode(p?.referral_code ?? null);
    });
  }, []);

  const handleShare = () => {
    const extra = code ? `\n\nپہلے آرڈر پر Rs 50 انعام — میرا کوڈ: ${code}` : "";
    const msg = `${SECTION_MESSAGES[section]}\n${shareLink(code)}${extra}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <Button
      onClick={handleShare}
      size="sm"
      className={inline ? "h-10 gap-1.5 bg-success text-success-foreground hover:bg-success/90" : "fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] end-3 z-40 rounded-full h-11 w-11 opacity-90 p-0 bg-success hover:bg-success/90 text-success-foreground shadow-lg"}
      aria-label={tr("Share app", "ایپ شیئر کریں")}
      title={tr("Share app", "ایپ شیئر کریں")}
    >
      <MessageCircle className="h-5 w-5" />
      {inline && tr("Share", "شیئر")}
    </Button>
  );
};

export default AppShareButton;
