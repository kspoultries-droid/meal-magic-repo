import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppShareButtonProps {
  section?: "food" | "grocery" | "services" | "general";
}

const SECTION_MESSAGES: Record<string, string> = {
  food: "🍔 بہترین ریسٹورنٹس سے کھانا آرڈر کریں!\n\nابھی ایپ ڈاؤنلوڈ کریں:",
  grocery: "🛒 گھر بیٹھے گروسری منگوائیں!\n\nابھی ایپ ڈاؤنلوڈ کریں:",
  services: "🔧 AC ریپیئر، مستری، الیکٹریشن — سب ایک ایپ میں!\n\nابھی ایپ ڈاؤنلوڈ کریں:",
  general: "📱 فوڈ، گروسری اور سروسز — سب ایک ایپ میں!\n\nابھی ڈاؤنلوڈ کریں:",
};

const AppShareButton = ({ section = "general" }: AppShareButtonProps) => {
  const handleShare = () => {
    // Always use published URL, not preview URL
    const publishedOrigin = window.location.origin.includes("preview--")
      ? window.location.origin.replace(/id-preview--[^.]+/, "meal-magic-repo")
      : window.location.origin;
    const appUrl = `${publishedOrigin}/install`;
    const msg = `${SECTION_MESSAGES[section]}\n${appUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <Button
      onClick={handleShare}
      size="sm"
      className="fixed bottom-24 right-4 z-40 rounded-full h-12 w-12 p-0 bg-green-500 hover:bg-green-600 text-white shadow-lg"
      title="ایپ لنک شیئر کریں"
    >
      <MessageCircle className="h-5 w-5" />
    </Button>
  );
};

export default AppShareButton;
