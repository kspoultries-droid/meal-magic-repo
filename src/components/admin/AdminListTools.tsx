import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

export function AdminListTools({ query, onQuery, count }: { query: string; onQuery: (value: string) => void; count: number }) {
  return <div className="mb-3 flex flex-wrap items-center gap-2"><div className="relative w-full sm:max-w-xs"><Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="فہرست میں تلاش" placeholder="نام، فون یا آئی ڈی تلاش کریں" className="ps-8" value={query} onChange={e => onQuery(e.target.value)} /></div><span className="text-xs text-muted-foreground">{count} نتائج</span></div>;
}

export function AdminPagination({ page, count, onPage, size = 20 }: { page: number; count: number; onPage: (page: number) => void; size?: number }) {
  const pages = Math.max(1, Math.ceil(count / size));
  if (pages === 1) return null;
  return <div className="mt-3 flex items-center justify-end gap-2 border-t pt-2"><Button size="icon" variant="outline" aria-label="پچھلا صفحہ" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronRight className="size-4" /></Button><span className="text-xs">{page} / {pages}</span><Button size="icon" variant="outline" aria-label="اگلا صفحہ" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronLeft className="size-4" /></Button></div>;
}