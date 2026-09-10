import {
  Beef,
  CakeSlice,
  Coffee,
  CupSoda,
  Drumstick,
  Flame,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Utensils,
  Wheat,
  type LucideIcon,
} from "lucide-react";

export interface FoodCategory {
  slug: string;
  name: string;
  ur: string;
  icon: LucideIcon;
  image: string;
}

const img = (id: string) => `https://images.unsplash.com/${id}?w=240&h=240&fit=crop&fm=webp&q=70`;

export const foodCategories: FoodCategory[] = [
  { slug: "biryani", name: "Biryani", ur: "بریانی", icon: Flame, image: img("photo-1563379091339-03b21ab4a4f8") },
  { slug: "pizza", name: "Pizza", ur: "پیزا", icon: Pizza, image: img("photo-1513104890138-7c749659a591") },
  { slug: "burgers", name: "Burgers", ur: "برگر", icon: Sandwich, image: img("photo-1568901346375-23c9450c58cd") },
  { slug: "bbq", name: "BBQ", ur: "بی بی کیو", icon: Beef, image: img("photo-1555939594-58d7cb561ad1") },
  { slug: "karahi", name: "Karahi", ur: "کڑاہی", icon: Soup, image: img("photo-1604908176997-125f25cc6f3d") },
  { slug: "chinese", name: "Chinese", ur: "چائنیز", icon: Utensils, image: img("photo-1585032226651-759b368d7246") },
  { slug: "broast", name: "Broast", ur: "بروسٹ", icon: Drumstick, image: img("photo-1562967914-608f82629710") },
  { slug: "shawarma", name: "Shawarma", ur: "شوارما", icon: Wheat, image: img("photo-1529006557810-274b9b2fc783") },
  { slug: "coffee", name: "Coffee", ur: "کافی", icon: Coffee, image: img("photo-1509042239860-f550ce710b93") },
  { slug: "desserts", name: "Desserts", ur: "میٹھا", icon: CakeSlice, image: img("photo-1551024506-0bccd828d307") },
  { slug: "juice", name: "Juice", ur: "جوس", icon: CupSoda, image: img("photo-1600271886742-f049cd451bba") },
  { slug: "healthy", name: "Healthy", ur: "ہیلتھی", icon: Salad, image: img("photo-1512621776951-a57141f2eefd") },
];
