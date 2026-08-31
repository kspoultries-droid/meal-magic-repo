export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_packages: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          placements: string[]
          price_per_day: number
          price_per_month: number
          price_per_week: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          placements?: string[]
          price_per_day?: number
          price_per_month?: number
          price_per_week?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          placements?: string[]
          price_per_day?: number
          price_per_month?: number
          price_per_week?: number
        }
        Relationships: []
      }
      app_owner: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          label: string | null
          updated_at: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          label?: string | null
          updated_at?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          label?: string | null
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      bank_ledger: {
        Row: {
          account_id: string
          amount: number
          balance_after: number
          counterparty_id: string | null
          counterparty_label: string | null
          created_at: string
          created_by: string | null
          destination_account: string | null
          direction: string
          id: string
          note: string | null
          reference_no: string | null
          source_id: string | null
          source_type: string
        }
        Insert: {
          account_id: string
          amount: number
          balance_after: number
          counterparty_id?: string | null
          counterparty_label?: string | null
          created_at?: string
          created_by?: string | null
          destination_account?: string | null
          direction: string
          id?: string
          note?: string | null
          reference_no?: string | null
          source_id?: string | null
          source_type: string
        }
        Update: {
          account_id?: string
          amount?: number
          balance_after?: number
          counterparty_id?: string | null
          counterparty_label?: string | null
          created_at?: string
          created_by?: string | null
          destination_account?: string | null
          direction?: string
          id?: string
          note?: string | null
          reference_no?: string | null
          source_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_ledger_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          auto_dispatch: boolean
          auto_hide_without_rider: boolean
          courier_advance_percent: number
          courier_payment_default: string
          created_at: string | null
          default_courier: string | null
          delivery_fee: number | null
          food_enabled: boolean
          grocery_enabled: boolean
          id: string
          max_dispatch_km: number
          max_offers_before_stuck: number
          name: string
          offer_timeout_seconds: number
          wholesale_enabled: boolean
        }
        Insert: {
          auto_dispatch?: boolean
          auto_hide_without_rider?: boolean
          courier_advance_percent?: number
          courier_payment_default?: string
          created_at?: string | null
          default_courier?: string | null
          delivery_fee?: number | null
          food_enabled?: boolean
          grocery_enabled?: boolean
          id?: string
          max_dispatch_km?: number
          max_offers_before_stuck?: number
          name: string
          offer_timeout_seconds?: number
          wholesale_enabled?: boolean
        }
        Update: {
          auto_dispatch?: boolean
          auto_hide_without_rider?: boolean
          courier_advance_percent?: number
          courier_payment_default?: string
          created_at?: string | null
          default_courier?: string | null
          delivery_fee?: number | null
          food_enabled?: boolean
          grocery_enabled?: boolean
          id?: string
          max_dispatch_km?: number
          max_offers_before_stuck?: number
          name?: string
          offer_timeout_seconds?: number
          wholesale_enabled?: boolean
        }
        Relationships: []
      }
      city_rider_stats: {
        Row: {
          city_id: string
          rider_count: number
          updated_at: string
        }
        Insert: {
          city_id: string
          rider_count?: number
          updated_at?: string
        }
        Update: {
          city_id?: string
          rider_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      commission_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          max_commission: number | null
          min_commission: number
          rate: number
          sector: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          max_commission?: number | null
          min_commission?: number
          rate?: number
          sector: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          max_commission?: number | null
          min_commission?: number
          rate?: number
          sector?: string
          updated_at?: string
        }
        Relationships: []
      }
      courier_sync_queue: {
        Row: {
          attempts: number
          created_at: string
          event_key: string
          id: string
          last_error: string | null
          next_attempt_at: string
          order_id: string
          payload: Json
          provider: string
          shipment_status: string | null
          state: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_key: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          order_id: string
          payload?: Json
          provider?: string
          shipment_status?: string | null
          state?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_key?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          order_id?: string
          payload?: Json
          provider?: string
          shipment_status?: string | null
          state?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      delivery_offers: {
        Row: {
          created_at: string
          delivery_fee: number
          distance_km: number | null
          dropoff_address: string | null
          expires_at: string
          id: string
          order_id: string
          order_kind: string
          pickup_name: string | null
          responded_at: string | null
          rider_id: string
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_fee?: number
          distance_km?: number | null
          dropoff_address?: string | null
          expires_at: string
          id?: string
          order_id: string
          order_kind: string
          pickup_name?: string | null
          responded_at?: string | null
          rider_id: string
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee?: number
          distance_km?: number | null
          dropoff_address?: string | null
          expires_at?: string
          id?: string
          order_id?: string
          order_kind?: string
          pickup_name?: string | null
          responded_at?: string | null
          rider_id?: string
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      grocery_cart_orders: {
        Row: {
          city_id: string | null
          courier_name: string | null
          courier_payment_type: string
          courier_tracking_url: string | null
          courier_updated_at: string | null
          created_at: string
          customer_id: string
          delivery_address: string | null
          delivery_fee: number
          delivery_fee_payer: string
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_method: string
          discount_amount: number
          dispatch_state: string
          id: string
          is_gift: boolean | null
          items: Json
          notes: string | null
          payment_method: string | null
          receiver_name: string | null
          receiver_phone: string | null
          rider_assigned_at: string | null
          rider_id: string | null
          shipment_status: string | null
          shipped_at: string | null
          status: string
          store_id: string
          total_amount: number
          tracking_number: string | null
          updated_at: string
          voucher_code: string | null
        }
        Insert: {
          city_id?: string | null
          courier_name?: string | null
          courier_payment_type?: string
          courier_tracking_url?: string | null
          courier_updated_at?: string | null
          created_at?: string
          customer_id: string
          delivery_address?: string | null
          delivery_fee?: number
          delivery_fee_payer?: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_method?: string
          discount_amount?: number
          dispatch_state?: string
          id?: string
          is_gift?: boolean | null
          items?: Json
          notes?: string | null
          payment_method?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          rider_assigned_at?: string | null
          rider_id?: string | null
          shipment_status?: string | null
          shipped_at?: string | null
          status?: string
          store_id: string
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          voucher_code?: string | null
        }
        Update: {
          city_id?: string | null
          courier_name?: string | null
          courier_payment_type?: string
          courier_tracking_url?: string | null
          courier_updated_at?: string | null
          created_at?: string
          customer_id?: string
          delivery_address?: string | null
          delivery_fee?: number
          delivery_fee_payer?: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_method?: string
          discount_amount?: number
          dispatch_state?: string
          id?: string
          is_gift?: boolean | null
          items?: Json
          notes?: string | null
          payment_method?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          rider_assigned_at?: string | null
          rider_id?: string | null
          shipment_status?: string | null
          shipped_at?: string | null
          status?: string
          store_id?: string
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          voucher_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grocery_cart_orders_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grocery_cart_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "grocery_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_list_orders: {
        Row: {
          alternatives_note: string | null
          bill_image_url: string | null
          created_at: string
          customer_id: string
          delivery_address: string | null
          delivery_fee: number
          delivery_lat: number | null
          delivery_lng: number | null
          dispatch_state: string
          id: string
          image_url: string
          is_gift: boolean | null
          notes: string | null
          payment_method: string | null
          receiver_name: string | null
          receiver_phone: string | null
          rider_assigned_at: string | null
          rider_id: string | null
          shopkeeper_notes: string | null
          status: string
          store_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          alternatives_note?: string | null
          bill_image_url?: string | null
          created_at?: string
          customer_id: string
          delivery_address?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          dispatch_state?: string
          id?: string
          image_url: string
          is_gift?: boolean | null
          notes?: string | null
          payment_method?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          rider_assigned_at?: string | null
          rider_id?: string | null
          shopkeeper_notes?: string | null
          status?: string
          store_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          alternatives_note?: string | null
          bill_image_url?: string | null
          created_at?: string
          customer_id?: string
          delivery_address?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          dispatch_state?: string
          id?: string
          image_url?: string
          is_gift?: boolean | null
          notes?: string | null
          payment_method?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          rider_assigned_at?: string | null
          rider_id?: string | null
          shopkeeper_notes?: string | null
          status?: string
          store_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_list_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "grocery_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_products: {
        Row: {
          bulk_tier_price: number | null
          bulk_tier_qty: number | null
          category: string | null
          created_at: string | null
          description: string | null
          discount_price: number | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_special_offer: boolean | null
          min_order_qty: number
          name: string
          price: number
          sort_order: number | null
          store_id: string
          unit: string | null
          wholesale_price: number | null
        }
        Insert: {
          bulk_tier_price?: number | null
          bulk_tier_qty?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          discount_price?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_special_offer?: boolean | null
          min_order_qty?: number
          name: string
          price: number
          sort_order?: number | null
          store_id: string
          unit?: string | null
          wholesale_price?: number | null
        }
        Update: {
          bulk_tier_price?: number | null
          bulk_tier_qty?: number | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          discount_price?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_special_offer?: boolean | null
          min_order_qty?: number
          name?: string
          price?: number
          sort_order?: number | null
          store_id?: string
          unit?: string | null
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grocery_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "grocery_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          order_id: string
          rating: number
          replied_at: string | null
          reply: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          order_id: string
          rating: number
          replied_at?: string | null
          reply?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string
          rating?: number
          replied_at?: string | null
          reply?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grocery_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "grocery_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_stores: {
        Row: {
          advance_percent: number | null
          banner_theme: string | null
          category: string
          city_id: string | null
          closing_time: string | null
          courier_partners: string | null
          created_at: string | null
          delivery_time: string | null
          fee_paid_until: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          minimum_order: number | null
          monthly_fee: number | null
          name: string
          name_color: string | null
          name_size: string | null
          name_style: string | null
          opening_time: string | null
          owner_id: string
          pays_delivery_fee: boolean
          rating: number | null
          ships_nationwide: boolean
          shop_category: string | null
          slug: string | null
          sort_order: number | null
          store_type: string
          subscription_status: string | null
          warning_message: string | null
        }
        Insert: {
          advance_percent?: number | null
          banner_theme?: string | null
          category?: string
          city_id?: string | null
          closing_time?: string | null
          courier_partners?: string | null
          created_at?: string | null
          delivery_time?: string | null
          fee_paid_until?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          minimum_order?: number | null
          monthly_fee?: number | null
          name: string
          name_color?: string | null
          name_size?: string | null
          name_style?: string | null
          opening_time?: string | null
          owner_id: string
          pays_delivery_fee?: boolean
          rating?: number | null
          ships_nationwide?: boolean
          shop_category?: string | null
          slug?: string | null
          sort_order?: number | null
          store_type?: string
          subscription_status?: string | null
          warning_message?: string | null
        }
        Update: {
          advance_percent?: number | null
          banner_theme?: string | null
          category?: string
          city_id?: string | null
          closing_time?: string | null
          courier_partners?: string | null
          created_at?: string | null
          delivery_time?: string | null
          fee_paid_until?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          minimum_order?: number | null
          monthly_fee?: number | null
          name?: string
          name_color?: string | null
          name_size?: string | null
          name_style?: string | null
          opening_time?: string | null
          owner_id?: string
          pays_delivery_fee?: boolean
          rating?: number | null
          ships_nationwide?: boolean
          shop_category?: string | null
          slug?: string | null
          sort_order?: number | null
          store_type?: string
          subscription_status?: string | null
          warning_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grocery_stores_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          option_groups: Json
          price: number
          restaurant_id: string
          variants: Json
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          option_groups?: Json
          price: number
          restaurant_id: string
          variants?: Json
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          option_groups?: Json
          price?: number
          restaurant_id?: string
          variants?: Json
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          courier_name: string | null
          created_at: string
          event_type: string
          from_value: string | null
          id: string
          note: string | null
          order_id: string
          order_type: string
          source: string
          to_value: string | null
          tracking_number: string | null
        }
        Insert: {
          actor_id?: string | null
          courier_name?: string | null
          created_at?: string
          event_type: string
          from_value?: string | null
          id?: string
          note?: string | null
          order_id: string
          order_type: string
          source?: string
          to_value?: string | null
          tracking_number?: string | null
        }
        Update: {
          actor_id?: string | null
          courier_name?: string | null
          created_at?: string
          event_type?: string
          from_value?: string | null
          id?: string
          note?: string | null
          order_id?: string
          order_type?: string
          source?: string
          to_value?: string | null
          tracking_number?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          menu_item_id: string
          name: string
          options: Json
          order_id: string
          price: number
          quantity: number
          unit_price: number | null
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          id?: string
          menu_item_id: string
          name: string
          options?: Json
          order_id: string
          price: number
          quantity?: number
          unit_price?: number | null
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          id?: string
          menu_item_id?: string
          name?: string
          options?: Json
          order_id?: string
          price?: number
          quantity?: number
          unit_price?: number | null
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          order_id: string
          order_kind: string
          read_at: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          order_id: string
          order_kind?: string
          read_at?: string | null
          sender_id: string
          sender_role?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          order_id?: string
          order_kind?: string
          read_at?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: []
      }
      order_reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          order_id: string
          rating: number
          replied_at: string | null
          reply: string | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          order_id: string
          rating: number
          replied_at?: string | null
          reply?: string | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string
          rating?: number
          replied_at?: string | null
          reply?: string | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          city_id: string
          created_at: string | null
          customer_id: string
          delivery_address: string | null
          delivery_fee: number | null
          delivery_fee_payer: string
          delivery_lat: number | null
          delivery_lng: number | null
          discount_amount: number
          dispatch_state: string
          id: string
          is_gift: boolean | null
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          receiver_name: string | null
          receiver_phone: string | null
          restaurant_id: string
          rider_id: string | null
          status: string | null
          total_amount: number
          updated_at: string | null
          voucher_code: string | null
        }
        Insert: {
          city_id: string
          created_at?: string | null
          customer_id: string
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_fee_payer?: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount_amount?: number
          dispatch_state?: string
          id?: string
          is_gift?: boolean | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          restaurant_id: string
          rider_id?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          voucher_code?: string | null
        }
        Update: {
          city_id?: string
          created_at?: string | null
          customer_id?: string
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_fee_payer?: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount_amount?: number
          dispatch_state?: string
          id?: string
          is_gift?: boolean | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          restaurant_id?: string
          rider_id?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          voucher_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_applications: {
        Row: {
          address: string | null
          admin_notes: string | null
          applicant_type: Database["public"]["Enums"]["partner_type"]
          business_name: string
          category: string | null
          city_id: string | null
          cnic: string | null
          cnic_image_url: string | null
          created_at: string
          email: string | null
          extra: Json | null
          id: string
          location_lat: number | null
          location_lng: number | null
          owner_name: string
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          shop_image_url: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          applicant_type: Database["public"]["Enums"]["partner_type"]
          business_name: string
          category?: string | null
          city_id?: string | null
          cnic?: string | null
          cnic_image_url?: string | null
          created_at?: string
          email?: string | null
          extra?: Json | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          owner_name: string
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          shop_image_url?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          applicant_type?: Database["public"]["Enums"]["partner_type"]
          business_name?: string
          category?: string | null
          city_id?: string | null
          cnic?: string | null
          cnic_image_url?: string | null
          created_at?: string
          email?: string | null
          extra?: Json | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          owner_name?: string
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          shop_image_url?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_applications_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_accounts: {
        Row: {
          account_number: string | null
          account_title: string | null
          balance: number
          bank_name: string | null
          created_at: string
          id: string
          is_active: boolean
          label: string
          method: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_title?: string | null
          balance?: number
          bank_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          method?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_title?: string | null
          balance?: number
          bank_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          method?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payout_settings: {
        Row: {
          account_number: string | null
          account_title: string | null
          commission_rate: number
          created_at: string
          id: string
          payout_method: string
          payout_schedule: string
          updated_at: string
          user_id: string
          vendor_type: string
        }
        Insert: {
          account_number?: string | null
          account_title?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          payout_method?: string
          payout_schedule?: string
          updated_at?: string
          user_id: string
          vendor_type?: string
        }
        Update: {
          account_number?: string | null
          account_title?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          payout_method?: string
          payout_schedule?: string
          updated_at?: string
          user_id?: string
          vendor_type?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          created_at: string
          from_account_id: string | null
          id: string
          notes: string | null
          payout_method: string
          period_end: string
          period_start: string
          processed_at: string | null
          processed_by: string | null
          reference_no: string | null
          status: string
          vendor_account_id: string | null
          vendor_confirmed_at: string | null
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          from_account_id?: string | null
          id?: string
          notes?: string | null
          payout_method?: string
          period_end: string
          period_start: string
          processed_at?: string | null
          processed_by?: string | null
          reference_no?: string | null
          status?: string
          vendor_account_id?: string | null
          vendor_confirmed_at?: string | null
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          from_account_id?: string | null
          id?: string
          notes?: string | null
          payout_method?: string
          period_end?: string
          period_start?: string
          processed_at?: string | null
          processed_by?: string | null
          reference_no?: string | null
          status?: string
          vendor_account_id?: string | null
          vendor_confirmed_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_vendor_account_id_fkey"
            columns: ["vendor_account_id"]
            isOneToOne: false
            referencedRelation: "vendor_bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_commissions: {
        Row: {
          city_id: string | null
          commission: number
          created_at: string
          delivery_fee: number
          gross: number
          id: string
          net_payable: number
          order_id: string
          order_kind: string
          partner_channel: string
          rate: number
          sector: string
          status: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          city_id?: string | null
          commission?: number
          created_at?: string
          delivery_fee?: number
          gross?: number
          id?: string
          net_payable?: number
          order_id: string
          order_kind: string
          partner_channel?: string
          rate?: number
          sector: string
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          city_id?: string | null
          commission?: number
          created_at?: string
          delivery_fee?: number
          gross?: number
          id?: string
          net_payable?: number
          order_id?: string
          order_kind?: string
          partner_channel?: string
          rate?: number
          sector?: string
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city_id: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      promotional_ads: {
        Row: {
          brand_name: string
          created_at: string | null
          end_date: string
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          package_id: string | null
          payment_amount: number | null
          payment_status: string | null
          placements: string[]
          sort_order: number | null
          start_date: string
          title: string
          updated_at: string | null
        }
        Insert: {
          brand_name: string
          created_at?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          package_id?: string | null
          payment_amount?: number | null
          payment_status?: string | null
          placements?: string[]
          sort_order?: number | null
          start_date?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          brand_name?: string
          created_at?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          package_id?: string | null
          payment_amount?: number | null
          payment_status?: string | null
          placements?: string[]
          sort_order?: number | null
          start_date?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotional_ads_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "ad_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reel_id: string
          reporter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reel_id: string
          reporter_id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reel_id?: string
          reporter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_reports_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          is_active: boolean
          likes: number
          moderation_status: string
          owner_id: string | null
          poster_url: string | null
          price: number | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sort_order: number
          source_id: string | null
          source_name: string
          source_type: string
          title: string
          video_url: string
          views: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          likes?: number
          moderation_status?: string
          owner_id?: string | null
          poster_url?: string | null
          price?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
          source_id?: string | null
          source_name: string
          source_type: string
          title: string
          video_url: string
          views?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          likes?: number
          moderation_status?: string
          owner_id?: string | null
          poster_url?: string | null
          price?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
          source_id?: string | null
          source_name?: string
          source_type?: string
          title?: string
          video_url?: string
          views?: number
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          city_id: string
          closing_time: string | null
          commission_rate: number | null
          created_at: string | null
          cuisines: string[] | null
          delivery_mode: string
          delivery_time: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          opening_time: string | null
          owner_id: string
          pays_delivery_fee: boolean
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          rating: number | null
          updated_at: string | null
        }
        Insert: {
          city_id: string
          closing_time?: string | null
          commission_rate?: number | null
          created_at?: string | null
          cuisines?: string[] | null
          delivery_mode?: string
          delivery_time?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          opening_time?: string | null
          owner_id: string
          pays_delivery_fee?: boolean
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          rating?: number | null
          updated_at?: string | null
        }
        Update: {
          city_id?: string
          closing_time?: string | null
          commission_rate?: number | null
          created_at?: string | null
          cuisines?: string[] | null
          delivery_mode?: string
          delivery_time?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          opening_time?: string | null
          owner_id?: string
          pays_delivery_fee?: boolean
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          rating?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_earnings: {
        Row: {
          amount: number
          base_pay: number
          bonus: number
          created_at: string
          distance_km: number
          distance_pay: number
          id: string
          order_id: string
          order_kind: string
          payout_id: string | null
          rider_id: string
          status: string
        }
        Insert: {
          amount?: number
          base_pay?: number
          bonus?: number
          created_at?: string
          distance_km?: number
          distance_pay?: number
          id?: string
          order_id: string
          order_kind: string
          payout_id?: string | null
          rider_id: string
          status?: string
        }
        Update: {
          amount?: number
          base_pay?: number
          bonus?: number
          created_at?: string
          distance_km?: number
          distance_pay?: number
          id?: string
          order_id?: string
          order_kind?: string
          payout_id?: string | null
          rider_id?: string
          status?: string
        }
        Relationships: []
      }
      rider_pay_plans: {
        Row: {
          city_id: string | null
          created_at: string
          id: string
          is_active: boolean
          min_order_pay: number
          monthly_salary: number
          pay_type: string
          per_km_fee: number
          per_order_fee: number
          rider_id: string | null
          updated_at: string
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          min_order_pay?: number
          monthly_salary?: number
          pay_type?: string
          per_km_fee?: number
          per_order_fee?: number
          rider_id?: string | null
          updated_at?: string
        }
        Update: {
          city_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          min_order_pay?: number
          monthly_salary?: number
          pay_type?: string
          per_km_fee?: number
          per_order_fee?: number
          rider_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_pay_plans_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_remittances: {
        Row: {
          account_id: string | null
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          method: string
          note: string | null
          receipt_url: string | null
          reference_no: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rider_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          receipt_url?: string | null
          reference_no?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rider_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          receipt_url?: string | null
          reference_no?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rider_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_remittances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          order_id: string
          order_kind: string
          rating: number
          rider_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          order_id: string
          order_kind?: string
          rating: number
          rider_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string
          order_kind?: string
          rating?: number
          rider_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      rider_salary_payouts: {
        Row: {
          bonus: number
          created_at: string
          created_by: string | null
          deduction: number
          from_account_id: string | null
          id: string
          note: string | null
          order_earnings: number
          period_end: string
          period_start: string
          reference_no: string | null
          rider_id: string
          salary_amount: number
          status: string
          total: number
        }
        Insert: {
          bonus?: number
          created_at?: string
          created_by?: string | null
          deduction?: number
          from_account_id?: string | null
          id?: string
          note?: string | null
          order_earnings?: number
          period_end: string
          period_start: string
          reference_no?: string | null
          rider_id: string
          salary_amount?: number
          status?: string
          total?: number
        }
        Update: {
          bonus?: number
          created_at?: string
          created_by?: string | null
          deduction?: number
          from_account_id?: string | null
          id?: string
          note?: string | null
          order_earnings?: number
          period_end?: string
          period_start?: string
          reference_no?: string | null
          rider_id?: string
          salary_amount?: number
          status?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "rider_salary_payouts_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_verifications: {
        Row: {
          address_match: boolean
          ai_checks: Json
          ai_score: number
          application_id: string | null
          back_url: string | null
          biometric_registered: boolean
          cnic_address: string | null
          cnic_expiry: string | null
          cnic_match: boolean
          cnic_name: string | null
          cnic_number: string
          created_at: string
          declared_address: string | null
          declared_name: string | null
          expiry_valid: boolean
          face_match: boolean
          failure_reason: string | null
          front_url: string | null
          id: string
          liveness_ok: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_match?: boolean
          ai_checks?: Json
          ai_score?: number
          application_id?: string | null
          back_url?: string | null
          biometric_registered?: boolean
          cnic_address?: string | null
          cnic_expiry?: string | null
          cnic_match?: boolean
          cnic_name?: string | null
          cnic_number: string
          created_at?: string
          declared_address?: string | null
          declared_name?: string | null
          expiry_valid?: boolean
          face_match?: boolean
          failure_reason?: string | null
          front_url?: string | null
          id?: string
          liveness_ok?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_match?: boolean
          ai_checks?: Json
          ai_score?: number
          application_id?: string | null
          back_url?: string | null
          biometric_registered?: boolean
          cnic_address?: string | null
          cnic_expiry?: string | null
          cnic_match?: boolean
          cnic_name?: string | null
          cnic_number?: string
          created_at?: string
          declared_address?: string | null
          declared_name?: string | null
          expiry_valid?: boolean
          face_match?: boolean
          failure_reason?: string | null
          front_url?: string | null
          id?: string
          liveness_ok?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_verifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      riders: {
        Row: {
          acceptance_rate: number
          city_id: string | null
          current_lat: number | null
          current_lng: number | null
          id: string
          is_available: boolean | null
          offers_accepted: number
          offers_received: number
          rating: number
          total_earnings: number | null
          total_reviews: number
          updated_at: string | null
          wallet_balance: number | null
        }
        Insert: {
          acceptance_rate?: number
          city_id?: string | null
          current_lat?: number | null
          current_lng?: number | null
          id: string
          is_available?: boolean | null
          offers_accepted?: number
          offers_received?: number
          rating?: number
          total_earnings?: number | null
          total_reviews?: number
          updated_at?: string | null
          wallet_balance?: number | null
        }
        Update: {
          acceptance_rate?: number
          city_id?: string | null
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_available?: boolean | null
          offers_accepted?: number
          offers_received?: number
          rating?: number
          total_earnings?: number | null
          total_reviews?: number
          updated_at?: string | null
          wallet_balance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "riders_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bookings: {
        Row: {
          address: string
          advance_fee: number | null
          advance_paid: boolean | null
          city_id: string | null
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          payment_method: string | null
          provider_id: string | null
          scheduled_date: string
          scheduled_time: string
          service_id: string
          status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          address: string
          advance_fee?: number | null
          advance_paid?: boolean | null
          city_id?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          provider_id?: string | null
          scheduled_date: string
          scheduled_time: string
          service_id: string
          status?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          address?: string
          advance_fee?: number | null
          advance_paid?: boolean | null
          city_id?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          provider_id?: string | null
          scheduled_date?: string
          scheduled_time?: string
          service_id?: string
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          color: string
          created_at: string | null
          icon: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          color?: string
          created_at?: string | null
          icon?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      service_manager_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_manager_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      service_providers: {
        Row: {
          address: string | null
          bio: string | null
          category_id: string | null
          city_id: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          is_available: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          rating: number | null
          total_reviews: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          bio?: string | null
          category_id?: string | null
          city_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          rating?: number | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          bio?: string | null
          category_id?: string | null
          city_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_available?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          rating?: number | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_providers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_providers_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          provider_id: string | null
          rating: number
          replied_at: string | null
          reply: string | null
          service_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          provider_id?: string | null
          rating: number
          replied_at?: string | null
          reply?: string | null
          service_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          provider_id?: string | null
          rating?: number
          replied_at?: string | null
          reply?: string | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string
          city_id: string | null
          created_at: string | null
          description: string | null
          duration: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          rating: number | null
          sort_order: number | null
        }
        Insert: {
          category_id: string
          city_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          rating?: number | null
          sort_order?: number | null
        }
        Update: {
          category_id?: string
          city_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          rating?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          lat: number | null
          lng: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          lat?: number | null
          lng?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          lat?: number | null
          lng?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_bank_accounts: {
        Row: {
          account_number: string
          account_title: string
          bank_name: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          method: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          account_title: string
          bank_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          method?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          account_title?: string
          bank_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          method?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount: number | null
          min_order: number
          scope: string
          sort_order: number
          title: string
          title_ur: string | null
          usage_limit: number | null
          used_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          scope?: string
          sort_order?: number
          title: string
          title_ur?: string | null
          usage_limit?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          scope?: string
          sort_order?: number
          title?: string
          title_ur?: string | null
          usage_limit?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          payment_method: string | null
          reference_id: string | null
          reference_type: string | null
          status: string
          type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          public_key: string
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          public_key: string
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          public_key?: string
          user_id?: string
        }
        Relationships: []
      }
      wholesale_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_active: boolean | null
          kind: string
          name: string
          name_ur: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          kind?: string
          name: string
          name_ur?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          kind?: string
          name?: string
          name_ur?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_delivery_offer: { Args: { _offer_id: string }; Returns: undefined }
      admin_pay_vendor: {
        Args: {
          _amount: number
          _from_account_id: string
          _notes?: string
          _period_end: string
          _period_start: string
          _reference_no?: string
          _vendor_account_id: string
          _vendor_id: string
        }
        Returns: string
      }
      apply_voucher_to_order: {
        Args: { _code: string; _kind: string; _order_id: string }
        Returns: Json
      }
      approve_partner_application: {
        Args: { _application_id: string }
        Returns: undefined
      }
      can_access_order_chat: {
        Args: { _kind: string; _order_id: string; _user_id: string }
        Returns: boolean
      }
      confirm_payout_received: {
        Args: { _payout_id: string }
        Returns: undefined
      }
      create_grocery_cart_order: {
        Args: {
          _city_id: string
          _delivery_address: string
          _delivery_lat?: number
          _delivery_lng?: number
          _is_gift?: boolean
          _items: Json
          _notes: string
          _payment_method: string
          _receiver_name?: string
          _receiver_phone?: string
          _store_id: string
        }
        Returns: string
      }
      create_order:
        | {
            Args: {
              _city_id: string
              _delivery_address: string
              _menu_items: Json
              _notes: string
              _payment_method: string
              _restaurant_id: string
            }
            Returns: string
          }
        | {
            Args: {
              _city_id: string
              _delivery_address: string
              _delivery_lat?: number
              _delivery_lng?: number
              _is_gift?: boolean
              _menu_items: Json
              _notes: string
              _payment_method: string
              _receiver_name?: string
              _receiver_phone?: string
              _restaurant_id: string
            }
            Returns: string
          }
      create_service_booking: {
        Args: {
          _address: string
          _notes: string
          _scheduled_date: string
          _scheduled_time: string
          _service_id: string
        }
        Returns: string
      }
      decline_delivery_offer: {
        Args: { _offer_id: string }
        Returns: undefined
      }
      dispatch_next_rider: {
        Args: { _kind: string; _order_id: string }
        Returns: string
      }
      escalate_stale_offers: { Args: never; Returns: number }
      get_city_services: {
        Args: never
        Returns: {
          courier_advance_percent: number
          courier_payment_default: string
          default_courier: string
          delivery_fee: number
          food_enabled: boolean
          food_live: boolean
          grocery_enabled: boolean
          grocery_live: boolean
          id: string
          name: string
          rider_count: number
          wholesale_enabled: boolean
          wholesale_live: boolean
        }[]
      }
      get_order_customer_contact: {
        Args: { _kind: string; _order_id: string }
        Returns: {
          customer_name: string
          customer_phone: string
        }[]
      }
      get_order_rider_info: {
        Args: { _order_id: string }
        Returns: {
          lat: number
          lng: number
          rider_name: string
          rider_phone: string
        }[]
      }
      get_rider_summary: {
        Args: never
        Returns: {
          cash_collected: number
          cash_due: number
          pending_remit: number
          remitted: number
          today_deliveries: number
          today_earnings: number
          total_deliveries: number
          total_earnings: number
        }[]
      }
      get_service_provider_contact: {
        Args: { _provider_id: string }
        Returns: {
          provider_name: string
          provider_phone: string
        }[]
      }
      get_top_selling_grocery_products: {
        Args: { _limit?: number }
        Returns: {
          discount_price: number
          id: string
          image_url: string
          name: string
          price: number
          sold_qty: number
          store_id: string
          unit: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      haversine_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      increment_reel_views: { Args: { _reel_id: string }; Returns: undefined }
      like_reel: { Args: { _reel_id: string }; Returns: undefined }
      list_public_service_providers: {
        Args: { _category_id?: string }
        Returns: {
          address: string
          bio: string
          category_id: string
          category_name: string
          city_id: string
          id: string
          image_url: string
          is_available: boolean
          latitude: number
          longitude: number
          name: string
          rating: number
          total_reviews: number
        }[]
      }
      manages_category: {
        Args: { _category_id: string; _user_id: string }
        Returns: boolean
      }
      mechanic_can_access_booking: {
        Args: { _booking_id: string; _user_id: string }
        Returns: boolean
      }
      owns_reel_source: {
        Args: { _source_id: string; _source_type: string; _user_id: string }
        Returns: boolean
      }
      owns_restaurant: {
        Args: { _restaurant_id: string; _user_id: string }
        Returns: boolean
      }
      pay_rider: {
        Args: {
          _bonus: number
          _deduction: number
          _from_account_id: string
          _note: string
          _period_end: string
          _period_start: string
          _reference_no: string
          _rider: string
          _salary: number
        }
        Returns: string
      }
      record_commission:
        | {
            Args: {
              _channel?: string
              _city_id: string
              _delivery_fee: number
              _order_id: string
              _order_kind: string
              _sector: string
              _total: number
              _vendor_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _channel?: string
              _city_id: string
              _delivery_fee: number
              _order_id: string
              _order_kind: string
              _sector: string
              _total: number
              _vendor_id: string
              _vendor_pays_delivery?: boolean
            }
            Returns: undefined
          }
      record_rider_earning: {
        Args: { _kind: string; _order_id: string; _rider: string }
        Returns: undefined
      }
      reject_partner_application: {
        Args: { _application_id: string; _reason: string }
        Returns: undefined
      }
      reply_to_review: {
        Args: { _kind: string; _reply: string; _review_id: string }
        Returns: undefined
      }
      request_wallet_topup: {
        Args: { _amount: number; _payment_method: string }
        Returns: string
      }
      resolve_commission_rate: {
        Args: { _sector: string; _vendor_id: string }
        Returns: number
      }
      resolve_rider_pay: {
        Args: { _rider: string }
        Returns: {
          city_id: string | null
          created_at: string
          id: string
          is_active: boolean
          min_order_pay: number
          monthly_salary: number
          pay_type: string
          per_km_fee: number
          per_order_fee: number
          rider_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "rider_pay_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_rider_remittance: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: undefined
      }
      rider_cash_due: { Args: { _rider: string }; Returns: number }
      validate_voucher: {
        Args: { _code: string; _scope: string; _subtotal: number }
        Returns: Json
      }
      vendor_payable: { Args: { _vendor: string }; Returns: number }
    }
    Enums: {
      app_role:
        | "customer"
        | "restaurant_owner"
        | "rider"
        | "admin"
        | "support"
        | "mechanic"
        | "service_manager"
      application_status: "pending" | "approved" | "rejected"
      partner_type:
        | "restaurant"
        | "grocery"
        | "wholesale"
        | "service_provider"
        | "rider"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "customer",
        "restaurant_owner",
        "rider",
        "admin",
        "support",
        "mechanic",
        "service_manager",
      ],
      application_status: ["pending", "approved", "rejected"],
      partner_type: [
        "restaurant",
        "grocery",
        "wholesale",
        "service_provider",
        "rider",
      ],
    },
  },
} as const
