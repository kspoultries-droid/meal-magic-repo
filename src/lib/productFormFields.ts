/** Categories sold as fresh/prepared food: the add form hides retail-only fields. */
export const FRESH_FOOD_CATEGORIES = ["Bakery", "Frozen", "Fast Food", "Sweets"];
export const isFreshFoodCategory = (category?: string | null) =>
  !!category && FRESH_FOOD_CATEGORIES.some((c) => c.toLowerCase() === category.trim().toLowerCase());
