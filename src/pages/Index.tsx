import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import CategoryChips from "@/components/CategoryChips";
import RestaurantGrid from "@/components/RestaurantGrid";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { CartProvider } from "@/contexts/CartContext";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <CartProvider>
      <div className="min-h-screen bg-background">
        <Navbar />
        <HeroBanner searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <CategoryChips activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
        <RestaurantGrid searchQuery={searchQuery} activeCategory={activeCategory} />
        <Footer />
        <CartDrawer />
      </div>
    </CartProvider>
  );
};

export default Index;
