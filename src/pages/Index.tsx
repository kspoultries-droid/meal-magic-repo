import { useState } from "react";
import Navbar from "@/components/Navbar";
import FoodHero from "@/components/home/FoodHero";
import QuickCategories, { QuickFilter } from "@/components/QuickCategories";
import CategoryRail from "@/components/home/CategoryRail";
import RestaurantGrid from "@/components/RestaurantGrid";
import Footer from "@/components/Footer";
import BottomTabBar from "@/components/BottomTabBar";
import AppShareButton from "@/components/AppShareButton";
import ServiceUnavailableNotice from "@/components/common/ServiceUnavailableNotice";
import ShoppingAssistant from "@/components/assistant/ShoppingAssistant";

import { useCityServices } from "@/hooks/useCityServices";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const activeCategory = "All";
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const isSearching = searchQuery.trim().length > 0;
  const { foodLive, city, cities, setCityId } = useCityServices();

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      <FoodHero searchQuery={searchQuery} onSearchChange={setSearchQuery} hideAds={isSearching || !!quickFilter} />
      {!foodLive ? (
        <ServiceUnavailableNotice kind="food" city={city} cities={cities} onCityChange={setCityId} />
      ) : (
      <>
      <QuickCategories
        active={quickFilter}
        onChange={(f) => {
          setQuickFilter(f);
          if (f) {
            setTimeout(() => document.getElementById("food-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
          }
        }}
      />

      {!isSearching && !quickFilter && <CategoryRail />}
      <RestaurantGrid searchQuery={searchQuery} activeCategory={activeCategory} quickFilter={quickFilter} onClearQuickFilter={() => setQuickFilter(null)} />
      </>
      )}
      <div className="container mx-auto px-4 pb-4 flex items-center justify-end gap-2"><ShoppingAssistant inline /><AppShareButton section="food" inline /></div>
      <Footer />
      <BottomTabBar />
    </div>
  );
};

export default Index;
