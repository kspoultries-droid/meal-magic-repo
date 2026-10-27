CREATE OR REPLACE FUNCTION public.get_delivery_route_context(_kind text, _order_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE o record;
BEGIN
 IF auth.uid() IS NULL THEN RETURN NULL; END IF;
 IF _kind='food' THEN
 SELECT ord.id,ord.customer_id,ord.rider_id,ord.status,ord.delivery_stage,ord.delivery_lat,ord.delivery_lng,r.owner_id,r.pickup_lat,r.pickup_lng,r.name INTO o FROM public.orders ord JOIN public.restaurants r ON r.id=ord.restaurant_id WHERE ord.id=_order_id;
 ELSIF _kind='grocery_cart' THEN
 SELECT ord.id,ord.customer_id,ord.rider_id,ord.status,ord.delivery_stage,ord.delivery_lat,ord.delivery_lng,s.owner_id,NULL::double precision pickup_lat,NULL::double precision pickup_lng,s.name INTO o FROM public.grocery_cart_orders ord JOIN public.grocery_stores s ON s.id=ord.store_id WHERE ord.id=_order_id;
 ELSIF _kind='grocery_list' THEN
 SELECT ord.id,ord.customer_id,ord.rider_id,ord.status,ord.delivery_stage,ord.delivery_lat,ord.delivery_lng,s.owner_id,NULL::double precision pickup_lat,NULL::double precision pickup_lng,s.name INTO o FROM public.grocery_list_orders ord JOIN public.grocery_stores s ON s.id=ord.store_id WHERE ord.id=_order_id;
 ELSE RETURN NULL; END IF;
 IF o.id IS NULL OR o.status IN ('delivered','completed','cancelled','returned_to_store') OR NOT COALESCE((o.customer_id=auth.uid() OR o.rider_id=auth.uid() OR o.owner_id=auth.uid() OR public.has_permission(auth.uid(),'dispatch') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support')),false) THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('stage',COALESCE(o.delivery_stage,'assigned'),'pickup_name',o.name,'pickup_lat',o.pickup_lat,'pickup_lng',o.pickup_lng,'delivery_lat',o.delivery_lat,'delivery_lng',o.delivery_lng,'rider_id',o.rider_id);
END $$;
REVOKE ALL ON FUNCTION public.get_delivery_route_context(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_delivery_route_context(text,uuid) TO authenticated,service_role;