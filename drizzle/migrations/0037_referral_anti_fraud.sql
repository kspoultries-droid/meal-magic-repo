CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referee_id uuid NOT NULL UNIQUE,
  order_id uuid NOT NULL,
  phone_norm text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_rewards TO authenticated;
GRANT ALL ON public.referral_rewards TO service_role;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referrer or admin can view rewards" ON public.referral_rewards
FOR SELECT TO authenticated USING (referrer_id = auth.uid() OR referee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.reward_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare referrer uuid; prior int; ph text; ref_ph text; monthly int; food numeric;
begin
  if new.status = 'delivered' and (old.status is distinct from 'delivered') then
    select p.referred_by into referrer from public.profiles p where p.id = new.customer_id;
    if referrer is null or referrer = new.customer_id then return new; end if;
    -- real delivery by a rider, meaningful food value
    food := coalesce(new.total_amount,0) - coalesce(new.delivery_fee,0) - coalesce(new.discount_amount,0);
    if new.rider_id is null or food < 500 then return new; end if;
    select count(*) into prior from public.orders
      where customer_id = new.customer_id and status = 'delivered' and id <> new.id;
    if prior > 0 then return new; end if;
    -- one phone = one reward, and not the referrer's own phone
    ph := right(regexp_replace(coalesce(new.receiver_phone,''), '\D', '', 'g'), 10);
    if length(ph) < 10 then return new; end if;
    select right(regexp_replace(coalesce(phone,''), '\D', '', 'g'), 10) into ref_ph from public.profiles where id = referrer;
    if ref_ph = ph then return new; end if;
    if exists (select 1 from public.referral_rewards where phone_norm = ph or referee_id = new.customer_id) then return new; end if;
    if exists (select 1 from public.orders o where o.customer_id = referrer
               and right(regexp_replace(coalesce(o.receiver_phone,''), '\D', '', 'g'), 10) = ph) then return new; end if;
    -- monthly cap per referrer
    select count(*) into monthly from public.referral_rewards
      where referrer_id = referrer and created_at > now() - interval '30 days';
    if monthly >= 10 then return new; end if;
    insert into public.referral_rewards (referrer_id, referee_id, order_id, phone_norm)
      values (referrer, new.customer_id, new.id, ph);
    perform public.credit_wallet(referrer, 100, 'ریفرل انعام — نیا گاہک / Referral reward', new.id);
    perform public.credit_wallet(new.customer_id, 50, 'ریفرل ویلکم انعام / Referral welcome bonus', new.id);
  end if;
  return new;
end $$;