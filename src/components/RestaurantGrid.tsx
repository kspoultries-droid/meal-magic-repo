import RestaurantCard from "./RestaurantCard";

export interface Restaurant {
  name: string;
  image: string;
  rating: number;
  deliveryTime: string;
  cuisines: string[];
  discount?: string;
  menuItems: { id: string; name: string; price: number }[];
}

export const restaurants: Restaurant[] = [
  {
    name: "Sakura Sushi House",
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&h=350&fit=crop",
    rating: 4.8,
    deliveryTime: "25-35 min",
    cuisines: ["Japanese", "Sushi", "Asian"],
    discount: "20% OFF",
    menuItems: [
      { id: "sushi-1", name: "California Roll", price: 450 },
      { id: "sushi-2", name: "Salmon Nigiri", price: 550 },
      { id: "sushi-3", name: "Miso Soup", price: 250 },
    ],
  },
  {
    name: "Bella Italia",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&h=350&fit=crop",
    rating: 4.5,
    deliveryTime: "30-40 min",
    cuisines: ["Italian", "Pizza", "Pasta"],
    menuItems: [
      { id: "ita-1", name: "Margherita Pizza", price: 650 },
      { id: "ita-2", name: "Pasta Carbonara", price: 550 },
      { id: "ita-3", name: "Garlic Bread", price: 200 },
    ],
  },
  {
    name: "Burger Republic",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=350&fit=crop",
    rating: 4.6,
    deliveryTime: "20-30 min",
    cuisines: ["American", "Burgers", "Fast Food"],
    discount: "Free Delivery",
    menuItems: [
      { id: "burg-1", name: "Classic Burger", price: 450 },
      { id: "burg-2", name: "Cheese Fries", price: 250 },
      { id: "burg-3", name: "Chicken Wings", price: 350 },
    ],
  },
  {
    name: "Thai Orchid",
    image: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=500&h=350&fit=crop",
    rating: 4.3,
    deliveryTime: "35-45 min",
    cuisines: ["Thai", "Curry", "Asian"],
    menuItems: [
      { id: "thai-1", name: "Pad Thai", price: 400 },
      { id: "thai-2", name: "Green Curry", price: 500 },
      { id: "thai-3", name: "Tom Yum Soup", price: 350 },
    ],
  },
  {
    name: "Green Bowl",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=350&fit=crop",
    rating: 4.7,
    deliveryTime: "15-25 min",
    cuisines: ["Healthy", "Salads", "Bowls"],
    discount: "15% OFF",
    menuItems: [
      { id: "green-1", name: "Quinoa Bowl", price: 500 },
      { id: "green-2", name: "Caesar Salad", price: 400 },
      { id: "green-3", name: "Smoothie", price: 300 },
    ],
  },
  {
    name: "Taco Fiesta",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&h=350&fit=crop",
    rating: 4.4,
    deliveryTime: "25-35 min",
    cuisines: ["Mexican", "Tacos", "Burritos"],
    menuItems: [
      { id: "taco-1", name: "Chicken Tacos", price: 350 },
      { id: "taco-2", name: "Beef Burrito", price: 500 },
      { id: "taco-3", name: "Nachos", price: 300 },
    ],
  },
  {
    name: "Dragon Wok",
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&h=350&fit=crop",
    rating: 4.2,
    deliveryTime: "30-40 min",
    cuisines: ["Chinese", "Wok", "Noodles"],
    menuItems: [
      { id: "wok-1", name: "Fried Rice", price: 350 },
      { id: "wok-2", name: "Chow Mein", price: 400 },
      { id: "wok-3", name: "Spring Rolls", price: 200 },
    ],
  },
  {
    name: "Café Mocha",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&h=350&fit=crop",
    rating: 4.9,
    deliveryTime: "10-20 min",
    cuisines: ["Coffee", "Desserts", "Bakery"],
    discount: "Buy 1 Get 1",
    menuItems: [
      { id: "cafe-1", name: "Latte", price: 250 },
      { id: "cafe-2", name: "Chocolate Cake", price: 350 },
      { id: "cafe-3", name: "Croissant", price: 180 },
    ],
  },
];

interface RestaurantGridProps {
  searchQuery: string;
  activeCategory: string;
}

const RestaurantGrid = ({ searchQuery, activeCategory }: RestaurantGridProps) => {
  const filtered = restaurants.filter((r) => {
    const matchesCategory = activeCategory === "All" || r.cuisines.some((c) => c.toLowerCase().includes(activeCategory.toLowerCase()));
    const matchesSearch = searchQuery === "" || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.cuisines.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <section className="container mx-auto px-4 pb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-extrabold text-foreground">
          {searchQuery ? `Results for "${searchQuery}"` : "Popular near you"}
        </h2>
        <span className="text-muted-foreground text-sm">{filtered.length} restaurants</span>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-semibold mb-2">No restaurants found</p>
          <p className="text-sm">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((r, i) => (
            <div key={r.name} className="animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
              <RestaurantCard restaurant={r} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default RestaurantGrid;
