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
}

export const foodCategories: FoodCategory[] = [
  { slug: "biryani", name: "Biryani", ur: "بریانی", icon: Flame },
  { slug: "pizza", name: "Pizza", ur: "پیزا", icon: Pizza },
  { slug: "burgers", name: "Burgers", ur: "برگر", icon: Sandwich },
  { slug: "bbq", name: "BBQ", ur: "بی بی کیو", icon: Beef },
  { slug: "karahi", name: "Karahi", ur: "کڑاہی", icon: Soup },
  { slug: "chinese", name: "Chinese", ur: "چائنیز", icon: Utensils },
  { slug: "broast", name: "Broast", ur: "بروسٹ", icon: Drumstick },
  { slug: "shawarma", name: "Shawarma", ur: "شوارما", icon: Wheat },
  { slug: "coffee", name: "Coffee", ur: "کافی", icon: Coffee },
  { slug: "desserts", name: "Desserts", ur: "میٹھا", icon: CakeSlice },
  { slug: "juice", name: "Juice", ur: "جوس", icon: CupSoda },
  { slug: "healthy", name: "Healthy", ur: "ہیلتھی", icon: Salad },
];
