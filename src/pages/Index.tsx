import { useState } from "react";
import Navbar from "@/components/Navbar";
import HomeHero from "@/components/home/HomeHero";
import TopPicksRail from "@/components/home/TopPicksRail";
import QuickCategories, { QuickFilter } from "@/components/QuickCategories";
import PromotionalAds from "@/components/PromotionalAds";
import CategoryRail from "@/components/home/CategoryRail";
import HeroPromo from "@/components/home/HeroPromo";
import RestaurantGrid from "@/components/RestaurantGrid";
import Footer from "@/components/Footer";
import BottomTabBar from "@/components/BottomTabBar";
import AppShareButton from "@/components/AppShareButton";
import ServiceUnavailableNotice from "@/components/common/ServiceUnavailableNotice";
import LocationBar from "@/components/location/LocationBar";
import { useCityServices } from "@/hooks/useCityServices";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const isSearching = searchQuery.trim().length > 0;
  const { foodLive, city, cities, setCityId } = useCityServices();

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      <Navbar />
      <HomeHero searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      {!foodLive ? (
        <ServiceUnavailableNotice kind="food" city={city} cities={cities} onCityChange={setCityId} />
      ) : (
      <>
      {!isSearching && !quickFilter && <HeroPromo />}
      <QuickCategories
        active={quickFilter}
        onChange={(f) => {
          setQuickFilter(f);
          if (f) {
            setTimeout(() => document.getElementById("food-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
          }
        }}
      />

      {!isSearching && !quickFilter && (
        <>
          <PromotionalAds placement="home" />
          <TopPicksRail />
        </>
      )}
      <CategoryRail />
      <RestaurantGrid searchQuery={searchQuery} activeCategory={activeCategory} quickFilter={quickFilter} onClearQuickFilter={() => setQuickFilter(null)} />
      </>
      )}
      <Footer />
      <AppShareButton section="food" />
      <BottomTabBar />
    </div>
  );
};

export default Index;
