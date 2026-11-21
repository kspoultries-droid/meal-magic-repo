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
import biryani from "@/assets/category-biryani.webp.asset.json";
import pizza from "@/assets/category-pizza.webp.asset.json";
import burgers from "@/assets/category-burgers.webp.asset.json";
import bbq from "@/assets/category-bbq.webp.asset.json";
import karahi from "@/assets/category-karahi.webp.asset.json";
import chinese from "@/assets/category-chinese.webp.asset.json";
import broast from "@/assets/category-broast.webp.asset.json";
import shawarma from "@/assets/category-shawarma.webp.asset.json";
import coffee from "@/assets/category-coffee.webp.asset.json";
import desserts from "@/assets/category-desserts.webp.asset.json";
import juice from "@/assets/category-juice.webp.asset.json";
import healthy from "@/assets/category-healthy.webp.asset.json";

export interface FoodCategory {
  slug: string;
  name: string;
  ur: string;
  icon: LucideIcon;
  image: string;
}

export const foodCategories: FoodCategory[] = [
  { slug: "biryani", name: "Biryani", ur: "بریانی", icon: Flame, image: biryani.url },
  { slug: "pizza", name: "Pizza", ur: "پیزا", icon: Pizza, image: pizza.url },
  { slug: "burgers", name: "Burgers", ur: "برگر", icon: Sandwich, image: burgers.url },
  { slug: "bbq", name: "BBQ", ur: "بی بی کیو", icon: Beef, image: bbq.url },
  { slug: "karahi", name: "Karahi", ur: "کڑاہی", icon: Soup, image: karahi.url },
  { slug: "chinese", name: "Chinese", ur: "چائنیز", icon: Utensils, image: chinese.url },
  { slug: "broast", name: "Broast", ur: "بروسٹ", icon: Drumstick, image: broast.url },
  { slug: "shawarma", name: "Shawarma", ur: "شوارما", icon: Wheat, image: shawarma.url },
  { slug: "coffee", name: "Coffee", ur: "کافی", icon: Coffee, image: coffee.url },
  { slug: "desserts", name: "Desserts", ur: "میٹھا", icon: CakeSlice, image: desserts.url },
  { slug: "juice", name: "Juice", ur: "جوس", icon: CupSoda, image: juice.url },
  { slug: "healthy", name: "Healthy", ur: "ہیلتھی", icon: Salad, image: healthy.url },
];
