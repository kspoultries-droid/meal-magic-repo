export const downloadCsv = (
  filename: string,
  header: string[],
  rows: (string | number | null | undefined)[][]
) => {
  const esc = (v: string | number | null | undefined) => {
    const raw = v === null || v === undefined ? "" : String(v);
    const s = typeof v === "string" && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};
