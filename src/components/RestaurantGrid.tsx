import RestaurantCard from "./RestaurantCard";

const restaurants = [
  {
    name: "Sakura Sushi House",
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&h=350&fit=crop",
    rating: 4.8,
    deliveryTime: "25-35 min",
    cuisines: ["Japanese", "Sushi", "Asian"],
    discount: "20% OFF",
  },
  {
    name: "Bella Italia",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&h=350&fit=crop",
    rating: 4.5,
    deliveryTime: "30-40 min",
    cuisines: ["Italian", "Pizza", "Pasta"],
  },
  {
    name: "Burger Republic",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=350&fit=crop",
    rating: 4.6,
    deliveryTime: "20-30 min",
    cuisines: ["American", "Burgers", "Fast Food"],
    discount: "Free Delivery",
  },
  {
    name: "Thai Orchid",
    image: "https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=500&h=350&fit=crop",
    rating: 4.3,
    deliveryTime: "35-45 min",
    cuisines: ["Thai", "Curry", "Asian"],
  },
  {
    name: "Green Bowl",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=350&fit=crop",
    rating: 4.7,
    deliveryTime: "15-25 min",
    cuisines: ["Healthy", "Salads", "Bowls"],
    discount: "15% OFF",
  },
  {
    name: "Taco Fiesta",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&h=350&fit=crop",
    rating: 4.4,
    deliveryTime: "25-35 min",
    cuisines: ["Mexican", "Tacos", "Burritos"],
  },
  {
    name: "Dragon Wok",
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&h=350&fit=crop",
    rating: 4.2,
    deliveryTime: "30-40 min",
    cuisines: ["Chinese", "Wok", "Noodles"],
  },
  {
    name: "Café Mocha",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&h=350&fit=crop",
    rating: 4.9,
    deliveryTime: "10-20 min",
    cuisines: ["Coffee", "Desserts", "Bakery"],
    discount: "Buy 1 Get 1",
  },
];

const RestaurantGrid = () => {
  return (
    <section className="container mx-auto px-4 pb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-extrabold text-foreground">Popular near you</h2>
        <button className="text-primary text-sm font-bold hover:underline">See all</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {restaurants.map((r) => (
          <div key={r.name} className="animate-fade-in-up" style={{ animationDelay: `${restaurants.indexOf(r) * 80}ms` }}>
            <RestaurantCard {...r} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default RestaurantGrid;
