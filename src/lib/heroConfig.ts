export interface HeroConfig {
  eyebrow: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  badge1: string;
  badge2: string;
  badge3: string;
  showBadges: boolean;
  bgFrom: string;
  bgTo: string;
  angle: number;
  textColor: string;
  accentColor: string;
  titleSize: number;
  padding: number;
  radius: number;
  align: "right" | "center" | "left";
  bgImage: string;
  overlay: number;
}

export const bazarHeroDefaults: HeroConfig = {
  eyebrow: "آج کی بہترین مارکیٹ ڈیلز",
  title: "بہتر قیمت، زیادہ بچت",
  subtitle: "تصدیق شدہ دکانداروں سے براہِ راست خریداری",
  searchPlaceholder: "پروڈکٹ، برانڈ یا دکان تلاش کریں",
  badge1: "تصدیق شدہ دکاندار",
  badge2: "ملک بھر میں ڈیلیوری",
  badge3: "روزانہ نئی ڈیلز",
  showBadges: true,
  bgFrom: "#fff6ec",
  bgTo: "#ffe7cd",
  angle: 135,
  textColor: "#2b1c10",
  accentColor: "#c2701a",
  titleSize: 28,
  padding: 16,
  radius: 0,
  align: "right",
  bgImage: "",
  overlay: 0,
};

export const servicesHeroDefaults: HeroConfig = {
  eyebrow: "Professional services at your doorstep",
  title: "ہوم سروسز / Home Services",
  subtitle: "گھر بیٹھے ماہر کاریگر بک کریں",
  searchPlaceholder: "سروس تلاش کریں / Search services...",
  badge1: "تصدیق شدہ کاریگر",
  badge2: "فوری بکنگ",
  badge3: "مناسب ریٹ",
  showBadges: true,
  bgFrom: "#13a05f",
  bgTo: "#0c8f7a",
  angle: 135,
  textColor: "#ffffff",
  accentColor: "#ffffff",
  titleSize: 24,
  padding: 18,
  radius: 0,
  align: "right",
  bgImage: "",
  overlay: 25,
};

export const parseHeroConfig = (raw: string | null | undefined, fallback: HeroConfig): HeroConfig => {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    return { ...fallback, ...parsed } as HeroConfig;
  } catch {
    return fallback;
  }
};

export const heroBackgroundStyle = (config: HeroConfig): React.CSSProperties => ({
  backgroundImage: config.bgImage
    ? `linear-gradient(${config.angle}deg, ${config.bgFrom}${Math.round((config.overlay / 100) * 255).toString(16).padStart(2, "0")}, ${config.bgTo}${Math.round((config.overlay / 100) * 255).toString(16).padStart(2, "0")}), url(${config.bgImage})`
    : `linear-gradient(${config.angle}deg, ${config.bgFrom}, ${config.bgTo})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  color: config.textColor,
  paddingTop: config.padding,
  paddingBottom: config.padding,
  borderRadius: config.radius,
});
