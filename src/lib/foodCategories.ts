export interface FoodCategory {
  slug: string;
  name: string;
  ur: string;
  emoji: string;
}

export const foodCategories: FoodCategory[] = [
  { slug: "biryani", name: "Biryani", ur: "بریانی", emoji: "🍛" },
  { slug: "pizza", name: "Pizza", ur: "پیزا", emoji: "🍕" },
  { slug: "burgers", name: "Burgers", ur: "برگر", emoji: "🍔" },
  { slug: "bbq", name: "BBQ", ur: "بی بی کیو", emoji: "🍢" },
  { slug: "karahi", name: "Karahi", ur: "کڑاہی", emoji: "🍲" },
  { slug: "chinese", name: "Chinese", ur: "چائنیز", emoji: "🥡" },
  { slug: "broast", name: "Broast", ur: "بروسٹ", emoji: "🍗" },
  { slug: "shawarma", name: "Shawarma", ur: "شوارما", emoji: "🌯" },
  { slug: "coffee", name: "Coffee", ur: "کافی", emoji: "☕" },
  { slug: "desserts", name: "Desserts", ur: "میٹھا", emoji: "🍰" },
  { slug: "juice", name: "Juice", ur: "جوس", emoji: "🥤" },
  { slug: "healthy", name: "Healthy", ur: "ہیلتھی", emoji: "🥗" },
];
