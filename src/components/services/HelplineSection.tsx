import { Phone, MessageCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const HelplineSection = () => {
  return (
    <div className="container mx-auto px-4 pb-6">
      <h2 className="text-xl font-extrabold text-foreground mb-4">ہیلپ لائن & سپورٹ</h2>
      <div className="grid grid-cols-1 gap-3">
        <a
          href="tel:03001234567"
          className="flex items-center gap-4 bg-card rounded-2xl p-4 border hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center shrink-0">
            <Phone className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">ہیلپ لائن کال کریں</h3>
            <p className="text-xs text-muted-foreground">0300-1234567 (صبح 9 سے رات 9 تک)</p>
          </div>
        </a>

        <a
          href="https://wa.me/923001234567"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 bg-card rounded-2xl p-4 border hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">واٹس ایپ سپورٹ</h3>
            <p className="text-xs text-muted-foreground">فوری مدد کے لیے میسج کریں</p>
          </div>
        </a>

        <div className="flex items-center gap-4 bg-card rounded-2xl p-4 border">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">سروس گارنٹی</h3>
            <p className="text-xs text-muted-foreground">اگر سروس سے مطمئن نہ ہوں تو 24 گھنٹے میں شکایت درج کرائیں</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelplineSection;
