import { useState } from "react";
import { Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import QuickCategories from "@/components/QuickCategories";
import PromotionalAds from "@/components/PromotionalAds";
import CategoryChips from "@/components/CategoryChips";
import RestaurantGrid from "@/components/RestaurantGrid";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import BottomTabBar from "@/components/BottomTabBar";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      {/* Compact search bar */}
      <div className="bg-primary px-4 pb-4">
        <div className="flex items-center gap-3 bg-card rounded-full px-4 py-2.5 shadow">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for restaurants and groceries"
            className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
          />
        </div>
      </div>
      <QuickCategories />
      <PromotionalAds placement="home" />
      <CategoryChips activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
      <RestaurantGrid searchQuery={searchQuery} activeCategory={activeCategory} />
      <Footer />
      <CartDrawer />
      <BottomTabBar />
    </div>
  );
};

export default Index;
