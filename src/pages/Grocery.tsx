import { Search, Apple, Carrot, Milk, Egg, ShoppingBasket, Wheat } from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import CartDrawer from "@/components/CartDrawer";

const groceryCategories = [
  { name: "Fruits", icon: Apple, color: "bg-green-100 text-green-600" },
  { name: "Vegetables", icon: Carrot, color: "bg-orange-100 text-orange-600" },
  { name: "Dairy", icon: Milk, color: "bg-blue-100 text-blue-600" },
  { name: "Eggs", icon: Egg, color: "bg-yellow-100 text-yellow-600" },
  { name: "Grocery", icon: ShoppingBasket, color: "bg-primary/10 text-primary" },
  { name: "Atta & Rice", icon: Wheat, color: "bg-amber-100 text-amber-700" },
];

const Grocery = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      {/* Header */}
      <div className="bg-primary pt-4 pb-8 px-4">
        <h1 className="text-2xl font-extrabold text-primary-foreground mb-4">Grocery & Vegetables</h1>
        <div className="flex bg-card rounded-2xl overflow-hidden shadow-lg">
          <div className="flex items-center gap-3 flex-1 px-4 py-3">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for groceries..."
              className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
            />
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-xl font-extrabold text-foreground mb-4">Shop by Category</h2>
        <div className="grid grid-cols-3 gap-4">
          {groceryCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-card border hover:shadow-md transition-shadow"
              >
                <div className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center`}>
                  <Icon className="w-7 h-7" />
                </div>
                <span className="text-sm font-bold text-foreground">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="container mx-auto px-4 py-4">
        <div className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-center">
          <ShoppingBasket className="w-12 h-12 text-white mx-auto mb-3" />
          <h3 className="text-xl font-extrabold text-white mb-1">جلد آ رہا ہے!</h3>
          <p className="text-white/80 text-sm">گروسری اور سبزیاں آپ کی دہلیز پر</p>
        </div>
      </div>

      <CartDrawer />
      <BottomTabBar />
    </div>
  );
};

export default Grocery;
