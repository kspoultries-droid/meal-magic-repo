import PageHero from "@/components/common/PageHero";

const rotating = [
  "بریانی تلاش کریں…",
  "پیزا تلاش کریں…",
  "گروسری تلاش کریں…",
  "بی بی کیو تلاش کریں…",
  "برگر تلاش کریں…",
];

const promos = [
  { emoji: "🛵", title: "پہلے آرڈر پر مفت ڈیلیوری", subtitle: "Free delivery on your first order" },
  { emoji: "🔥", title: "روزانہ نئی ڈیلز اور رعایت", subtitle: "Fresh deals every day on EasyLife" },
  { emoji: "⚡", title: "30 منٹ میں تیز ڈیلیوری", subtitle: "Super fast delivery near you" },
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
  />
);

export default HomeHero;
