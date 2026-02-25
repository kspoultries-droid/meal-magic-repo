import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import CategoryChips from "@/components/CategoryChips";
import RestaurantGrid from "@/components/RestaurantGrid";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroBanner />
      <CategoryChips />
      <RestaurantGrid />
      <Footer />
    </div>
  );
};

export default Index;
