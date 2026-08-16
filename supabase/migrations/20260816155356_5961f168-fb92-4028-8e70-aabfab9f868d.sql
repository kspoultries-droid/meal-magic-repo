ALTER TABLE public.wholesale_categories ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'item';
ALTER TABLE public.grocery_stores ADD COLUMN IF NOT EXISTS shop_category text;

INSERT INTO public.wholesale_categories (name, name_ur, icon, sort_order, is_active, kind) VALUES
  ('Kirana', 'کریانہ', 'ShoppingBasket', 10, true, 'shop'),
  ('Stationery', 'اسٹیشنری', 'PencilRuler', 20, true, 'shop'),
  ('Departmental Store', 'ڈیپارٹمنٹل اسٹور', 'Store', 30, true, 'shop'),
  ('Hardware', 'ہارڈویئر', 'Wrench', 40, true, 'shop'),
  ('Cosmetics', 'کاسمیٹکس', 'Sparkles', 50, true, 'shop'),
  ('Cloth Market', 'کپڑا مارکیٹ', 'Shirt', 60, true, 'shop'),
  ('Crockery', 'برتن/کراکری', 'Utensils', 70, true, 'shop'),
  ('Mobile Market', 'موبائل مارکیٹ', 'Smartphone', 80, true, 'shop');