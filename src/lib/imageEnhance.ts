/**
 * Client-side product photo enhancement.
 * Goal: make an ordinary shopkeeper's mobile photo look clean and premium
 * WITHOUT changing the product itself. Only exposure, white balance,
 * sharpness, crop and size are adjusted — exactly what a better camera would do.
 */

export type PhotoIssue = { code: "dark" | "bright" | "blurry" | "small"; message: string };

export type PhotoCheck = {
  width: number;
  height: number;
  brightness: number; // 0..255
  sharpness: number; // laplacian variance
  issues: PhotoIssue[];
};

export type PhotoAspect = "square" | "wide" | "original";

const MAX_SIDE = 1200;

export const loadImage = (file: File | Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("تصویر پڑھی نہیں جا سکی"));
    };
    img.src = url;
  });

const targetRatio = (aspect: PhotoAspect, w: number, h: number) =>
  aspect === "square" ? 1 : aspect === "wide" ? 16 / 9 : w / h;

const drawCropped = (img: HTMLImageElement, aspect: PhotoAspect) => {
  const ratio = targetRatio(aspect, img.width, img.height);
  let sw = img.width;
  let sh = Math.round(sw / ratio);
  if (sh > img.height) {
    sh = img.height;
    sw = Math.round(sh * ratio);
  }
  const sx = Math.round((img.width - sw) / 2);
  const sy = Math.round((img.height - sh) / 2);

  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
  return { canvas, ctx };
};

const luminanceStats = (data: Uint8ClampedArray) => {
  let sum = 0;
  const gray = new Float32Array(data.length / 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = l;
    sum += l;
  }
  return { gray, brightness: sum / gray.length };
};

const laplacianVariance = (gray: Float32Array, w: number, h: number) => {
  if (w < 3 || h < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const i = y * w + x;
      const v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      sum += v;
      sumSq += v * v;
      count++;
    }
  }
  if (!count) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
};

/** Percentile based auto-levels per channel (histogram stretch). */
const autoLevels = (data: Uint8ClampedArray) => {
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  for (let i = 0; i < data.length; i += 4) {
    hist[0][data[i]]++;
    hist[1][data[i + 1]]++;
    hist[2][data[i + 2]]++;
  }
  const total = data.length / 4;
  const lowCut = total * 0.005;
  const highCut = total * 0.005;
  const bounds = hist.map((h) => {
    let acc = 0;
    let lo = 0;
    let hi = 255;
    for (let v = 0; v < 256; v++) {
      acc += h[v];
      if (acc > lowCut) {
        lo = v;
        break;
      }
    }
    acc = 0;
    for (let v = 255; v >= 0; v--) {
      acc += h[v];
      if (acc > highCut) {
        hi = v;
        break;
      }
    }
    // Low-contrast channels (flat backgrounds, single-colour products) must not be
    // stretched: doing so crushes the real product colour to black.
    if (hi - lo < 96) {
      lo = 0;
      hi = 255;
    }
    return { lo, hi };
  });

  // Gentle: blend the stretched value with the original so colours stay true.
  const strength = 0.5;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const { lo, hi } = bounds[c];
      const src = data[i + c];
      const stretched = ((src - lo) * 255) / (hi - lo);
      const v = src + (stretched - src) * strength;
      data[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
};

/** Gray-world white balance — removes the yellow tint of shop tube lights. */
const whiteBalance = (data: Uint8ClampedArray) => {
  let r = 0;
  let g = 0;
  let b = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  r /= n;
  g /= n;
  b /= n;
  const avg = (r + g + b) / 3;
  const gains = [avg / (r || 1), avg / (g || 1), avg / (b || 1)].map((x) => Math.min(1.25, Math.max(0.8, x)));
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = data[i + c] * gains[c];
      data[i + c] = v > 255 ? 255 : v;
    }
  }
};

/** Lift dark photos with a gamma curve. */
const gammaLift = (data: Uint8ClampedArray, brightness: number) => {
  if (brightness >= 105) return;
  const gamma = brightness < 70 ? 0.65 : 0.8;
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = Math.round(255 * Math.pow(v / 255, gamma));
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }
};

