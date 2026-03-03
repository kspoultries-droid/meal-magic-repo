import { Search } from "lucide-react";
import heroImage from "@/assets/hero-food.jpg";

interface HeroBannerProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const HeroBanner = ({ searchQuery, onSearchChange }: HeroBannerProps) => {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroImage} alt="Delicious food spread" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-foreground/30" />
      </div>

      <div className="relative container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-background leading-tight mb-4">
            Food, Groceries & Home Services — all delivered
          </h1>
          <p className="text-background/80 text-lg mb-8">
            Order meals, shop groceries & book trusted home services near you.
          </p>

          <div className="flex bg-card rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center gap-3 flex-1 px-5 py-4">
              <Search className="w-5 h-5 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search for restaurant, cuisine or a dish"
                className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
              />
            </div>
            <button className="bg-primary text-primary-foreground px-8 font-bold text-sm hover:opacity-90 transition-opacity">
              Search
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
