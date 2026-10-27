CREATE OR REPLACE FUNCTION public.get_delivery_route_context(_kind text, _order_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE o record; result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RETURN NULL; END IF;
 IF _kind='food' THEN
 SELECT ord.id,ord.customer_id,ord.rider_id,ord.status,ord.delivery_stage,ord.delivery_lat,ord.delivery_lng,r.owner_id,r.pickup_lat,r.pickup_lng,r.name INTO o FROM public.orders ord JOIN public.restaurants r ON r.id=ord.restaurant_id WHERE ord.id=_order_id;
 ELSIF _kind='grocery_cart' THEN
 SELECT ord.id,ord.customer_id,ord.rider_id,ord.status,ord.delivery_stage,ord.delivery_lat,ord.delivery_lng,s.owner_id,NULL::double precision pickup_lat,NULL::double precision pickup_lng,s.name INTO o FROM public.grocery_cart_orders ord JOIN public.grocery_stores s ON s.id=ord.store_id WHERE ord.id=_order_id;
 ELSIF _kind='grocery_list' THEN
 SELECT ord.id,ord.customer_id,ord.rider_id,ord.status,ord.delivery_stage,ord.delivery_lat,ord.delivery_lng,s.owner_id,NULL::double precision pickup_lat,NULL::double precision pickup_lng,s.name INTO o FROM public.grocery_list_orders ord JOIN public.grocery_stores s ON s.id=ord.store_id WHERE ord.id=_order_id;
 ELSE RETURN NULL; END IF;
 IF o.id IS NULL OR o.status IN ('delivered','completed','cancelled','returned_to_store') OR NOT (o.customer_id=auth.uid() OR o.rider_id=auth.uid() OR o.owner_id=auth.uid() OR public.has_permission(auth.uid(),'dispatch') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support')) THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('stage',COALESCE(o.delivery_stage,'assigned'),'pickup_name',o.name,'pickup_lat',o.pickup_lat,'pickup_lng',o.pickup_lng,'delivery_lat',o.delivery_lat,'delivery_lng',o.delivery_lng,'rider_id',o.rider_id);
END $$;
REVOKE ALL ON FUNCTION public.get_delivery_route_context(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_delivery_route_context(text,uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.get_delivery_rider_location(_kind text, _order_id uuid)
RETURNS TABLE(rider_name text,rider_phone text,lat double precision,lng double precision,location_updated_at timestamptz,accuracy_m double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH target AS (
 SELECT o.rider_id,o.customer_id,o.status,r.owner_id FROM public.orders o JOIN public.restaurants r ON r.id=o.restaurant_id WHERE _kind='food' AND o.id=_order_id
 UNION ALL SELECT o.rider_id,o.customer_id,o.status,s.owner_id FROM public.grocery_cart_orders o JOIN public.grocery_stores s ON s.id=o.store_id WHERE _kind='grocery_cart' AND o.id=_order_id
 UNION ALL SELECT o.rider_id,o.customer_id,o.status,s.owner_id FROM public.grocery_list_orders o JOIN public.grocery_stores s ON s.id=o.store_id WHERE _kind='grocery_list' AND o.id=_order_id
 )
 SELECT p.full_name,p.phone,r.current_lat,r.current_lng,r.location_updated_at,r.location_accuracy_m
 FROM target o JOIN public.riders r ON r.id=o.rider_id LEFT JOIN public.profiles p ON p.id=r.id
 WHERE auth.uid() IS NOT NULL AND o.status NOT IN ('delivered','completed','cancelled','returned_to_store')
 AND (o.customer_id=auth.uid() OR o.rider_id=auth.uid() OR o.owner_id=auth.uid() OR public.has_permission(auth.uid(),'dispatch') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'support'));
$$;
REVOKE ALL ON FUNCTION public.get_delivery_rider_location(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_delivery_rider_location(text,uuid) TO authenticated,service_role;