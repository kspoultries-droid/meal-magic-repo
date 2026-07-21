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
import AppShareButton from "@/components/AppShareButton";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      {/* Premium search bar */}
      <div className="bg-gradient-hero px-4 pb-5 pt-1">
        <div className="flex items-center gap-3 bg-card/95 backdrop-blur rounded-full px-4 py-3 shadow-elegant border border-white/20">
          <Search className="w-5 h-5 text-primary shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ریسٹورنٹ، گروسری یا ڈش تلاش کریں..."
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
      <AppShareButton section="food" />
      <BottomTabBar />
    </div>
  );
};

export default Index;
