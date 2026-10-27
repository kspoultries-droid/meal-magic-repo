// Cross-script fuzzy search: lets "Shaheen cloth" match "شاہین کلاتھ".
// Both scripts are reduced to a consonant "sound skeleton"; vowels, h and
// long-vowel letters are dropped so spelling variations still match.

const URDU: Record<string, string> = {
  "ب": "b", "پ": "p", "ت": "t", "ٹ": "t", "ط": "t", "ث": "s", "س": "s", "ص": "s",
  "ج": "j", "چ": "C", "خ": "k", "ک": "k", "ك": "k", "ق": "k", "گ": "g", "غ": "g",
  "د": "d", "ڈ": "d", "ذ": "z", "ز": "z", "ض": "z", "ظ": "z", "ژ": "z",
  "ر": "r", "ڑ": "r", "ش": "S", "ف": "f", "ل": "l", "م": "m", "ن": "n", "ں": "n",
};

const latinSkeleton = (w: string) => {
  let s = w.toLowerCase()
    .replace(/sh/g, "S").replace(/ch/g, "C").replace(/kh/g, "k").replace(/gh/g, "g")
    .replace(/ph/g, "f").replace(/ck/g, "k").replace(/q/g, "k").replace(/x/g, "ks")
    .replace(/c(?=[eiy])/g, "s").replace(/c/g, "k");
  s = s.replace(/[aeiouywvh0-9\W_]/g, "");
  return s.replace(/(.)\1+/g, "$1");
};

const urduSkeleton = (w: string) => {
  let out = "";
  for (const ch of w) out += URDU[ch] ?? "";
  return out.replace(/(.)\1+/g, "$1");
};

export const skeleton = (text: string) =>
  (text || "").split(/\s+/).map((w) => (/[\u0600-\u06FF]/.test(w) ? urduSkeleton(w) : latinSkeleton(w))).join("");

export const normalize = (t: string) => (t || "").toLowerCase().replace(/\s+/g, " ").trim();

/** True when any of the texts matches the query (plain or cross-script sound match). */
export const matchesSearch = (query: string, ...texts: (string | null | undefined)[]) => {
  const q = normalize(query);
  if (!q) return true;
  const hay = texts.filter(Boolean).join(" ");
  if (normalize(hay).includes(q)) return true;
  const words = q.split(" ").map(skeleton).filter((w) => w.length >= 2);
  if (!words.length) return false;
  const hs = skeleton(hay);
  return words.every((w) => hs.includes(w));
};
