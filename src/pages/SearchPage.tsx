import { Search } from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import RestaurantGrid from "@/components/RestaurantGrid";

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="container mx-auto px-4 py-4">
        <div className="flex bg-card rounded-2xl overflow-hidden shadow-md border">
          <div className="flex items-center gap-3 flex-1 px-4 py-3">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for restaurants, cuisines or dishes..."
              className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
              autoFocus
            />
          </div>
        </div>
      </div>

      <RestaurantGrid searchQuery={searchQuery} activeCategory="All" />
      <BottomTabBar />
    </div>
  );
};

export default SearchPage;
