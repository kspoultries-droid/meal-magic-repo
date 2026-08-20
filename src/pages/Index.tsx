import { useState } from "react";
import Navbar from "@/components/Navbar";
import HomeHero from "@/components/home/HomeHero";
import TrustStrip from "@/components/home/TrustStrip";
import TopPicksRail from "@/components/home/TopPicksRail";
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
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      <Navbar />
      <HomeHero searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <QuickCategories />

      {!isSearching && (
        <>
          <PromotionalAds placement="home" />
          <TopPicksRail />
          <TrustStrip />
        </>
      )}
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