/** Light unsharp mask for crisper edges. */
const unsharp = (src: ImageData, amount = 0.45) => {
  const { width: w, height: h, data } = src;
  const out = new Uint8ClampedArray(data);
  const idx = (x: number, y: number) => (y * w + x) * 4;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idx(x, y);
      for (let c = 0; c < 3; c++) {
        const blur =
          (data[idx(x - 1, y) + c] +
            data[idx(x + 1, y) + c] +
            data[idx(x, y - 1) + c] +
            data[idx(x, y + 1) + c] +
            data[i + c] * 4) /
          8;
        const v = data[i + c] + (data[i + c] - blur) * amount * 2;
        out[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
  }
  data.set(out);
};

const toFile = (canvas: HTMLCanvasElement, name: string) =>
  new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("تصویر محفوظ نہیں ہو سکی"));
          return;
        }
        resolve(new File([blob], name, { type: blob.type }));
      },
      "image/webp",
      0.9,
    );
  });

export const checkPhoto = async (file: File, aspect: PhotoAspect = "square"): Promise<PhotoCheck> => {
  const img = await loadImage(file);
  const { canvas, ctx } = drawCropped(img, aspect);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { gray, brightness } = luminanceStats(image.data);
  const sharpness = laplacianVariance(gray, canvas.width, canvas.height);

  const issues: PhotoIssue[] = [];
  if (Math.min(img.width, img.height) < 600)
    issues.push({ code: "small", message: "تصویر بہت چھوٹی ہے — قریب سے دوبارہ لیں" });
  if (brightness < 55) issues.push({ code: "dark", message: "تصویر بہت اندھیری ہے — روشنی میں دوبارہ لیں" });
  if (brightness > 215) issues.push({ code: "bright", message: "تصویر بہت زیادہ چمکدار ہے — فلیش بند کریں" });
  if (sharpness < 55) issues.push({ code: "blurry", message: "تصویر دھندلی ہے — موبائل مستحکم رکھ کر دوبارہ لیں" });

  return { width: img.width, height: img.height, brightness, sharpness, issues };
};

export const enhancePhoto = async (
  file: File,
  aspect: PhotoAspect = "square",
): Promise<{ file: File; url: string; check: PhotoCheck }> => {
  const img = await loadImage(file);
  const { canvas, ctx } = drawCropped(img, aspect);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const before = luminanceStats(image.data);
  const sharpness = laplacianVariance(before.gray, canvas.width, canvas.height);

  whiteBalance(image.data);
  autoLevels(image.data);
  gammaLift(image.data, before.brightness);
  unsharp(image);
  ctx.putImageData(image, 0, 0);

  const baseName = file.name.replace(/\.[^.]+$/, "") || "product";
  const enhanced = await toFile(canvas, `${baseName}-premium.webp`);

  const issues: PhotoIssue[] = [];
  if (Math.min(img.width, img.height) < 600)
    issues.push({ code: "small", message: "تصویر بہت چھوٹی ہے — قریب سے دوبارہ لیں" });
  if (before.brightness < 55) issues.push({ code: "dark", message: "اصل تصویر بہت اندھیری تھی — روشنی میں دوبارہ لینا بہتر ہے" });
  if (before.brightness > 215) issues.push({ code: "bright", message: "تصویر بہت زیادہ چمکدار ہے — فلیش بند کریں" });
  if (sharpness < 55) issues.push({ code: "blurry", message: "تصویر دھندلی ہے — موبائل مستحکم رکھ کر دوبارہ لیں" });

  return {
    file: enhanced,
    url: URL.createObjectURL(enhanced),
    check: { width: img.width, height: img.height, brightness: before.brightness, sharpness, issues },
  };
};

export const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("فائل پڑھی نہیں جا سکی"));
    reader.readAsDataURL(file);
  });

export const dataUrlToFile = async (dataUrl: string, name: string) => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || "image/png" });
};
