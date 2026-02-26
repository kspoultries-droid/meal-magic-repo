import { MapPin, ShoppingBag, User, Search } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

const Navbar = () => {
  const { totalItems, setIsOpen } = useCart();

  return (
    <nav className="sticky top-0 z-50 bg-card border-b shadow-sm">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-extrabold text-lg">fp</span>
          </div>
          <span className="text-xl font-extrabold text-foreground hidden sm:block">
            food<span className="text-primary">panda</span>
          </span>
        </div>

        <button className="hidden md:flex items-center gap-2 bg-secondary px-4 py-2 rounded-full text-sm font-semibold text-foreground hover:bg-muted transition-colors">
          <MapPin className="w-4 h-4 text-primary" />
          <span>New York, NY</span>
        </button>

        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-secondary transition-colors">
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="p-2 rounded-full hover:bg-secondary transition-colors">
            <User className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="relative p-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
