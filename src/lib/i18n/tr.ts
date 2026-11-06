// Bilingual helper usable outside hooks (toasts, constants). Urdu for "ur", English otherwise.
// LanguageProvider keeps currentLang in sync; components re-render via useLanguage.
let currentLang = "ur";
try {
  currentLang = localStorage.getItem("app:lang") || "ur";
} catch {
  /* ignore */
}
export const setTrLang = (lang: string) => {
  currentLang = lang;
};
export const tr = (en: string, ur: string) => (currentLang === "ur" ? ur : en);
