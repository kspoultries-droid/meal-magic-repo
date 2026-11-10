import { tr } from "./tr";

// Presentation-only translations for existing seeded content. Unknown vendor text stays intact.
const english: Record<string, string> = {
  "آج کی بہترین مارکیٹ ڈیلز": "Today's market deals",
  "بہتر قیمت، زیادہ بچت": "Better prices, more savings",
  "تصدیق شدہ دکانداروں سے براہِ راست خریداری": "Shop directly from verified sellers",
  "پروڈکٹ، برانڈ یا دکان تلاش کریں": "Search products, brands or shops",
  "تصدیق شدہ دکاندار": "Verified sellers",
  "ملک بھر میں ڈیلیوری": "Nationwide delivery",
  "روزانہ نئی ڈیلز": "New deals daily",
  "گھر بیٹھے ماہر کاریگر بک کریں": "Book a professional at your doorstep",
  "سروس تلاش کریں / Search services...": "Search services...",
  "تصدیق شدہ کاریگر": "Verified professionals",
  "فوری بکنگ": "Quick booking",
  "مناسب ریٹ": "Fair prices",
  "کریانہ": "Grocery", "اسٹیشنری": "Stationery", "ڈیپارٹمنٹل اسٹور": "Department stores",
  "ہارڈویئر": "Hardware", "کاسمیٹکس": "Cosmetics", "کپڑا مارکیٹ": "Clothing",
  "برتن/کراکری": "Crockery", "موبائل مارکیٹ": "Mobile shops", "جوتے": "Shoes",
  "کھلونے": "Toys", "موبائل": "Mobiles", "لیپ ٹاپ": "Laptops", "ٹیبلٹ": "Tablets",
  "موبائل ایکسیسریز": "Mobile accessories", "خواتین کے کپڑے": "Women's clothing",
  "ہیلتھ": "Health", "بچوں کے کپڑے": "Children's clothing", "الیکٹرانکس": "Electronics",
  "پنساری": "Herbs & spices", "جنرل": "General", "کراچی": "Karachi",
  "اسمارٹ واچ": "Smart Watch", "کاٹن کرتا": "Cotton Kurta",
  "مستری/ مزدور": "Masonry & labour", "سامان اٹھانا / شفٹنگ": "Moving & lifting",
  "سوئچ بورڈ لگانا": "Switchboard installation", "نیا سوئچ بورڈ اور وائرنگ": "New switchboard and wiring",
  "وائرنگ ریپیئر": "Wiring repair", "الیکٹرک وائرنگ کی مرمت": "Electrical wiring repair",
  "پائپ فٹنگ": "Pipe fitting", "باتھ روم اور کچن پائپ لائن": "Bathroom and kitchen piping",
  "پائپ لیکیج ٹھیک کرنا": "Pipe leak repair", "لیکیج والے پائپ کی مرمت": "Leaking pipe repair",
  "AC سروس": "AC servicing", "ایئر کنڈیشنر کی مکمل صفائی اور گیس چیکنگ": "AC cleaning and gas inspection",
  "AC انسٹالیشن": "AC installation", "نئے AC کی انسٹالیشن اور سیٹنگ": "New AC installation and setup",
  "AC ریپیئر": "AC repair", "AC کی مرمت اور پارٹس تبدیلی": "AC repair and parts replacement",
  "پانی کی ٹنکی کی مکمل صفائی اور دھلائی": "Water tank cleaning and washing",
  "سولر پینلز کی پروفیشنل صفائی": "Professional solar panel cleaning",
  "گھر یا تعمیراتی سائٹ پر پانی ٹینکر کی ڈلیوری": "Water tanker delivery to homes or construction sites",
  "پانی کی موٹر کی مرمت اور سروسنگ": "Water pump repair and servicing",
  "پانی کی ٹینکی کی مکمل صفائی": "Complete water tank cleaning",
  "چھت کی مرمت": "Roof repair", "ٹائلز لگوانا": "Tile installation", "لکڑی کا کام": "Woodwork",
  "پلستر اور چنائی": "Plastering & masonry", "واش روم فٹنگ": "Bathroom fitting",
  "کمرے کی پینٹنگ": "Room painting", "صفائی مزدور": "Cleaning labour", "تعمیراتی مزدور": "Construction labour",
  "باغبانی مزدور": "Gardening labour", "فرنیچر ریپیئر": "Furniture repair", "کچن کیبنٹ": "Kitchen cabinets",
  "فی دن": "Per day",
};

export function displayText(value?: string | null): string {
  if (!value || tr("en", "ur") === "ur") return value || "";
  const text = value.trim();
  if (english[text]) return english[text];
  // Existing bilingual records may put either language first.
  if (/\p{Script=Arabic}/u.test(text) && text.includes(" / ")) {
    const part = text.split(" / ").find((s) => /[a-z]{2}/i.test(s) && !/\p{Script=Arabic}/u.test(s));
    if (part) return part.trim();
  }
  return text.replace(/گھنٹے|گھنٹہ/g, "hours").replace(/منٹ/g, "min").replace(/دن/g, "days");
}