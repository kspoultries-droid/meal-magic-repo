import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

const CartDrawer = () => {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, clearCart, totalItems, totalPrice } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            Your Cart ({totalItems})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <ShoppingBag className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-semibold">Your cart is empty</p>
            <p className="text-sm">Add items from a restaurant to get started</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 py-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 bg-secondary/50 rounded-xl p-3">
                  <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.restaurant}</p>
                    <p className="text-sm font-bold text-primary mt-1">Rs. {item.price}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full bg-card border flex items-center justify-center hover:bg-accent transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-bold text-foreground">Rs. {totalPrice}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="font-bold text-success">FREE</span>
              </div>
              <div className="flex justify-between text-base border-t pt-3">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-extrabold text-primary">Rs. {totalPrice}</span>
              </div>
              <Button className="w-full h-12 text-base font-bold">
                Checkout — Rs. {totalPrice}
              </Button>
              <button onClick={clearCart} className="w-full text-sm text-muted-foreground hover:text-destructive transition-colors">
                Clear cart
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
