const aliases: Record<string, string[]> = {
  biryani: ["biryani", "بریانی"],
  burgers: ["burger", "برگر"],
  pizza: ["pizza", "پیزا"],
  bbq: ["bbq", "bar b q", "barbecue", "barbeque", "tikka", "kebab", "kabab", "تکہ", "کباب", "بی بی کیو"],
  karahi: ["karahi", "کڑاہی"],
  chinese: ["chinese", "چائنیز", "chow mein", "chowmein", "manchurian", "fried rice", "shashlik"],
  broast: ["broast", "بروسٹ"],
  shawarma: ["shawarma", "شوارما"],
  coffee: ["coffee", "کافی"],
  desserts: ["dessert", "sweet", "halwa", "cake", "ice cream", "میٹھا", "حلوہ", "کیک"],
  juice: ["juice", "جوس"],
  healthy: ["healthy", "salad", "ہیلتھی", "سلاد"],
};

export function matchesFoodCategory(category: string, texts: (string | null | undefined)[]) {
  if (category === "All") return true;
  const key = category.toLowerCase().trim();
  const needles = aliases[key] || [key];
  return texts.some(text => needles.some(needle => (text || "").toLowerCase().includes(needle)));
}