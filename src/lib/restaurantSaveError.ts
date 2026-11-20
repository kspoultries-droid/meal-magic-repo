import { tr } from "@/lib/i18n/tr";

/** Turns a server refusal of a restaurant-owner setting save into a clear bilingual message. */
export function restaurantSaveErrorMessage(raw: string | null | undefined): string {
  const msg = String(raw || "");
  if (/has no field "category"/i.test(msg) || /guard_business_identity/i.test(msg)) {
    return tr(
      "Saving is blocked by a server rule being repaired. Your change was not saved; admin can change it meanwhile.",
      "سرور کا ایک اصول ٹھیک ہو رہا ہے، اس لیے تبدیلی محفوظ نہیں ہوئی۔ تب تک ایڈمن یہ تبدیلی کر سکتا ہے۔",
    );
  }
  if (/only admin can change the business name/i.test(msg)) {
    return tr("Only admin can change the restaurant name.", "ریسٹورنٹ کا نام صرف ایڈمن بدل سکتا ہے۔");
  }
  if (/only an admin can change a registered business location/i.test(msg)) {
    return tr("Only admin can change the restaurant location.", "ریسٹورنٹ کا مقام صرف ایڈمن بدل سکتا ہے۔");
  }
  return tr("Change was not saved: ", "تبدیلی محفوظ نہیں ہوئی: ") + msg;
}
