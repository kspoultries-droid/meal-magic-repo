// Ready-made, locally realistic cover photos for shops and restaurants.
// Owners pick one once; the chosen photo is copied into storage so its URL stays permanent.
import attaRice from "@/assets/grocery/atta-rice.jpg";
import oil from "@/assets/grocery/oil.jpg";
import dal from "@/assets/grocery/dal.jpg";
import spices from "@/assets/grocery/spices.jpg";
import tea from "@/assets/grocery/tea.jpg";
import sugar from "@/assets/grocery/sugar.jpg";
import fruits from "@/assets/grocery/fruits.jpg";
import vegetables from "@/assets/grocery/vegetables.jpg";
import milk from "@/assets/grocery/milk.jpg";
import dahi from "@/assets/grocery/dahi.jpg";
import butterCheese from "@/assets/grocery/butter-cheese.jpg";
import cream from "@/assets/grocery/cream.jpg";
import paneer from "@/assets/grocery/paneer.jpg";
import desiGhee from "@/assets/grocery/desi-ghee.jpg";
import beverages from "@/assets/grocery/beverages.jpg";
import biscuits from "@/assets/grocery/biscuits.jpg";
import basmati from "@/assets/grocery/basmati-rice.jpg";
import cake from "@/assets/grocery/cat-cake.jpg";
import icecream from "@/assets/grocery/icecream.jpg";
import groceryHero from "@/assets/grocery-hero.jpg";
import slideRation from "@/assets/grocery-slide-ration.jpg";
import slideProduce from "@/assets/grocery-slide-produce.jpg";
import slideMeat from "@/assets/grocery-slide-meat.jpg";
import meatShop from "@/assets/meat/meat-shop-banner.jpg";
import beef from "@/assets/meat/beef.jpg";
import mutton from "@/assets/meat/mutton.jpg";
import wholeChicken from "@/assets/meat/whole-chicken.jpg";
import chickenBreast from "@/assets/meat/chicken-breast.jpg";
import chickenLegs from "@/assets/meat/chicken-legs.jpg";
import keema from "@/assets/meat/keema.jpg";
import eggs from "@/assets/meat/eggs.jpg";
import fish from "@/assets/meat/fish.jpg";
import paye from "@/assets/meat/paye.jpg";
import bClothing from "@/assets/bazar/clothing.jpg";
import bShoes from "@/assets/bazar/shoes.jpg";
import bElectronics from "@/assets/bazar/electronics.jpg";
import bMobiles from "@/assets/bazar/mobiles.jpg";
import bBeauty from "@/assets/bazar/beauty.jpg";
import bHardware from "@/assets/bazar/hardware.jpg";
import bGeneral from "@/assets/bazar/general.jpg";
import slideFashion from "@/assets/bazar-slide-fashion.jpg";
import slideElectronics from "@/assets/bazar-slide-electronics.jpg";
import slideHome from "@/assets/bazar-slide-home.jpg";
import fBiryani from "@/assets/food-biryani.jpg";
import fKarahi from "@/assets/food-karahi.jpg";
import fBbq from "@/assets/food-bbq.jpg";
import fHero from "@/assets/hero-food.jpg";
import fBreakfast from "@/assets/food/breakfast-halwa-puri.jpg";
import fFast from "@/assets/food/fast-food.jpg";
import fNihari from "@/assets/food/nihari.jpg";
import fMithai from "@/assets/food/mithai-bakery.jpg";

export type BannerVertical = "grocery" | "wholesale" | "restaurant";
export interface BannerOption { id: string; src: string; tags: string[] }

const G = (id: string, src: string, ...tags: string[]): BannerOption => ({ id, src, tags });

