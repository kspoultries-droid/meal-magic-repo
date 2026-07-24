import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Require shared secret so only the trusted scheduler can invoke this function
  const expected = Deno.env.get("AUTO_SHOP_TIMING_SECRET");
  const provided = req.headers.get("x-scheduler-secret");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get current time in Pakistan (PKT = UTC+5)
  const now = new Date();
  const pkt = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const currentTime = pkt.toISOString().slice(11, 16); // "HH:MM"

  // Grocery stores - open
  await supabase
    .from("grocery_stores")
    .update({ is_active: true })
    .eq("is_active", false)
    .not("opening_time", "is", null)
    .not("closing_time", "is", null)
    .lte("opening_time", currentTime)
    .gt("closing_time", currentTime);

  // Grocery stores - close
  const { data: groceryToClose } = await supabase
    .from("grocery_stores")
    .select("id, opening_time, closing_time")
    .eq("is_active", true)
    .not("opening_time", "is", null)
    .not("closing_time", "is", null);

  if (groceryToClose) {
    const idsToClose = groceryToClose
      .filter((s) => currentTime >= s.closing_time || currentTime < s.opening_time)
      .map((s) => s.id);
    if (idsToClose.length > 0) {
      await supabase.from("grocery_stores").update({ is_active: false }).in("id", idsToClose);
    }
  }

  // Restaurants - open
  await supabase
    .from("restaurants")
    .update({ is_active: true })
    .eq("is_active", false)
    .not("opening_time", "is", null)
    .not("closing_time", "is", null)
    .lte("opening_time", currentTime)
    .gt("closing_time", currentTime);

  // Restaurants - close
  const { data: restToClose } = await supabase
    .from("restaurants")
    .select("id, opening_time, closing_time")
    .eq("is_active", true)
    .not("opening_time", "is", null)
    .not("closing_time", "is", null);

  if (restToClose) {
    const idsToClose = restToClose
      .filter((r) => currentTime >= r.closing_time || currentTime < r.opening_time)
      .map((r) => r.id);
    if (idsToClose.length > 0) {
      await supabase.from("restaurants").update({ is_active: false }).in("id", idsToClose);
    }
  }

  return new Response(JSON.stringify({ success: true, currentTime, checked_at: now.toISOString() }), {
    headers: { "Content-Type": "application/json" },
  });
});
