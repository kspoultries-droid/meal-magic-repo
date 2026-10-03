create or replace function public.credit_wallet(_user uuid, _amount numeric, _note text, _ref uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare w_id uuid; w_bal numeric;
begin
  insert into public.wallets (user_id, balance) values (_user, 0)
  on conflict (user_id) do nothing;
  update public.wallets set balance = balance + _amount, total_earned = total_earned + _amount, updated_at = now()
  where user_id = _user returning id, balance into w_id, w_bal;
  insert into public.wallet_transactions (wallet_id, user_id, type, amount, balance_after, description, reference_id, reference_type, status)
  values (w_id, _user, 'credit', _amount, w_bal, _note, _ref, 'referral', 'completed');
end $$;

create or replace function public.reward_referral()
returns trigger language plpgsql security definer set search_path = public as $$
declare ref_code text; referrer uuid; prior int;
begin
  if new.status = 'delivered' and (old.status is distinct from 'delivered') then
    select p.referred_by into ref_code from public.profiles p where p.id = new.customer_id;
    if ref_code is not null then
      select count(*) into prior from public.orders
      where customer_id = new.customer_id and status = 'delivered' and id <> new.id;
      if prior = 0 then
        select p.id into referrer from public.profiles p where p.referral_code = ref_code;
        if referrer is not null and referrer <> new.customer_id then
          perform public.credit_wallet(referrer, 100, 'ریفرل انعام — نیا گاہک / Referral reward', new.id);
          perform public.credit_wallet(new.customer_id, 50, 'ریفرل ویلکم انعام / Referral welcome bonus', new.id);
        end if;
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_reward_referral on public.orders;
create trigger trg_reward_referral after update on public.orders
for each row execute function public.reward_referral();

revoke execute on function public.credit_wallet(uuid, numeric, text, uuid) from anon, authenticated;