const LIB: Record<BannerVertical, BannerOption[]> = {
  grocery: [
    G("g-hero", groceryHero, "general", "kirana"), G("g-ration", slideRation, "general", "kirana", "atta"),
    G("g-atta", attaRice, "atta", "general"), G("g-basmati", basmati, "atta", "general"),
    G("g-oil", oil, "general"), G("g-ghee", desiGhee, "general", "dairy"), G("g-dal", dal, "general"),
    G("g-spices", spices, "general"), G("g-tea", tea, "general"), G("g-sugar", sugar, "general"),
    G("g-bev", beverages, "general", "drinks"), G("g-biscuits", biscuits, "general", "bakery"),
    G("g-produce", slideProduce, "fruit", "vegetable"), G("g-fruits", fruits, "fruit"), G("g-veg", vegetables, "vegetable"),
    G("d-milk", milk, "dairy", "milk"), G("d-dahi", dahi, "dairy", "milk"), G("d-butter", butterCheese, "dairy"),
    G("d-cream", cream, "dairy"), G("d-paneer", paneer, "dairy"), G("d-ice", icecream, "dairy", "bakery"),
    G("m-shop", meatShop, "meat", "chicken"), G("m-slide", slideMeat, "meat"), G("m-beef", beef, "meat"),
    G("m-mutton", mutton, "meat"), G("m-chicken", wholeChicken, "meat", "chicken"), G("m-breast", chickenBreast, "meat", "chicken"),
    G("m-legs", chickenLegs, "meat", "chicken"), G("m-keema", keema, "meat"), G("m-eggs", eggs, "meat", "chicken", "eggs"),
    G("m-fish", fish, "meat", "fish"), G("m-paye", paye, "meat"),
    G("k-cake", cake, "bakery", "cake"), G("k-mithai", fMithai, "bakery", "cake", "sweet"),
  ],
  wholesale: [
    G("w-cloth", bClothing, "cloth", "fashion"), G("w-fashion", slideFashion, "cloth", "fashion"),
    G("w-shoes", bShoes, "shoe", "fashion"), G("w-elec", bElectronics, "electronic"), G("w-elec2", slideElectronics, "electronic", "mobile"),
    G("w-mobile", bMobiles, "mobile", "electronic"), G("w-beauty", bBeauty, "beauty", "cosmetic"),
    G("w-hardware", bHardware, "hardware", "tool"), G("w-home", slideHome, "home", "kitchen", "crockery"),
    G("w-general", bGeneral, "general"), G("w-ration", slideRation, "general", "grocery"),
  ],
  restaurant: [
    G("r-biryani", fBiryani, "biryani", "desi"), G("r-karahi", fKarahi, "karahi", "desi"), G("r-bbq", fBbq, "bbq", "desi"),
    G("r-nihari", fNihari, "nihari", "desi"), G("r-breakfast", fBreakfast, "breakfast", "desi"),
    G("r-fast", fFast, "fast", "burger", "pizza"), G("r-mithai", fMithai, "sweet", "bakery"), G("r-hero", fHero, "desi"),
  ],
};

// Words in a shop category mapped to tags (English + Urdu).
const KEYWORDS: [RegExp, string][] = [
  [/meat|chicken|mutton|beef|گوشت|چکن|مرغی|qasai|قصائی|egg|انڈ/i, "meat"],
  [/fish|مچھلی/i, "fish"], [/dairy|milk|دودھ|دہی|ڈیری/i, "dairy"],
  [/bakery|cake|sweet|mithai|بیکری|کیک|مٹھائی/i, "bakery"],
  [/fruit|vegetable|sabzi|پھل|سبزی/i, "fruit"], [/atta|rice|آٹا|چاول/i, "atta"],
  [/cloth|fashion|garment|suit|کپڑ/i, "cloth"], [/shoe|footwear|جوت/i, "shoe"],
  [/mobile|phone|موبائل/i, "mobile"], [/electr|الیکٹر/i, "electronic"], [/beauty|cosmetic/i, "beauty"],
  [/hardware|tool/i, "hardware"], [/home|kitchen|crockery|برتن/i, "home"],
  [/biryani|بریانی/i, "biryani"], [/karahi|کڑاہی/i, "karahi"], [/bbq|tikka|تکہ/i, "bbq"],
  [/nihari|paye|نہاری|پائے/i, "nihari"], [/breakfast|nashta|ناشتہ|puri/i, "breakfast"],
  [/burger|pizza|fast|zinger/i, "fast"],
];

/** Returns up to 12 options: those matching the category first, then the rest of the same vertical. */
export function bannerOptionsFor(vertical: BannerVertical, category?: string | null, limit = 12): BannerOption[] {
  const list = LIB[vertical];
  const tags = new Set(KEYWORDS.filter(([re]) => re.test(category || "")).map(([, t]) => t));
  const matched = tags.size ? list.filter(o => o.tags.some(t => tags.has(t))) : [];
  const rest = list.filter(o => !matched.includes(o));
  return [...matched, ...rest].slice(0, limit);
}
