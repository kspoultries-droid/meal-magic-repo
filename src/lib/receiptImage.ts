/** Renders a receipt as a monochrome-friendly PNG so Bluetooth thermal printer apps (RawBT) print Urdu correctly. */
import type { ReceiptKind } from "./receiptPrint";

export type ReceiptLine = { text: string; right?: string; size?: number; bold?: boolean; center?: boolean; rule?: boolean };

export const receiptLines = (order: any, kind: ReceiptKind, opts: { restaurantName?: string; ntn?: string | null; taxPercent?: number } = {}): ReceiptLine[] => {
  const L: ReceiptLine[] = [];
  L.push({ text: kind === "kitchen" ? "کچن سلپ" : opts.restaurantName || "Easy Life", size: 30, bold: true, center: true });
  if (kind === "bill" && opts.ntn) L.push({ text: `NTN: ${opts.ntn}`, center: true });
  L.push({ text: `#${String(order.id).slice(0, 6).toUpperCase()}`, size: 34, bold: true, center: true });
  L.push({ text: new Date(order.created_at || Date.now()).toLocaleString("en-PK"), center: true });
  L.push({ text: "", rule: true });
  for (const i of order.order_items || []) {
    L.push({ text: `${i.quantity}× ${i.name}${i.variant_label ? " — " + i.variant_label : ""}`, right: kind === "bill" ? String(Math.round(i.price * i.quantity)) : undefined, bold: true });
    if (Array.isArray(i.options) && i.options.length) L.push({ text: "  " + i.options.map((o: any) => o.choice).join(" • "), size: 20 });
  }
  L.push({ text: "", rule: true });
  if (order.special_instructions) { L.push({ text: `ہدایات: ${order.special_instructions}` }); L.push({ text: "", rule: true }); }
  if (kind === "bill") {
    const total = Number(order.total_amount || 0);
    const tax = opts.taxPercent ? Math.round((total * opts.taxPercent) / (100 + opts.taxPercent)) : 0;
    L.push({ text: "ڈلیوری", right: String(Math.round(Number(order.delivery_fee || 0))) });
    if (tax) L.push({ text: `ٹیکس (${opts.taxPercent}% شامل)`, right: String(tax) });
    L.push({ text: "کل", right: `Rs ${Math.round(total)}`, size: 32, bold: true });
    L.push({ text: order.payment_method === "cod" ? "نقد ادائیگی" : order.payment_method || "", center: true });
    L.push({ text: "", rule: true });
    L.push({ text: "شکریہ — Easy Life", center: true });
  }
  return L;
};

const wrap = (ctx: CanvasRenderingContext2D, text: string, max: number) => {
  const words = text.split(" "); const out: string[] = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t; }
  out.push(cur); return out;
};

/** width in dots: 384 for 58mm, 576 for 80mm printers. */
export const receiptPng = (lines: ReceiptLine[], width = 384): string => {
  const pad = 8, font = (l: ReceiptLine) => `${l.bold ? "bold " : ""}${l.size ?? 24}px "Noto Nastaliq Urdu", Arial, sans-serif`;
  const c = document.createElement("canvas"); const ctx = c.getContext("2d")!;
  const rows: { l: ReceiptLine; parts: string[]; h: number }[] = lines.map((l) => {
    ctx.font = font(l); const h = Math.round((l.size ?? 24) * 1.6);
    if (l.rule) return { l, parts: [""], h: 16 };
    const rightW = l.right ? ctx.measureText(l.right).width + 12 : 0;
    return { l, parts: wrap(ctx, l.text, width - pad * 2 - rightW), h };
  });
  c.width = width; c.height = rows.reduce((s, r) => s + r.h * r.parts.length, 0) + pad * 2 + 40;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.fillStyle = "#000"; ctx.textBaseline = "middle";
  let y = pad;
  for (const { l, parts, h } of rows) {
    if (l.rule) { ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(pad, y + 8); ctx.lineTo(width - pad, y + 8); ctx.stroke(); y += h; continue; }
    ctx.font = font(l); const dir = /[\u0600-\u06FF]/.test(l.text) ? "rtl" : "ltr"; ctx.direction = dir;
    parts.forEach((p, idx) => {
      if (l.center) { ctx.textAlign = "center"; ctx.fillText(p, width / 2, y + h / 2); }
      else { ctx.textAlign = "right"; ctx.fillText(p, width - pad, y + h / 2); }
      if (idx === 0 && l.right) { ctx.direction = "ltr"; ctx.textAlign = "left"; ctx.fillText(l.right, pad, y + h / 2); ctx.direction = dir; }
      y += h;
    });
  }
  return c.toDataURL("image/png");
};

export const RAWBT_PLAY_URL = "https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter";
export const rawbtUrl = (pngDataUrl: string) => `rawbt:${pngDataUrl}`;
