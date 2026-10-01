DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY['public.notify_order_events()','public.notify_offer_events()'] LOOP
    EXECUTE replace(pg_get_functiondef(f::regprocedure), '''/rider''', '''/rider-dashboard''');
  END LOOP;
END $$;