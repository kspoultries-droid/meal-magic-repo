export function featuredMenuIds(items: { id: string; image_url?: string | null }[], selected: string[] = []) {
  const pictured = items.filter(item => item.image_url);
  return new Set((selected.length ? pictured.filter(item => selected.includes(item.id)) : pictured).slice(0, 4).map(item => item.id));
}