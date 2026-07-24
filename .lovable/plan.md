# EasyLife — Partner System + Operations Console

Aap ka request bara hai. Main isay **3 phases** mein deliver karoon ga taake koi cheez toote na aur aap step-by-step samajh saken.

---

## Phase 1 — Partner Application System (Option 1)

Har provider khud apply kare, admin approve kare, role automatically mile.

### Naya database table: `partner_applications`
- `applicant_type`: restaurant / grocery / wholesale / service_provider / rider
- `business_name`, `owner_name`, `phone`, `whatsapp`, `cnic`
- `city_id`, `address`, `location_lat/lng`
- `category` (services/wholesale ke liye)
- `documents` (CNIC image, shop photo — storage bucket)
- `status`: pending / approved / rejected
- `admin_notes`, `reviewed_by`, `reviewed_at`
- RLS: user apni application dekhe; admin sab dekhe/edit kare

### Nayi public page: `/partner`
5 tabs ke saath ek hi form:
1. Restaurant Partner
2. Grocery Store Partner
3. Wholesale Vendor (Karachi Sadar + nationwide)
4. Service Provider (mechanic/plumber/etc)
5. Rider

Form submit → application `pending` state mein jati hai → applicant ko WhatsApp/email confirmation.

### Admin ke liye: "Partner Applications" tab
- Pending queue (badge count ke saath)
- Har application: full details + documents preview
- **Approve** button → automatically:
  - Role assign (`restaurant_owner` / `rider` / etc.)
  - Corresponding record create (restaurant/grocery_store/service_provider/rider row)
  - Applicant ko notification
- **Reject** button → reason ke saath

### Navbar/Footer link
"Partner banain / Become a Partner" — sab public pages par visible.

---

## Phase 2 — Operations Command Center (`/operations`)

Ek **permanent page** jahan se aap pora app control karein. Sirf admin & support role ke liye.

### Layout: Single-page dashboard with live sections

**Top bar (live counters):**
- Aaj ke orders (food / grocery / wholesale / services)
- Pending deliveries
- Available riders (city-wise)
- Revenue today
- New partner applications

**Left column — Live Orders Feed:**
- Realtime list of all active orders (Supabase realtime)
- Filter: city, type, status, urgency
- Color-coded: red (delayed >30min), amber (in progress), green (delivered)
- Click → order details drawer with customer, shop, rider info + quick actions

**Center — Delivery Map (optional Phase 2b):**
- Live rider positions
- Pending pickup pins
- Manual rider assignment ke liye "nearest rider" suggestion (Haversine — already built)

**Right column — Quick Actions:**
- Assign rider to order
- Call customer / shop / rider (tel: links)
- Mark order issue / refund
- Pause/resume shop
- Emergency broadcast (WhatsApp link)

**Bottom tabs:**
- **Partners**: shops/riders/service providers ka health status (online/offline, last order, rating)
- **Cities**: har city ki performance — orders, delivery time, active riders
- **Alerts**: stuck orders, low-rated shops, complaints
- **Applications**: naye partners ka queue (Phase 1 se link)

### Aap kaise operate karein ge (daily workflow)
1. Subah `/operations` kholain
2. Applications queue check karein → approve/reject
3. Live orders feed dekhain — koi order 30min se stuck ho to intervene
4. Cities tab se dekhain kis shehar mein riders kam hain
5. Alerts tab se complaints handle karein

Main is page par **step-by-step Urdu guide** bhi likh doon ga — "Kaise use karain" section, taake aap ya aap ki team foran seekh sake.

---

## Phase 3 — Scale Analysis (kitne users possible hain?)

### Current stack: Lovable Cloud (Supabase) + Vite React PWA

**Realistic limits with current setup (no code changes):**
| Metric | Comfortable | Max before upgrade needed |
|---|---|---|
| Total registered users | 50,000 | ~200,000 |
| Daily active users (DAU) | 5,000 | ~15,000 |
| Concurrent users (peak) | 500 | ~2,000 |
| Orders per day | 2,000–3,000 | ~10,000 |
| Cities | 5–10 | 20+ |

**Bottlenecks aap ko yeh milen ge (order mein):**
1. **Realtime channels** (~500 concurrent subscribers ka soft limit) — order tracking bahut users ek saath dekhen to slow
2. **Database connections** — peak par slow queries
3. **Storage bandwidth** — bahut images
4. **Rider GPS updates** — har rider har 10s pe location bhejta hai

**Jab aap in limits ke qareeb aayen, main yeh optimize karoon ga:**
- Compute upgrade (1-click Cloud setting)
- Realtime ko poll-based fallback ke saath mix karna
- Image CDN + WebP conversion (kuch pehle se ho chuka hai)
- Database indexing audit
- Rider location update frequency dynamic karna

**Bottom line:** Aap ka current app **Rahim Yar Khan + Karachi Sadar launch** ke liye kaafi hai. 5–10,000 daily users tak koi issue nahi. Us ke baad hum incremental upgrades karain ge.

---

## Delivery order (main is tarteeb se banaoon ga)

1. **Step 1** — `partner_applications` table + RLS + storage bucket
2. **Step 2** — `/partner` public page (5-tab form)
3. **Step 3** — Admin "Applications" tab with approve/reject workflow
4. **Step 4** — `/operations` command center page (live orders, counters, quick actions)
5. **Step 5** — In-page Urdu operating guide (permanent reference)
6. **Step 6** — Navbar/Footer links + role-based access

Har step ke baad main aap ko batata hoon "yeh ho gaya, test karo, aage badhoon?"

---

**Kya main Step 1 se shuru karoon?**
