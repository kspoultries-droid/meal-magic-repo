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
import fBurgerBright from "@/assets/food/burger-bright.jpg";
import fPizzaBright from "@/assets/food/pizza-bright.jpg";
import fShawarmaBright from "@/assets/food/shawarma-bright.jpg";
import fChineseBright from "@/assets/food/chinese-bright.jpg";
import fCakeBright from "@/assets/food/cake-bright.jpg";
import fSweetsBright from "@/assets/food/sweets-bright.jpg";
import fShakesBright from "@/assets/food/shakes-bright.jpg";
import fSaladBright from "@/assets/food/salad-bright.jpg";
import fFishBright from "@/assets/food/fish-bright.jpg";
import fBiryaniBright from "@/assets/food/biryani-bright.jpg";
import fBbqBright from "@/assets/food/bbq-bright.jpg";
import fKarahiBright from "@/assets/food/karahi-bright.jpg";
import fBreakfastBright from "@/assets/food/breakfast-bright.jpg";
import fBakeryBright from "@/assets/food/bakery-bright.jpg";
import fIcecreamBright from "@/assets/food/icecream-bright.jpg";
import fChaiBright from "@/assets/food/chai-bright.jpg";
import fFriesBright from "@/assets/food/fries-bright.jpg";
import fNihariBright from "@/assets/food/nihari-bright.jpg";
import fPayeBright from "@/assets/food/paye-bright.jpg";
import fHandiBright from "@/assets/food/handi-bright.jpg";
import fNaanBright from "@/assets/food/naan-bright.jpg";
import fSandwichBright from "@/assets/food/sandwich-bright.jpg";
import fMomosBright from "@/assets/food/momos-bright.jpg";
import fWingsBright from "@/assets/food/wings-bright.jpg";
import fFruitChaatBright from "@/assets/food/fruit-chaat-bright.jpg";
import fHaleemBright from "@/assets/food/haleem-bright.jpg";
import fQormaBright from "@/assets/food/qorma-bright.jpg";
import fCoffeeBright from "@/assets/food/coffee-bright.jpg";
import fBroastBright from "@/assets/food/broast-bright.jpg";
import fJuiceBright from "@/assets/food/juice-bright.jpg";
import fPastaBright from "@/assets/food/pasta-bright.jpg";
import fRollsBright from "@/assets/food/rolls-bright.jpg";
import fPastriesBright from "@/assets/food/pastries-bright.jpg";

export type BannerVertical = "grocery" | "wholesale" | "restaurant";
export interface BannerOption { id: string; src: string; tags: string[]; group?: string }
export interface BannerGroup { id: string; label: string; labelUr: string }

const G = (id: string, src: string, ...tags: string[]): BannerOption => ({ id, src, tags });
const R = (id: string, src: string, group: string, ...tags: string[]): BannerOption => ({ id, src, group, tags });

const RESTAURANT_GROUPS: BannerGroup[] = [
  { id: "desi", label: "Desi", labelUr: "دیسی" },
  { id: "fast", label: "Fast Food", labelUr: "فاسٹ فوڈ" },
  { id: "pizza", label: "Pizza", labelUr: "پیزا" },
  { id: "chinese", label: "Chinese", labelUr: "چائنیز" },
  { id: "shawarma", label: "Shawarma & Rolls", labelUr: "شوارما اور رولز" },
  { id: "bakery", label: "Bakery & Sweets", labelUr: "بیکری اور مٹھائی" },
  { id: "drinks", label: "Drinks & Cafe", labelUr: "مشروبات اور کیفی" },
  { id: "healthy", label: "Healthy", labelUr: "ہیلتھی" },
  { id: "fish", label: "Fish & Seafood", labelUr: "مچھلی اور سمندری غذا" },
];

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
    // Desi
    R("r-biryani", fBiryani, "desi", "biryani", "desi"),
    R("r-biryani-bright", fBiryaniBright, "desi", "biryani", "desi"),
    R("r-karahi", fKarahi, "desi", "karahi", "desi"),
    R("r-karahi-bright", fKarahiBright, "desi", "karahi", "desi"),
    R("r-bbq", fBbq, "desi", "bbq", "tikka", "desi"),
    R("r-bbq-bright", fBbqBright, "desi", "bbq", "tikka", "desi"),
    R("r-nihari", fNihari, "desi", "nihari", "paye", "desi"),
    R("r-nihari-bright", fNihariBright, "desi", "nihari", "desi"),
    R("r-paye-bright", fPayeBright, "desi", "paye", "nihari", "desi"),
    R("r-handi-bright", fHandiBright, "desi", "handi", "karahi", "desi"),
    R("r-haleem-bright", fHaleemBright, "desi", "haleem", "desi"),
    R("r-qorma-bright", fQormaBright, "desi", "qorma", "desi"),
    R("r-naan-bright", fNaanBright, "desi", "naan", "desi"),
    R("r-breakfast", fBreakfast, "desi", "breakfast", "nashta", "desi"),
    R("r-breakfast-bright", fBreakfastBright, "desi", "breakfast", "nashta", "desi"),
    R("r-hero", fHero, "desi", "desi"),
    // Fast Food
    R("r-fast", fFast, "fast", "fast", "burger"),
    R("r-burger-bright", fBurgerBright, "fast", "burger", "fast"),
    R("r-fries-bright", fFriesBright, "fast", "fries", "fast"),
    R("r-broast-bright", fBroastBright, "fast", "broast", "fast", "chicken"),
    R("r-wings-bright", fWingsBright, "fast", "wings", "fast", "chicken"),
    R("r-sandwich-bright", fSandwichBright, "fast", "sandwich", "fast"),
    R("r-pasta-bright", fPastaBright, "fast", "pasta", "fast"),
    // Pizza
    R("r-pizza-bright", fPizzaBright, "pizza", "pizza"),
    // Chinese
    R("r-chinese-bright", fChineseBright, "chinese", "chinese", "chow mein"),
    R("r-momos-bright", fMomosBright, "chinese", "momos", "chinese"),
    // Shawarma & Rolls
    R("r-shawarma-bright", fShawarmaBright, "shawarma", "shawarma", "roll"),
    R("r-rolls-bright", fRollsBright, "shawarma", "roll", "shawarma"),
    // Bakery & Sweets
    R("r-mithai", fMithai, "bakery", "sweet", "mithai", "bakery"),
    R("r-sweets-bright", fSweetsBright, "bakery", "sweet", "mithai", "bakery"),
    R("r-cake-bright", fCakeBright, "bakery", "cake", "bakery", "sweet"),
    R("r-bakery-bright", fBakeryBright, "bakery", "bakery", "bread"),
    R("r-pastries-bright", fPastriesBright, "bakery", "pastry", "bakery", "cake"),
    R("r-icecream-bright", fIcecreamBright, "bakery", "ice cream", "dessert"),
    // Drinks & Cafe
    R("r-chai-bright", fChaiBright, "drinks", "chai", "tea", "drinks"),
    R("r-coffee-bright", fCoffeeBright, "drinks", "coffee", "drinks"),
    R("r-shakes-bright", fShakesBright, "drinks", "shake", "smoothie", "drinks"),
    R("r-juice-bright", fJuiceBright, "drinks", "juice", "drinks"),
    // Healthy
    R("r-salad-bright", fSaladBright, "healthy", "salad", "healthy"),
    R("r-fruit-chaat-bright", fFruitChaatBright, "healthy", "fruit", "chaat", "healthy"),
    // Fish & Seafood
    R("r-fish-bright", fFishBright, "fish", "fish", "seafood"),
  ],
};

