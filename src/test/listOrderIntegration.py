import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  page=await browser.new_page(viewport={'width':1280,'height':1800})
  minted=json.loads(Path.home().joinpath('.cache/lovable-auth/session.json').read_text())
  await page.goto('http://localhost:8080')
  await page.evaluate('([k,v])=>localStorage.setItem(k,v)',[minted['storage_key'],json.dumps(minted['session'])])
  await page.reload(); await page.wait_for_timeout(3000)
  result=await page.evaluate('''async()=>{
    const {supabase:s}=await import('/src/integrations/supabase/client.ts');
    const {data:{user}}=await s.auth.getUser(); if(!user)throw Error('signed out');
    const store='01cc2099-1280-4dc7-97d2-aa004dac4b44';
    const {data:shop}=await s.from('grocery_stores').select('pickup_lat,pickup_lng').eq('id',store).single();
    const {data:sample}=await s.from('grocery_list_orders').select('image_url').eq('store_id',store).limit(1).single();
    const input={customer_id:user.id,store_id:store,image_url:sample.image_url,image_urls:[sample.image_url,sample.image_url],delivery_address:'QA disposable list',notes:'QA disposable list',delivery_lat:shop.pickup_lat,delivery_lng:shop.pickup_lng};
    const {data:o,error}=await s.from('grocery_list_orders').insert(input).select().single();if(error)throw Error(error.message);
    const act=async(action,extra={})=>{const r=await s.rpc('list_order_action',{_order_id:o.id,_action:action,...extra});if(r.error)throw Error(action+': '+r.error.message);return r.data;};
    try{
      const dup=await s.from('grocery_list_orders').insert(input);if(!dup.error)throw Error('second waiting list permitted');
      await act('bill',{_bill:sample.image_url});
      const slip=await act('quote');if(slip.total_amount!==0||slip.status!=='quoted')throw Error('slip payable');
      const noPrice=await s.rpc('list_order_action',{_order_id:o.id,_action:'accept',_version:slip.quote_version});if(!noPrice.error)throw Error('unpriced accepted');
      const revised=await act('revise',{_note:'Buy 3 of the 5 requested items'});if(revised.total_amount!==0||revised.status!=='pending')throw Error('revision total retained');
      const priced=await act('quote',{_amount:300,_weight:1,_note:'Final 3 items'});
      const stale=await s.rpc('list_order_action',{_order_id:o.id,_action:'accept',_version:priced.quote_version-1});if(!stale.error)throw Error('stale quote accepted');
      return {id:o.id,photos:o.image_urls.length,subtotal:priced.items_subtotal,fee:priced.delivery_fee,total:priced.total_amount,version:priced.quote_version};
    }catch(e){await act('cancel').catch(()=>{});throw e;}
  }''')
  await page.evaluate('''async()=>{
    const React=await import('/node_modules/.vite/deps/react.js');
    const {createRoot}=await import('/node_modules/.vite/deps/react-dom_client.js');
    const {QueryClient,QueryClientProvider}=await import('/node_modules/.vite/deps/@tanstack_react-query.js');
    const {AuthProvider}=await import('/src/hooks/useAuth.tsx');
    const {default:CustomerListOrders}=await import('/src/components/grocery/CustomerListOrders.tsx');
    document.getElementById('root').remove();
    const host=document.createElement('div');document.body.appendChild(host);
    createRoot(host).render(React.createElement(QueryClientProvider,{client:new QueryClient()},React.createElement(AuthProvider,null,React.createElement(CustomerListOrders,{storeId:'01cc2099-1280-4dc7-97d2-aa004dac4b44'}))));
  }''')
  await page.get_by_role('button').filter(has_text='Rs 380').first.click()
  await page.get_by_role('button',name='منظور / Accept',exact=True).click()
  await page.get_by_text('تصدیق ہو گئی — ڈلیوری جلد ہوگی',exact=False).wait_for()
  Path('/tmp/browser/ration').mkdir(parents=True,exist_ok=True)
  await page.screenshot(path='/tmp/browser/ration/customer-approved.png')
  await page.set_viewport_size({'width':390,'height':844})
  await page.screenshot(path='/tmp/browser/ration/customer-mobile.png')
  await page.evaluate('''async id=>{
    const {supabase:s}=await import('/src/integrations/supabase/client.ts');
    const {data:o}=await s.from('grocery_list_orders').select('status').eq('id',id).single();
    if(o.status!=='confirmed')throw Error('UI acceptance did not persist');
    const {error}=await s.rpc('list_order_action',{_order_id:id,_action:'cancel'});if(error)throw Error(error.message);
  }''',result['id'])
  print('PASS live: waiting limit, slip only, revision resets money, stale rejection, customer UI final acceptance and persisted readback, cancellation',result)
  await browser.close()
asyncio.run(main())
