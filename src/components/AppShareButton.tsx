import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { shareLink } from "@/lib/referral";

interface AppShareButtonProps {
  section?: "food" | "grocery" | "bazar" | "services" | "general";
}

const SECTION_MESSAGES: Record<string, string> = {
  food: "🍔 بہترین ریسٹورنٹس سے کھانا آرڈر کریں!\n\nEasy Life ایپ ڈاؤنلوڈ کریں:",
  bazar: "🛍️ کپڑے، الیکٹرانکس اور گھریلو اشیاء — بازار سے سستے ریٹ پر منگوائیں!\n\nEasy Life ایپ ڈاؤنلوڈ کریں:",
  grocery: "🛒 گھر بیٹھے راشن، سبزی اور گوشت منگوائیں!\n\nEasy Life ایپ ڈاؤنلوڈ کریں:",
  services: "🔧 AC ریپیئر، مستری، الیکٹریشن — سب ایک ایپ میں!\n\nEasy Life ایپ ڈاؤنلوڈ کریں:",
  general: "📱 EasyLife — کھانا، گروسری، بازار اور ہوم سروسز، سب ایک ہی ایپ میں!\n\nEasy Life ایپ ڈاؤنلوڈ کریں:",
};

const AppShareButton = ({ section = "general" }: AppShareButtonProps) => {
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
      className="fixed bottom-24 left-3 z-40 rounded-full h-11 w-11 opacity-90 p-0 bg-success hover:bg-success/90 text-success-foreground shadow-lg"
      title="ایپ لنک شیئر کریں"
    >
      <MessageCircle className="h-5 w-5" />
    </Button>
  );
};

export default AppShareButton;
