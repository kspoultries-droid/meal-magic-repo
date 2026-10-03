/** Prints a 58/80mm thermal-style receipt (kitchen slip or customer bill) via the browser print dialog.
 *  Works with any printer the phone/PC can see, including Bluetooth/USB thermal printers. */
const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export type ReceiptKind = "kitchen" | "bill";

export const printOrderReceipt = (
  order: any,
  kind: ReceiptKind,
  opts: { restaurantName?: string; ntn?: string | null; taxPercent?: number; width?: 58 | 80 } = {},
) => {
  const width = opts.width ?? 80;
  const items = (order.order_items || []) as any[];
  const rows = items
    .map((i) => {
      const optsTxt = Array.isArray(i.options) && i.options.length ? `<div class="o">${i.options.map((o: any) => esc(o.choice)).join(" • ")}</div>` : "";
      const price = kind === "bill" ? `<span>${Math.round(i.price * i.quantity)}</span>` : "";
      return `<div class="r"><span><b>${i.quantity}×</b> ${esc(i.name)}${i.variant_label ? " — " + esc(i.variant_label) : ""}</span>${price}</div>${optsTxt}`;
    })
    .join("");
  const total = Number(order.total_amount || 0);
  const tax = opts.taxPercent ? Math.round((total * opts.taxPercent) / (100 + opts.taxPercent)) : 0;
  const created = new Date(order.created_at || Date.now()).toLocaleString("en-PK");
  const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>Order</title><style>
@page{size:${width}mm auto;margin:2mm}
body{font-family:Arial,sans-serif;width:${width - 4}mm;margin:0;font-size:${width === 58 ? 11 : 13}px;color:#000}
h1{font-size:1.3em;text-align:center;margin:0 0 2px}.c{text-align:center}.r{display:flex;justify-content:space-between;gap:6px;margin:3px 0}
.o{font-size:.85em;padding-right:10px}hr{border:0;border-top:1px dashed #000;margin:5px 0}.big{font-size:1.4em;font-weight:bold}
</style></head><body>
<h1>${kind === "kitchen" ? "کچن سلپ" : esc(opts.restaurantName || "Easy Life")}</h1>
${kind === "bill" && opts.ntn ? `<div class="c">NTN: ${esc(opts.ntn)}</div>` : ""}
<div class="c big">#${esc(String(order.id).slice(0, 6).toUpperCase())}</div>
<div class="c">${esc(created)}</div><hr>${rows}<hr>
${order.special_instructions ? `<div><b>ہدایات:</b> ${esc(order.special_instructions)}</div><hr>` : ""}
${kind === "bill" ? `<div class="r"><span>ڈلیوری</span><span>${Math.round(Number(order.delivery_fee || 0))}</span></div>
${tax ? `<div class="r"><span>ٹیکس (${opts.taxPercent}% شامل)</span><span>${tax}</span></div>` : ""}
<div class="r big"><span>کل</span><span>Rs ${Math.round(total)}</span></div>
<div class="c">${esc(order.payment_method === "cod" ? "نقد ادائیگی" : order.payment_method || "")}</div><hr><div class="c">شکریہ — Easy Life</div>` : ""}
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`;
  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
};
