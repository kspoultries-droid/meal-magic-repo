export const MENU_CATEGORIES = ["Biryani & Rice", "Burgers", "Pizza", "Fries", "Rolls & Wraps", "Wings & Fried Chicken", "BBQ", "Karahi", "Chinese", "Broast", "Shawarma", "Coffee", "Drinks", "Desserts", "Breakfast", "Healthy", "Fast Food", "Other"];

// Specific dish identity takes precedence over a broad source-menu heading.
export function classifyMenuCategory(name: string, fallback = "Other"): string {
  const rules: [RegExp, string][] = [
    [/burger|zinger|برگر/i, "Burgers"],
    [/fries|فرائز/i, "Fries"],
    [/biryani|بریانی/i, "Biryani & Rice"],
    [/pizza|پیزا/i, "Pizza"],
    [/shawarma|شوارما/i, "Shawarma"],
    [/roll|wrap|رول/i, "Rolls & Wraps"],
    [/wing|nugget|chunk|fried chicken|ونگز|نگٹس/i, "Wings & Fried Chicken"],
    [/karahi|کڑاہی/i, "Karahi"],
    [/broast|بروسٹ/i, "Broast"],
    [/chow\s?mein|manchurian|fried rice|shashlik/i, "Chinese"],
    [/bbq|b\.?\s*b\.?\s*q|bar\s*b\s*q|tikka|k[ae]bab|تکہ|کباب/i, "BBQ"],
  ];
  return rules.find(([pattern]) => pattern.test(name))?.[1] || fallback;
}