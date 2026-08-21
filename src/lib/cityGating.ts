/** Pure city service-gating rules — mirrors the get_city_services DB function. */

export interface CityGatingInput {
  food_enabled: boolean;
  grocery_enabled: boolean;
  wholesale_enabled: boolean;
  auto_hide_without_rider?: boolean;
  rider_count: number;
}

export interface CityGating {
  foodLive: boolean;
  groceryLive: boolean;
  wholesaleLive: boolean;
}

export const computeCityGating = (city: CityGatingInput | null | undefined): CityGating => {
  // No city picked yet → nothing is blocked.
  if (!city) return { foodLive: true, groceryLive: true, wholesaleLive: true };
  const autoHide = city.auto_hide_without_rider !== false;
  const hasRider = (city.rider_count ?? 0) > 0;
  const riderOk = !autoHide || hasRider;
  return {
    foodLive: !!city.food_enabled && riderOk,
    groceryLive: !!city.grocery_enabled && riderOk,
    // Wholesale ships by courier — riders are irrelevant.
    wholesaleLive: !!city.wholesale_enabled,
  };
};