// Words in a shop category mapped to tags (English + Urdu).
const KEYWORDS: [RegExp, string][] = [
  [/meat|chicken|mutton|beef|گوشت|چکن|مرغی|qasai|قصائی|egg|انڈ/i, "meat"],
  [/fish|مچھلی/i, "fish"], [/dairy|milk|دودھ|دہی|ڈیری/i, "dairy"],
  [/bakery|mithai|بیکری|مٹھائی/i, "bakery"],
  [/cake|کیک/i, "cake"],
  [/sweet|میٹھا/i, "sweet"],
  [/pastry|پسٹری/i, "pastry"],
  [/ice cream|آئس کریم/i, "icecream"],
  [/fruit|vegetable|sabzi|پھل|سبزی/i, "fruit"], [/atta|rice|آٹا|چاول/i, "atta"],
  [/cloth|fashion|garment|suit|کپڑ/i, "cloth"], [/shoe|footwear|جوت/i, "shoe"],
  [/mobile|phone|موبائل/i, "mobile"], [/electr|الیکٹر/i, "electronic"], [/beauty|cosmetic/i, "beauty"],
  [/hardware|tool/i, "hardware"], [/home|kitchen|crockery|برتن/i, "home"],
  [/biryani|بریانی/i, "biryani"], [/karahi|کڑاہی/i, "karahi"], [/bbq|tikka|تکہ/i, "bbq"],
  [/nihari|paye|نہاری|پائے/i, "nihari"], [/breakfast|nashta|ناشتہ|puri/i, "breakfast"],
  [/burger|fast|zinger/i, "fast"],
  [/pizza|پیزا/i, "pizza"],
  [/shawarma|شوارما/i, "shawarma"],
  [/roll|رول/i, "roll"],
  [/chinese|چائنیز/i, "chinese"],
  [/momos|مومو/i, "momos"],
  [/haleem|حلیم/i, "haleem"],
  [/qorma|قورمہ/i, "qorma"],
  [/handi|ہانڈی/i, "handi"],
  [/naan|نان/i, "naan"],
  [/sandwich|سینڈوچ/i, "sandwich"],
  [/pasta|پاستا/i, "pasta"],
  [/wings|ونگز/i, "wings"],
  [/fries|فرائز/i, "fries"],
  [/broast|بروسٹ/i, "broast"],
  [/coffee|کافی/i, "coffee"],
  [/juice|جوس/i, "juice"],
  [/salad|سلاد/i, "salad"],
  [/shake|smoothie|شیک/i, "shake"],
  [/chai|tea|چائے/i, "chai"],
];

/** Returns up to `limit` options: those matching the category first, then the rest of the same vertical. */
export function bannerOptionsFor(vertical: BannerVertical, category?: string | null, limit?: number): BannerOption[] {
  const list = LIB[vertical];
  const maxLimit = limit ?? (vertical === "restaurant" ? 40 : 12);
  const tags = new Set(KEYWORDS.filter(([re]) => re.test(category || "")).map(([, t]) => t));
  const matched = tags.size ? list.filter(o => o.tags.some(t => tags.has(t))) : [];
  const rest = list.filter(o => !matched.includes(o));
  return [...matched, ...rest].slice(0, maxLimit);
}

/** Returns the category groups available for a vertical (empty for grocery/wholesale). */
export function bannerGroupsFor(vertical: BannerVertical): BannerGroup[] {
  if (vertical === "restaurant") return RESTAURANT_GROUPS;
  return [];
}
