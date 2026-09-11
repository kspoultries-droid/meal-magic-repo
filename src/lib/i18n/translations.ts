export type LangCode = "ur" | "en" | "hi" | "bn" | "ar";

export const LANGUAGES: { code: LangCode; label: string; native: string; dir: "rtl" | "ltr"; flag: string }[] = [
  { code: "ur", label: "Urdu", native: "اردو", dir: "rtl", flag: "🇵🇰" },
  { code: "en", label: "English", native: "English", dir: "ltr", flag: "🇬🇧" },
  { code: "hi", label: "Hindi", native: "हिन्दी", dir: "ltr", flag: "🇮🇳" },
  { code: "bn", label: "Bangla", native: "বাংলা", dir: "ltr", flag: "🇧🇩" },
  { code: "ar", label: "Arabic", native: "العربية", dir: "rtl", flag: "🇦🇪" },
];

export const DEFAULT_LANG: LangCode = "ur";

type Entry = Record<LangCode, string>;

export const translations = {
  // ---- Bottom tabs / navigation ----
  "tab.food": { ur: "کھانا", en: "Food", hi: "खाना", bn: "খাবার", ar: "طعام" },
  "tab.grocery": { ur: "گروسری", en: "Grocery", hi: "किराना", bn: "মুদি", ar: "بقالة" },
  "tab.bazar": { ur: "بازار", en: "Bazar", hi: "बाज़ार", bn: "বাজার", ar: "سوق" },
  "tab.reels": { ur: "ریلز", en: "Reels", hi: "रील्स", bn: "রিলস", ar: "ريلز" },
  "tab.services": { ur: "سروسز", en: "Services", hi: "सेवाएँ", bn: "সেবা", ar: "خدمات" },
  "tab.cart": { ur: "ٹوکری", en: "Cart", hi: "कार्ट", bn: "কার্ট", ar: "السلة" },
  "tab.account": { ur: "اکاؤنٹ", en: "Account", hi: "खाता", bn: "অ্যাকাউন্ট", ar: "الحساب" },

  // ---- Roles ----
  "role.admin": { ur: "ایڈمن", en: "Admin", hi: "एडमिन", bn: "অ্যাডমিন", ar: "المشرف" },
  "role.restaurant": { ur: "ریسٹورنٹ", en: "Restaurant", hi: "रेस्तराँ", bn: "রেস্তোরাঁ", ar: "مطعم" },
  "role.rider": { ur: "رائیڈر", en: "Rider", hi: "राइडर", bn: "রাইডার", ar: "سائق" },
  "role.support": { ur: "سپورٹ", en: "Support", hi: "सपोर्ट", bn: "সাপোর্ট", ar: "الدعم" },
  "role.mechanic": { ur: "مکینک", en: "Mechanic", hi: "मैकेनिक", bn: "মেকানিক", ar: "ميكانيكي" },
  "role.serviceManager": { ur: "سروس مینیجر", en: "Service Manager", hi: "सर्विस मैनेजर", bn: "সার্ভিস ম্যানেজার", ar: "مدير الخدمة" },

  // ---- Common actions ----
  "common.language": { ur: "زبان", en: "Language", hi: "भाषा", bn: "ভাষা", ar: "اللغة" },
  "common.save": { ur: "محفوظ کریں", en: "Save", hi: "सेव करें", bn: "সংরক্ষণ", ar: "حفظ" },
  "common.cancel": { ur: "منسوخ", en: "Cancel", hi: "रद्द करें", bn: "বাতিল", ar: "إلغاء" },
  "common.search": { ur: "تلاش کریں", en: "Search", hi: "खोजें", bn: "খুঁজুন", ar: "بحث" },
  "common.refresh": { ur: "ریفریش", en: "Refresh", hi: "रिफ्रेश", bn: "রিফ্রেশ", ar: "تحديث" },
  "common.loading": { ur: "لوڈ ہو رہا ہے…", en: "Loading…", hi: "लोड हो रहा है…", bn: "লোড হচ্ছে…", ar: "جارٍ التحميل…" },
  "common.home": { ur: "ہوم", en: "Home", hi: "होम", bn: "হোম", ar: "الرئيسية" },
  "common.orders": { ur: "آرڈرز", en: "Orders", hi: "ऑर्डर", bn: "অর্ডার", ar: "الطلبات" },
  "common.total": { ur: "کل", en: "Total", hi: "कुल", bn: "মোট", ar: "الإجمالي" },
  "common.logout": { ur: "لاگ آؤٹ", en: "Log out", hi: "लॉग आउट", bn: "লগ আউট", ar: "تسجيل الخروج" },
  "common.login": { ur: "لاگ ان", en: "Log in", hi: "लॉग इन", bn: "লগ ইন", ar: "تسجيل الدخول" },
  "common.profile": { ur: "پروفائل", en: "Profile", hi: "प्रोफ़ाइल", bn: "প্রোফাইল", ar: "الملف الشخصي" },
  "common.delivery": { ur: "ڈیلیوری", en: "Delivery", hi: "डिलीवरी", bn: "ডেলিভারি", ar: "التوصيل" },
  "common.earnings": { ur: "کمائی", en: "Earnings", hi: "कमाई", bn: "আয়", ar: "الأرباح" },
  "common.history": { ur: "ہسٹری", en: "History", hi: "इतिहास", bn: "ইতিহাস", ar: "السجل" },
  "common.performance": { ur: "کارکردگی", en: "Performance", hi: "प्रदर्शन", bn: "পারফরম্যান্স", ar: "الأداء" },
  "common.menu": { ur: "مینو", en: "Menu", hi: "मेन्यू", bn: "মেনু", ar: "القائمة" },
  "common.reports": { ur: "رپورٹس", en: "Reports", hi: "रिपोर्ट", bn: "রিপোর্ট", ar: "التقارير" },
  "common.settings": { ur: "سیٹنگز", en: "Settings", hi: "सेटिंग्स", bn: "সেটিংস", ar: "الإعدادات" },
  "common.online": { ur: "آن لائن", en: "Online", hi: "ऑनलाइन", bn: "অনলাইন", ar: "متصل" },
  "common.offline": { ur: "آف لائن", en: "Offline", hi: "ऑफलाइन", bn: "অফলাইন", ar: "غير متصل" },

  // ---- Dashboards ----
  "dash.admin": { ur: "ایڈمن ڈیش بورڈ", en: "Admin Dashboard", hi: "एडमिन डैशबोर्ड", bn: "অ্যাডমিন ড্যাশবোর্ড", ar: "لوحة تحكم المشرف" },
  "dash.rider": { ur: "رائیڈر ڈیش بورڈ", en: "Rider Dashboard", hi: "राइडर डैशबोर्ड", bn: "রাইডার ড্যাশবোর্ড", ar: "لوحة السائق" },
  "dash.restaurant": { ur: "ریسٹورنٹ ڈیش بورڈ", en: "Restaurant Dashboard", hi: "रेस्तराँ डैशबोर्ड", bn: "রেস্তোরাঁ ড্যাশবোর্ড", ar: "لوحة المطعم" },

  // ---- Order statuses ----
  "status.pending": { ur: "زیرِ التوا", en: "Pending", hi: "लंबित", bn: "অপেক্ষমাণ", ar: "قيد الانتظار" },
  "status.confirmed": { ur: "تصدیق شدہ", en: "Confirmed", hi: "पुष्ट", bn: "নিশ্চিত", ar: "مؤكد" },
  "status.preparing": { ur: "تیار ہو رہا ہے", en: "Preparing", hi: "तैयार हो रहा है", bn: "প্রস্তুত হচ্ছে", ar: "قيد التحضير" },
  "status.delivering": { ur: "راستے میں", en: "On the way", hi: "रास्ते में", bn: "পথে আছে", ar: "في الطريق" },
  "status.delivered": { ur: "پہنچا دیا", en: "Delivered", hi: "डिलीवर हुआ", bn: "ডেলিভার হয়েছে", ar: "تم التسليم" },
  "status.cancelled": { ur: "منسوخ", en: "Cancelled", hi: "रद्द", bn: "বাতিল", ar: "ملغى" },
  "status.completed": { ur: "مکمل", en: "Completed", hi: "पूर्ण", bn: "সম্পন্ন", ar: "مكتمل" },
} satisfies Record<string, Entry>;

export type TranslationKey = keyof typeof translations;
