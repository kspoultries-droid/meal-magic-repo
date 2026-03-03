import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import QuickCategories from "@/components/QuickCategories";
// PromoBanners removed - using PromotionalAds only
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
      <HeroBanner searchQuery={searchQuery} onSearchChange={setSearchQuery} />
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
