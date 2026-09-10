import PageHero from "@/components/common/PageHero";

const rotating = [
  "آج کیا کھانے کا دل ہے؟",
  "بریانی، پیزا یا برگر؟",
  "اپنا پسندیدہ کھانا لکھیں…",
  "قریبی ریسٹورنٹس تلاش کریں…",
];

const promos = [
  { emoji: "🛵", title: "پہلے آرڈر پر مفت ڈیلیوری", subtitle: "Free delivery on your first order" },
  { emoji: "🔥", title: "روزانہ نئی ڈیلز اور رعایت", subtitle: "Fresh deals every day on EasyLife" },
  { emoji: "⚡", title: "30 منٹ میں تیز ڈیلیوری", subtitle: "Super fast delivery near you" },
];

const features = [
  { emoji: "🛵", label: "مفت ڈیلیوری" },
  { emoji: "⚡", label: "30 منٹ میں" },
  { emoji: "🔥", label: "آج کی ڈیلز" },
  { emoji: "⭐", label: "ٹاپ ریٹڈ" },
];

interface HomeHeroProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const HomeHero = ({ searchQuery, onSearchChange }: HomeHeroProps) => (
  <PageHero
    title="کھانا / Food"
    eyebrow="ریسٹورنٹس، فاسٹ فوڈ اور بہت کچھ"
    searchQuery={searchQuery}
    onSearchChange={onSearchChange}
    placeholders={rotating}
    promos={promos}
    features={features}
    showLocation={false}
  />
);

export default HomeHero;
