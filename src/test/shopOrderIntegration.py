"""Authenticated integration regression; uses explicitly supplied disposable order IDs.

Run with SHOP_TEST_ORDER_IDS (JSON list), and the requesting owner's minted session.
Orders must be pending and pre-dispatch; tests finish by cancelling their unavailable items.
"""
import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright


async def main():
    minted = json.loads(Path.home().joinpath('.cache/lovable-auth/session.json').read_text())
    orders = json.loads(os.environ['SHOP_TEST_ORDER_IDS'])
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1280, 'height': 1800})
        await page.goto('http://localhost:8080')
        await page.evaluate('([k,v])=>localStorage.setItem(k,v)', [minted['storage_key'], json.dumps(minted['session'])])
        await page.reload()
        await page.wait_for_timeout(1000)
        results = await page.evaluate('''async ids=>{
          const {supabase:s}=await import('/src/integrations/supabase/client.ts');
          const results=[];
          for(const id of ids){
            const {data:o,error:readError}=await s.from('grocery_cart_orders').select('*').eq('id',id).single();
            if(readError)throw Error(readError.message);
            if(o.status!=='pending')throw Error('Test order must start pending');
            const {error:a}=await s.rpc('shop_order_action',{_order_id:id,_action:'accept'});if(a)throw Error(a.message);
            const {data:items}=await s.from('grocery_order_items').select('id').eq('order_id',id);
            for(const item of items){const {error:e}=await s.rpc('grocery_pick_item',{_item_id:item.id,_action:'unavailable'});if(e)throw Error(e.message)}
            const {data:after}=await s.from('grocery_cart_orders').select('status,final_amount,delivery_fee,cancellation_reason').eq('id',id).single();
            const {data:store}=await s.from('grocery_stores').select('store_type,auto_accept_orders').eq('id',o.store_id).single();
            results.push({id,store,after,fee:o.delivery_fee});
          }return results;
        }''', orders)
        assert {r['store']['store_type'] for r in results} == {'retail', 'wholesale'}
        for result in results:
            assert result['store']['auto_accept_orders'] is False
            assert result['after']['status'] == 'cancelled'
            assert result['after']['final_amount'] == 0
            assert result['after']['delivery_fee'] == result['fee']
            assert result['after']['cancellation_reason']
            await page.goto('http://localhost:8080/order-tracking/' + result['id'])
            await page.get_by_text('آرڈر منسوخ ہو گیا', exact=False).first.wait_for()
        print('PASS retail/wholesale: auto accept off, all unavailable cancelled, final Rs 0, fee snapshot retained, customer readback')
        await browser.close()


asyncio.run(main())