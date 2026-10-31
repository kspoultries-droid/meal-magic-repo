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
    PostgrestVersion: "14.4"
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
      ai_setup_usage: {
        Row: {
          created_at: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          user_id?: string
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
      approval_requests: {
        Row: {
          amount: number
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          kind: string
          note: string | null
          payload: Json
          reference_id: string | null
          requested_by: string
          status: string
          used_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          kind: string
          note?: string | null
          payload?: Json
          reference_id?: string | null
          requested_by: string
          status?: string
          used_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          kind?: string
          note?: string | null
          payload?: Json
          reference_id?: string | null
          requested_by?: string
          status?: string
          used_at?: string | null
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
      catalog_items: {
        Row: {
          brand: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          unit: string | null
          weight_kg: number | null
        }
        Insert: {
          brand?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          unit?: string | null
          weight_kg?: number | null
        }
        Update: {
          brand?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          unit?: string | null
          weight_kg?: number | null
        }
        Relationships: []
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
      daily_coin_visits: {
        Row: {
          coins: number
          user_id: string
          visit_date: string
        }
        Insert: {
          coins?: number
          user_id: string
          visit_date: string
        }
        Update: {
          coins?: number
          user_id?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_coin_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_offers: {
        Row: {
          cash_to_collect: number | null
          created_at: string
          decline_reason: string | null
          delivery_fee: number
          distance_km: number | null
          dropoff_address: string | null
          earning_distance_km: number | null
          estimated_earning: number | null
          expires_at: string
          id: string
          is_batch: boolean
          manual: boolean
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
          cash_to_collect?: number | null
          created_at?: string
          decline_reason?: string | null
          delivery_fee?: number
          distance_km?: number | null
          dropoff_address?: string | null
          earning_distance_km?: number | null
          estimated_earning?: number | null
          expires_at: string
          id?: string
          is_batch?: boolean
          manual?: boolean
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
          cash_to_collect?: number | null
          created_at?: string
          decline_reason?: string | null
          delivery_fee?: number
          distance_km?: number | null
          dropoff_address?: string | null
          earning_distance_km?: number | null
          estimated_earning?: number | null
          expires_at?: string
          id?: string
          is_batch?: boolean
          manual?: boolean
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
      delivery_quotes: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string
          distance_km: number
          id: string
          mode: string
          note: string | null
          order_id: string | null
          order_kind: string
          status: string
          store_id: string | null
          updated_at: string
          vehicle_type_id: string | null
          weight_kg: number
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          distance_km?: number
          id?: string
          mode?: string
          note?: string | null
          order_id?: string | null
          order_kind?: string
          status?: string
          store_id?: string | null
          updated_at?: string
          vehicle_type_id?: string | null
          weight_kg?: number
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          distance_km?: number
          id?: string
          mode?: string
          note?: string | null
          order_id?: string | null
          order_kind?: string
          status?: string
          store_id?: string | null
          updated_at?: string
          vehicle_type_id?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_quotes_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_rate_cards: {
        Row: {
          base_fee: number
          city_id: string | null
          created_at: string
          free_above_amount: number | null
          free_km: number
          id: string
          is_active: boolean
          label: string | null
          max_fee: number | null
          max_weight_kg: number | null
          min_fee: number
          mode: string
          per_km: number
          sort_order: number
          updated_at: string
          vehicle_type_id: string | null
        }
        Insert: {
          base_fee?: number
          city_id?: string | null
          created_at?: string
          free_above_amount?: number | null
          free_km?: number
          id?: string
          is_active?: boolean
          label?: string | null
          max_fee?: number | null
          max_weight_kg?: number | null
          min_fee?: number
          mode: string
          per_km?: number
          sort_order?: number
          updated_at?: string
          vehicle_type_id?: string | null
        }
        Update: {
          base_fee?: number
          city_id?: string | null
          created_at?: string
          free_above_amount?: number | null
          free_km?: number
          id?: string
          is_active?: boolean
          label?: string | null
          max_fee?: number | null
          max_weight_kg?: number | null
          min_fee?: number
          mode?: string
          per_km?: number
          sort_order?: number
          updated_at?: string
          vehicle_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_rate_cards_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_rate_cards_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_weight_slabs: {
        Row: {
          created_at: string
          extra_fee: number
          id: string
          max_kg: number | null
          min_kg: number
          per_kg_fee: number
          rate_card_id: string
        }
        Insert: {
          created_at?: string
          extra_fee?: number
          id?: string
          max_kg?: number | null
          min_kg?: number
          per_kg_fee?: number
          rate_card_id: string
        }
        Update: {
          created_at?: string
          extra_fee?: number
          id?: string
          max_kg?: number | null
          min_kg?: number
          per_kg_fee?: number
          rate_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_weight_slabs_rate_card_id_fkey"
            columns: ["rate_card_id"]
            isOneToOne: false
            referencedRelation: "delivery_rate_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      grocery_cart_orders: {
        Row: {
          accepted_at: string | null
          arrived_customer_at: string | null
          billable_weight_kg: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cash_received: number | null
          cash_received_at: string | null
          city_id: string | null
          courier_name: string | null
          courier_payment_type: string
          courier_tracking_url: string | null
          courier_updated_at: string | null
          created_at: string
          currency: string
          customer_id: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_failure_reason: string | null
          delivery_fee: number
          delivery_fee_payer: string
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_method: string
          delivery_mode_calc: string | null
          delivery_stage: string
          discount_amount: number
          dispatch_state: string
          distance_km: number
          failed_at: string | null
          fee_breakdown: Json
          final_amount: number | null
          id: string
          inventory_managed: boolean
          is_gift: boolean | null
          items: Json
          items_adjustment: number
          notes: string | null
          original_amount: number | null
          packed_at: string | null
          payment_method: string | null
          picked_up_at: string | null
          picking_at: string | null
          ready_at: string | null
          receiver_name: string | null
          receiver_phone: string | null
          reject_reason: string | null
          return_requested_at: string | null
          returned_at: string | null
          rider_arrived_at: string | null
          rider_assigned_at: string | null
          rider_id: string | null
          shipment_status: string | null
          shipped_at: string | null
          sold_recorded: boolean
          status: string
          store_id: string
          substitution_adjustment: number
          total_amount: number
          tracking_number: string | null
          updated_at: string
          vehicle_type_id: string | null
          voucher_code: string | null
          weight_adjustment: number
          weight_confirmed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          arrived_customer_at?: string | null
          billable_weight_kg?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cash_received?: number | null
          cash_received_at?: string | null
          city_id?: string | null
          courier_name?: string | null
          courier_payment_type?: string
          courier_tracking_url?: string | null
          courier_updated_at?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_failure_reason?: string | null
          delivery_fee?: number
          delivery_fee_payer?: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_method?: string
          delivery_mode_calc?: string | null
          delivery_stage?: string
          discount_amount?: number
          dispatch_state?: string
          distance_km?: number
          failed_at?: string | null
          fee_breakdown?: Json
          final_amount?: number | null
          id?: string
          inventory_managed?: boolean
          is_gift?: boolean | null
          items?: Json
          items_adjustment?: number
          notes?: string | null
          original_amount?: number | null
          packed_at?: string | null
          payment_method?: string | null
          picked_up_at?: string | null
          picking_at?: string | null
          ready_at?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          reject_reason?: string | null
          return_requested_at?: string | null
          returned_at?: string | null
          rider_arrived_at?: string | null
          rider_assigned_at?: string | null
          rider_id?: string | null
          shipment_status?: string | null
          shipped_at?: string | null
          sold_recorded?: boolean
          status?: string
          store_id: string
          substitution_adjustment?: number
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          vehicle_type_id?: string | null
          voucher_code?: string | null
          weight_adjustment?: number
          weight_confirmed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          arrived_customer_at?: string | null
          billable_weight_kg?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cash_received?: number | null
          cash_received_at?: string | null
          city_id?: string | null
          courier_name?: string | null
          courier_payment_type?: string
          courier_tracking_url?: string | null
          courier_updated_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_failure_reason?: string | null
          delivery_fee?: number
          delivery_fee_payer?: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_method?: string
          delivery_mode_calc?: string | null
          delivery_stage?: string
          discount_amount?: number
          dispatch_state?: string
          distance_km?: number
          failed_at?: string | null
          fee_breakdown?: Json
          final_amount?: number | null
          id?: string
          inventory_managed?: boolean
          is_gift?: boolean | null
          items?: Json
          items_adjustment?: number
          notes?: string | null
          original_amount?: number | null
          packed_at?: string | null
          payment_method?: string | null
          picked_up_at?: string | null
          picking_at?: string | null
          ready_at?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          reject_reason?: string | null
          return_requested_at?: string | null
          returned_at?: string | null
          rider_arrived_at?: string | null
          rider_assigned_at?: string | null
          rider_id?: string | null
          shipment_status?: string | null
          shipped_at?: string | null
          sold_recorded?: boolean
          status?: string
          store_id?: string
          substitution_adjustment?: number
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          vehicle_type_id?: string | null
          voucher_code?: string | null
          weight_adjustment?: number
          weight_confirmed_at?: string | null
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
          {
            foreignKeyName: "grocery_cart_orders_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_list_orders: {
        Row: {
          accepted_at: string | null
          alternatives_note: string | null
          arrived_customer_at: string | null
          bill_image_url: string | null
          cancelled_at: string | null
          cash_received: number | null
          cash_received_at: string | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_failure_reason: string | null
          delivery_fee: number
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_stage: string
          dispatch_state: string
          id: string
          image_url: string
          is_gift: boolean | null
          notes: string | null
          payment_method: string | null
          picked_up_at: string | null
          ready_at: string | null
          receiver_name: string | null
          receiver_phone: string | null
          return_requested_at: string | null
          returned_at: string | null
          rider_arrived_at: string | null
          rider_assigned_at: string | null
          rider_id: string | null
          shopkeeper_notes: string | null
          status: string
          store_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          alternatives_note?: string | null
          arrived_customer_at?: string | null
          bill_image_url?: string | null
          cancelled_at?: string | null
          cash_received?: number | null
          cash_received_at?: string | null
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_failure_reason?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_stage?: string
          dispatch_state?: string
          id?: string
          image_url: string
          is_gift?: boolean | null
          notes?: string | null
          payment_method?: string | null
          picked_up_at?: string | null
          ready_at?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          return_requested_at?: string | null
          returned_at?: string | null
          rider_arrived_at?: string | null
          rider_assigned_at?: string | null
          rider_id?: string | null
          shopkeeper_notes?: string | null
          status?: string
          store_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          alternatives_note?: string | null
          arrived_customer_at?: string | null
          bill_image_url?: string | null
          cancelled_at?: string | null
          cash_received?: number | null
          cash_received_at?: string | null
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_failure_reason?: string | null
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_stage?: string
          dispatch_state?: string
          id?: string
          image_url?: string
          is_gift?: boolean | null
          notes?: string | null
          payment_method?: string | null
          picked_up_at?: string | null
          ready_at?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          return_requested_at?: string | null
          returned_at?: string | null
          rider_arrived_at?: string | null
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
      grocery_order_items: {
        Row: {
          actor_id: string | null
          adjustment_amount: number
          approval_status: string
          created_at: string
          final_line_total: number
          id: string
          is_weight_based: boolean
          line_index: number
          name: string
          order_id: string
          original_line_total: number
          picked_at: string | null
          picked_qty: number | null
          picked_weight_kg: number | null
          product_id: string | null
          reason: string | null
          requested_qty: number
          requested_weight_kg: number | null
          reserved_product_id: string | null
          reserved_qty: number
          reserved_variant_id: string | null
          responded_at: string | null
          status: string
          substitute_name: string | null
          substitute_product_id: string | null
          substitute_qty: number | null
          substitute_unit_price: number | null
          unit_price: number
          updated_at: string
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          actor_id?: string | null
          adjustment_amount?: number
          approval_status?: string
          created_at?: string
          final_line_total?: number
          id?: string
          is_weight_based?: boolean
          line_index?: number
          name: string
          order_id: string
          original_line_total?: number
          picked_at?: string | null
          picked_qty?: number | null
          picked_weight_kg?: number | null
          product_id?: string | null
          reason?: string | null
          requested_qty?: number
          requested_weight_kg?: number | null
          reserved_product_id?: string | null
          reserved_qty?: number
          reserved_variant_id?: string | null
          responded_at?: string | null
          status?: string
          substitute_name?: string | null
          substitute_product_id?: string | null
          substitute_qty?: number | null
          substitute_unit_price?: number | null
          unit_price?: number
          updated_at?: string
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          actor_id?: string | null
          adjustment_amount?: number
          approval_status?: string
          created_at?: string
          final_line_total?: number
          id?: string
          is_weight_based?: boolean
          line_index?: number
          name?: string
          order_id?: string
          original_line_total?: number
          picked_at?: string | null
          picked_qty?: number | null
          picked_weight_kg?: number | null
          product_id?: string | null
          reason?: string | null
          requested_qty?: number
          requested_weight_kg?: number | null
          reserved_product_id?: string | null
          reserved_qty?: number
          reserved_variant_id?: string | null
          responded_at?: string | null
          status?: string
          substitute_name?: string | null
          substitute_product_id?: string | null
          substitute_qty?: number | null
          substitute_unit_price?: number | null
          unit_price?: number
          updated_at?: string
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grocery_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "grocery_cart_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      grocery_products: {
        Row: {
          brand: string | null
          bulk_tier_price: number | null
          bulk_tier_qty: number | null
          category: string | null
          created_at: string | null
          delivery_days: string | null
          description: string | null
          discount_price: number | null
          id: string
          image_url: string | null
          images: string[]
          is_available: boolean | null
          is_special_offer: boolean | null
          is_weight_based: boolean
          min_order_qty: number
          name: string
          price: number
          rating: number
          shipping_class: string
          sku: string | null
          sold_count: number
          sort_order: number | null
          specs: Json
          stock_qty: number | null
          store_id: string
          tags: string[]
          unit: string | null
          variants: Json
          weight: string | null
          weight_kg: number
          wholesale_price: number | null
        }
        Insert: {
          brand?: string | null
          bulk_tier_price?: number | null
          bulk_tier_qty?: number | null
          category?: string | null
          created_at?: string | null
          delivery_days?: string | null
          description?: string | null
          discount_price?: number | null
          id?: string
          image_url?: string | null
          images?: string[]
          is_available?: boolean | null
          is_special_offer?: boolean | null
          is_weight_based?: boolean
          min_order_qty?: number
          name: string
          price: number
          rating?: number
          shipping_class?: string
          sku?: string | null
          sold_count?: number
          sort_order?: number | null
          specs?: Json
          stock_qty?: number | null
          store_id: string
          tags?: string[]
          unit?: string | null
          variants?: Json
          weight?: string | null
          weight_kg?: number
          wholesale_price?: number | null
        }
        Update: {
          brand?: string | null
          bulk_tier_price?: number | null
          bulk_tier_qty?: number | null
          category?: string | null
          created_at?: string | null
          delivery_days?: string | null
          description?: string | null
          discount_price?: number | null
          id?: string
          image_url?: string | null
          images?: string[]
          is_available?: boolean | null
          is_special_offer?: boolean | null
          is_weight_based?: boolean
          min_order_qty?: number
          name?: string
          price?: number
          rating?: number
          shipping_class?: string
          sku?: string | null
          sold_count?: number
          sort_order?: number | null
          specs?: Json
          stock_qty?: number | null
          store_id?: string
          tags?: string[]
          unit?: string | null
          variants?: Json
          weight?: string | null
          weight_kg?: number
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
          photo_urls: string[]
          rating: number
          replied_at: string | null
          reply: string | null
          store_id: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          order_id: string
          photo_urls?: string[]
          rating: number
          replied_at?: string | null
          reply?: string | null
          store_id: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string
          photo_urls?: string[]
          rating?: number
          replied_at?: string | null
          reply?: string | null
          store_id?: string
          updated_at?: string
          video_url?: string | null
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
          auto_accept_orders: boolean
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
          auto_accept_orders?: boolean
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
          auto_accept_orders?: boolean
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
      intercity_routes: {
        Row: {
          created_at: string
          distance_km: number
          flat_fee: number
          from_city_id: string
          id: string
          is_active: boolean
          per_kg_fee: number
          to_city_id: string | null
          to_name: string
          updated_at: string
          vehicle_type_id: string | null
        }
        Insert: {
          created_at?: string
          distance_km?: number
          flat_fee?: number
          from_city_id: string
          id?: string
          is_active?: boolean
          per_kg_fee?: number
          to_city_id?: string | null
          to_name: string
          updated_at?: string
          vehicle_type_id?: string | null
        }
        Update: {
          created_at?: string
          distance_km?: number
          flat_fee?: number
          from_city_id?: string
          id?: string
          is_active?: boolean
          per_kg_fee?: number
          to_city_id?: string | null
          to_name?: string
          updated_at?: string
          vehicle_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intercity_routes_from_city_id_fkey"
            columns: ["from_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercity_routes_to_city_id_fkey"
            columns: ["to_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercity_routes_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_secrets: {
        Row: {
          name: string
          value: string
        }
        Insert: {
          name: string
          value: string
        }
        Update: {
          name?: string
          value?: string
        }
        Relationships: []
      }
      ledger_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string
          is_active: boolean
          name: string
          party_type: string | null
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string
          is_active?: boolean
          name: string
          party_type?: string | null
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string
          is_active?: boolean
          name?: string
          party_type?: string | null
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          account_code: string
          amount: number
          created_at: string
          currency: string
          direction: string
          id: string
          memo: string | null
          party_id: string | null
          txn_id: string
        }
        Insert: {
          account_code: string
          amount: number
          created_at?: string
          currency?: string
          direction: string
          id?: string
          memo?: string | null
          party_id?: string | null
          txn_id: string
        }
        Update: {
          account_code?: string
          amount?: number
          created_at?: string
          currency?: string
          direction?: string
          id?: string
          memo?: string | null
          party_id?: string | null
          txn_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_code_fkey"
            columns: ["account_code"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "ledger_entries_txn_id_fkey"
            columns: ["txn_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          order_id: string | null
          order_kind: string | null
          txn_kind: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          order_id?: string | null
          order_kind?: string | null
          txn_kind: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          order_id?: string | null
          order_kind?: string | null
          txn_kind?: string
        }
        Relationships: []
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
          weight_kg: number
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
          weight_kg?: number
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
          weight_kg?: number
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          path: string | null
          pushed_at: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          path?: string | null
          pushed_at?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          path?: string | null
          pushed_at?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
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
          photo_urls: string[]
          rating: number
          replied_at: string | null
          reply: string | null
          restaurant_id: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          order_id: string
          photo_urls?: string[]
          rating: number
          replied_at?: string | null
          reply?: string | null
          restaurant_id: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string
          photo_urls?: string[]
          rating?: number
          replied_at?: string | null
          reply?: string | null
          restaurant_id?: string
          updated_at?: string
          video_url?: string | null
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
          accepted_at: string | null
          arrived_customer_at: string | null
          billable_weight_kg: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cash_received: number | null
          cash_received_at: string | null
          city_id: string
          created_at: string | null
          currency: string
          customer_id: string
          delay_minutes: number | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_failure_reason: string | null
          delivery_fee: number | null
          delivery_fee_payer: string
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_mode_calc: string | null
          delivery_proof_path: string | null
          delivery_stage: string
          discount_amount: number
          dispatch_state: string
          distance_km: number
          fee_breakdown: Json
          id: string
          is_gift: boolean | null
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          picked_up_at: string | null
          prep_minutes: number | null
          ready_at: string | null
          receiver_name: string | null
          receiver_phone: string | null
          restaurant_id: string
          return_requested_at: string | null
          returned_at: string | null
          rider_arrived_at: string | null
          rider_id: string | null
          status: string | null
          total_amount: number
          updated_at: string | null
          vehicle_type_id: string | null
          voucher_code: string | null
        }
        Insert: {
          accepted_at?: string | null
          arrived_customer_at?: string | null
          billable_weight_kg?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cash_received?: number | null
          cash_received_at?: string | null
          city_id: string
          created_at?: string | null
          currency?: string
          customer_id: string
          delay_minutes?: number | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_failure_reason?: string | null
          delivery_fee?: number | null
          delivery_fee_payer?: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_mode_calc?: string | null
          delivery_proof_path?: string | null
          delivery_stage?: string
          discount_amount?: number
          dispatch_state?: string
          distance_km?: number
          fee_breakdown?: Json
          id?: string
          is_gift?: boolean | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          picked_up_at?: string | null
          prep_minutes?: number | null
          ready_at?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          restaurant_id: string
          return_requested_at?: string | null
          returned_at?: string | null
          rider_arrived_at?: string | null
          rider_id?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          vehicle_type_id?: string | null
          voucher_code?: string | null
        }
        Update: {
          accepted_at?: string | null
          arrived_customer_at?: string | null
          billable_weight_kg?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cash_received?: number | null
          cash_received_at?: string | null
          city_id?: string
          created_at?: string | null
          currency?: string
          customer_id?: string
          delay_minutes?: number | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_failure_reason?: string | null
          delivery_fee?: number | null
          delivery_fee_payer?: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_mode_calc?: string | null
          delivery_proof_path?: string | null
          delivery_stage?: string
          discount_amount?: number
          dispatch_state?: string
          distance_km?: number
          fee_breakdown?: Json
          id?: string
          is_gift?: boolean | null
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          picked_up_at?: string | null
          prep_minutes?: number | null
          ready_at?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          restaurant_id?: string
          return_requested_at?: string | null
          returned_at?: string | null
          rider_arrived_at?: string | null
          rider_id?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          vehicle_type_id?: string | null
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
          {
            foreignKeyName: "orders_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
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
      partner_kyc_checks: {
        Row: {
          ai_score: number | null
          back_path: string | null
          cnic_expiry: string | null
          cnic_number: string
          failure_reason: string | null
          front_path: string | null
          selfie_path: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_score?: number | null
          back_path?: string | null
          cnic_expiry?: string | null
          cnic_number: string
          failure_reason?: string | null
          front_path?: string | null
          selfie_path?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_score?: number | null
          back_path?: string | null
          cnic_expiry?: string | null
          cnic_number?: string
          failure_reason?: string | null
          front_path?: string | null
          selfie_path?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      payments: {
        Row: {
          amount: number
          amount_refunded: number
          captured_at: string | null
          created_at: string
          currency: string
          customer_id: string | null
          failed_at: string | null
          id: string
          metadata: Json
          method: string
          order_id: string
          order_kind: string
          provider: string | null
          provider_reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          amount_refunded?: number
          captured_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json
          method?: string
          order_id: string
          order_kind: string
          provider?: string | null
          provider_reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_refunded?: number
          captured_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json
          method?: string
          order_id?: string
          order_kind?: string
          provider?: string | null
          provider_reference?: string | null
          status?: string
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
          adjustments_total: number | null
          amount: number
          commission_total: number | null
          created_at: string
          currency: string
          discounts_total: number | null
          from_account_id: string | null
          gross_sales: number | null
          id: string
          notes: string | null
          payout_method: string
          period_end: string
          period_start: string
          processed_at: string | null
          processed_by: string | null
          receipt_path: string | null
          reference_no: string | null
          refunds_total: number | null
          status: string
          tax_withheld: number | null
          vendor_account_id: string | null
          vendor_confirmed_at: string | null
          vendor_id: string
        }
        Insert: {
          adjustments_total?: number | null
          amount: number
          commission_total?: number | null
          created_at?: string
          currency?: string
          discounts_total?: number | null
          from_account_id?: string | null
          gross_sales?: number | null
          id?: string
          notes?: string | null
          payout_method?: string
          period_end: string
          period_start: string
          processed_at?: string | null
          processed_by?: string | null
          receipt_path?: string | null
          reference_no?: string | null
          refunds_total?: number | null
          status?: string
          tax_withheld?: number | null
          vendor_account_id?: string | null
          vendor_confirmed_at?: string | null
          vendor_id: string
        }
        Update: {
          adjustments_total?: number | null
          amount?: number
          commission_total?: number | null
          created_at?: string
          currency?: string
          discounts_total?: number | null
          from_account_id?: string | null
          gross_sales?: number | null
          id?: string
          notes?: string | null
          payout_method?: string
          period_end?: string
          period_start?: string
          processed_at?: string | null
          processed_by?: string | null
          receipt_path?: string | null
          reference_no?: string | null
          refunds_total?: number | null
          status?: string
          tax_withheld?: number | null
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
      product_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          asked_by: string
          created_at: string
          id: string
          product_id: string
          question: string
          store_id: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asked_by: string
          created_at?: string
          id?: string
          product_id: string
          question: string
          store_id: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asked_by?: string
          created_at?: string
          id?: string
          product_id?: string
          question?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_questions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "grocery_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_questions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "grocery_stores"
            referencedColumns: ["id"]
          },
        ]
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
          phone_verified: boolean
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
          phone_verified?: boolean
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
          phone_verified?: boolean
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
          ad_type: string
          brand_name: string
          clicks: number
          created_at: string | null
          cta_text: string | null
          end_date: string
          id: string
          image_url: string | null
          impressions: number
          is_active: boolean | null
          link_url: string | null
          offer_badge: string | null
          original_price: number | null
          package_id: string | null
          payment_amount: number | null
          payment_status: string | null
          placements: string[]
          price: number | null
          promo_code: string | null
          show_text: boolean
          sort_order: number | null
          start_date: string
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ad_type?: string
          brand_name: string
          clicks?: number
          created_at?: string | null
          cta_text?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean | null
          link_url?: string | null
          offer_badge?: string | null
          original_price?: number | null
          package_id?: string | null
          payment_amount?: number | null
          payment_status?: string | null
          placements?: string[]
          price?: number | null
          promo_code?: string | null
          show_text?: boolean
          sort_order?: number | null
          start_date?: string
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ad_type?: string
          brand_name?: string
          clicks?: number
          created_at?: string | null
          cta_text?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean | null
          link_url?: string | null
          offer_badge?: string | null
          original_price?: number | null
          package_id?: string | null
          payment_amount?: number | null
          payment_status?: string | null
          placements?: string[]
          price?: number | null
          promo_code?: string | null
          show_text?: boolean
          sort_order?: number | null
          start_date?: string
          subtitle?: string | null
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
      referral_rewards: {
        Row: {
          created_at: string
          id: string
          order_id: string
          phone_norm: string
          referee_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          phone_norm: string
          referee_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          phone_norm?: string
          referee_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          approved_by: string | null
          completed_at: string | null
          created_at: string
          currency: string
          customer_id: string | null
          id: string
          initiated_by: string | null
          order_id: string
          order_kind: string
          payment_id: string | null
          provider_reference: string | null
          reason: string | null
          refund_type: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          initiated_by?: string | null
          order_id: string
          order_kind: string
          payment_id?: string | null
          provider_reference?: string | null
          reason?: string | null
          refund_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          id?: string
          initiated_by?: string | null
          order_id?: string
          order_kind?: string
          payment_id?: string | null
          provider_reference?: string | null
          reason?: string | null
          refund_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          auto_print: boolean
          busy_until: string | null
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
          ntn: string | null
          opening_time: string | null
          owner_id: string
          pays_delivery_fee: boolean
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          rating: number | null
          tax_percent: number
          updated_at: string | null
        }
        Insert: {
          auto_print?: boolean
          busy_until?: string | null
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
          ntn?: string | null
          opening_time?: string | null
          owner_id: string
          pays_delivery_fee?: boolean
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          rating?: number | null
          tax_percent?: number
          updated_at?: string | null
        }
        Update: {
          auto_print?: boolean
          busy_until?: string | null
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
          ntn?: string | null
          opening_time?: string | null
          owner_id?: string
          pays_delivery_fee?: boolean
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          rating?: number | null
          tax_percent?: number
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
      rider_cash_journal: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          entry_type: string
          id: string
          note: string | null
          order_id: string | null
          order_kind: string | null
          remittance_id: string | null
          rider_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          entry_type: string
          id?: string
          note?: string | null
          order_id?: string | null
          order_kind?: string | null
          remittance_id?: string | null
          rider_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          entry_type?: string
          id?: string
          note?: string | null
          order_id?: string | null
          order_kind?: string | null
          remittance_id?: string | null
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_cash_journal_remittance_id_fkey"
            columns: ["remittance_id"]
            isOneToOne: false
            referencedRelation: "rider_remittances"
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
          currency: string
          expected_amount: number | null
          id: string
          method: string
          note: string | null
          overage_amount: number | null
          receipt_url: string | null
          reference_no: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rider_id: string
          shortage_amount: number | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          admin_note?: string | null
          amount: number
          created_at?: string
          currency?: string
          expected_amount?: number | null
          id?: string
          method?: string
          note?: string | null
          overage_amount?: number | null
          receipt_url?: string | null
          reference_no?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rider_id: string
          shortage_amount?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          expected_amount?: number | null
          id?: string
          method?: string
          note?: string | null
          overage_amount?: number | null
          receipt_url?: string | null
          reference_no?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rider_id?: string
          shortage_amount?: number | null
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
      rider_shifts: {
        Row: {
          created_at: string
          id: string
          rider_id: string
          shift_date: string
          slot: string
        }
        Insert: {
          created_at?: string
          id?: string
          rider_id: string
          shift_date: string
          slot: string
        }
        Update: {
          created_at?: string
          id?: string
          rider_id?: string
          shift_date?: string
          slot?: string
        }
        Relationships: []
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
          break_until: string | null
          capacity_kg: number
          city_id: string | null
          consecutive_misses: number
          current_lat: number | null
          current_lng: number | null
          id: string
          is_available: boolean | null
          is_suspended: boolean
          last_seen_at: string | null
          location_accuracy_m: number | null
          location_updated_at: string | null
          offers_accepted: number
          offers_received: number
          rating: number
          suspension_reason: string | null
          total_earnings: number | null
          total_reviews: number
          updated_at: string | null
          vehicle_type_id: string | null
          wallet_balance: number | null
        }
        Insert: {
          acceptance_rate?: number
          break_until?: string | null
          capacity_kg?: number
          city_id?: string | null
          consecutive_misses?: number
          current_lat?: number | null
          current_lng?: number | null
          id: string
          is_available?: boolean | null
          is_suspended?: boolean
          last_seen_at?: string | null
          location_accuracy_m?: number | null
          location_updated_at?: string | null
          offers_accepted?: number
          offers_received?: number
          rating?: number
          suspension_reason?: string | null
          total_earnings?: number | null
          total_reviews?: number
          updated_at?: string | null
          vehicle_type_id?: string | null
          wallet_balance?: number | null
        }
        Update: {
          acceptance_rate?: number
          break_until?: string | null
          capacity_kg?: number
          city_id?: string | null
          consecutive_misses?: number
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_available?: boolean | null
          is_suspended?: boolean
          last_seen_at?: string | null
          location_accuracy_m?: number | null
          location_updated_at?: string | null
          offers_accepted?: number
          offers_received?: number
          rating?: number
          suspension_reason?: string | null
          total_earnings?: number | null
          total_reviews?: number
          updated_at?: string | null
          vehicle_type_id?: string | null
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
          {
            foreignKeyName: "riders_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
      service_assignment_history: {
        Row: {
          actor_id: string
          booking_id: string
          created_at: string
          id: string
          new_provider_id: string
          old_provider_id: string | null
          reason: string
        }
        Insert: {
          actor_id: string
          booking_id: string
          created_at?: string
          id?: string
          new_provider_id: string
          old_provider_id?: string | null
          reason: string
        }
        Update: {
          actor_id?: string
          booking_id?: string
          created_at?: string
          id?: string
          new_provider_id?: string
          old_provider_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_assignment_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bookings: {
        Row: {
          address: string
          advance_fee: number | null
          advance_paid: boolean | null
          checklist_completed: string[]
          checklist_snapshot: Json
          city_id: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string | null
          customer_id: string
          final_bill_path: string | null
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
          work_stage: string
        }
        Insert: {
          address: string
          advance_fee?: number | null
          advance_paid?: boolean | null
          checklist_completed?: string[]
          checklist_snapshot?: Json
          city_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          customer_id: string
          final_bill_path?: string | null
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
          work_stage?: string
        }
        Update: {
          address?: string
          advance_fee?: number | null
          advance_paid?: boolean | null
          checklist_completed?: string[]
          checklist_snapshot?: Json
          city_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          customer_id?: string
          final_bill_path?: string | null
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
          work_stage?: string
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
            foreignKeyName: "service_bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers_public"
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
          work_checklist: Json
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
          work_checklist?: Json
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
          work_checklist?: Json
        }
        Relationships: []
      }
      service_job_events: {
        Row: {
          action: string
          actor_id: string
          booking_id: string
          created_at: string
          id: string
          note: string | null
        }
        Insert: {
          action: string
          actor_id: string
          booking_id: string
          created_at?: string
          id?: string
          note?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          booking_id?: string
          created_at?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_job_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
            referencedColumns: ["id"]
          },
        ]
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
      service_quotations: {
        Row: {
          approved_at: string | null
          booking_id: string
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string
          details: Json
          id: string
          labour_amount: number
          notes: string | null
          other_amount: number
          parts_amount: number
          provider_id: string | null
          rejected_at: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          booking_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id: string
          details?: Json
          id?: string
          labour_amount?: number
          notes?: string | null
          other_amount?: number
          parts_amount?: number
          provider_id?: string | null
          rejected_at?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          booking_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string
          details?: Json
          id?: string
          labour_amount?: number
          notes?: string | null
          other_amount?: number
          parts_amount?: number
          provider_id?: string | null
          rejected_at?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_quotations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
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
            foreignKeyName: "service_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers_public"
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
          provider_id: string | null
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
          provider_id?: string | null
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
          provider_id?: string | null
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
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: number
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: number
        }
        Relationships: []
      }
      staff_scopes: {
        Row: {
          city_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          city_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          city_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_scopes_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          order_id: string | null
          order_kind: string
          photo_url: string | null
          resolved_at: string | null
          resolved_by: string | null
          service_booking_id: string | null
          service_provider_id: string | null
          staff_reply: string | null
          status: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string
          id?: string
          order_id?: string | null
          order_kind?: string
          photo_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          service_booking_id?: string | null
          service_provider_id?: string | null
          staff_reply?: string | null
          status?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          order_id?: string | null
          order_kind?: string
          photo_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          service_booking_id?: string | null
          service_provider_id?: string | null
          staff_reply?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_service_booking_id_fkey"
            columns: ["service_booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_service_provider_id_fkey"
            columns: ["service_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers_public"
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
      vehicle_types: {
        Row: {
          capacity_kg: number
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_ur: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          capacity_kg?: number
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_ur?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          capacity_kg?: number
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_ur?: string | null
          sort_order?: number
          updated_at?: string
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
          deposit_account_id: string | null
          description: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          receipt_path: string | null
          receipt_sha256: string | null
          reference_id: string | null
          reference_type: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_flags: string[]
          status: string
          type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          created_at?: string
          deposit_account_id?: string | null
          description?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          receipt_path?: string | null
          receipt_sha256?: string | null
          reference_id?: string | null
          reference_type?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_flags?: string[]
          status?: string
          type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          deposit_account_id?: string | null
          description?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          receipt_path?: string | null
          receipt_sha256?: string | null
          reference_id?: string | null
          reference_type?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_flags?: string[]
          status?: string
          type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_deposit_account_id_fkey"
            columns: ["deposit_account_id"]
            isOneToOne: false
            referencedRelation: "payment_accounts"
            referencedColumns: ["id"]
          },
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
      webauthn_challenges: {
        Row: {
          challenge: string
          expires_at: string
          kind: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          expires_at?: string
          kind: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          expires_at?: string
          kind?: string
          user_id?: string | null
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
      grocery_reviews_public: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string | null
          photo_urls: string[] | null
          rating: number | null
          replied_at: string | null
          reply: string | null
          store_id: string | null
          video_url: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          photo_urls?: string[] | null
          rating?: number | null
          replied_at?: string | null
          reply?: string | null
          store_id?: string | null
          video_url?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          photo_urls?: string[] | null
          rating?: number | null
          replied_at?: string | null
          reply?: string | null
          store_id?: string | null
          video_url?: string | null
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
      service_providers_public: {
        Row: {
          address: string | null
          bio: string | null
          category_id: string | null
          category_name: string | null
          city_id: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          is_available: boolean | null
          latitude: number | null
          longitude: number | null
          name: string | null
          rating: number | null
          total_reviews: number | null
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
    }
    Functions: {
      accept_delivery_offer: { Args: { _offer_id: string }; Returns: undefined }
      adjust_shop_stock: {
        Args: { _delta: number; _product: string; _variant: string }
        Returns: undefined
      }
      admin_create_own_business: {
        Args: {
          _address: string
          _category_id?: string
          _city_id: string
          _kind: string
          _name: string
          _phone: string
        }
        Returns: string
      }
      admin_daily_trend: {
        Args: { _days?: number }
        Returns: {
          commission: number
          day: string
          gross: number
          orders_count: number
        }[]
      }
      admin_force_assign_rider: {
        Args: { _kind: string; _order_id: string; _rider_id: string }
        Returns: undefined
      }
      admin_offer_order_to_rider: {
        Args: {
          _delivery_fee?: number
          _kind: string
          _order_id: string
          _rider_id: string
        }
        Returns: string
      }
      admin_overview: { Args: never; Returns: Json }
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
      admin_set_rider_state: {
        Args: { _action: string; _reason?: string; _rider_id: string }
        Returns: undefined
      }
      apply_voucher_to_order: {
        Args: { _code: string; _kind: string; _order_id: string }
        Returns: Json
      }
      approve_partner_application: {
        Args: { _application_id: string }
        Returns: undefined
      }
      assign_service_provider: {
        Args: { _booking_id: string; _provider_id: string; _reason: string }
        Returns: undefined
      }
      award_weekly_rider_bonus: { Args: never; Returns: number }
      can_access_order_chat: {
        Args: { _kind: string; _order_id: string; _user_id: string }
        Returns: boolean
      }
      can_supervise_service: { Args: { _booking_id: string }; Returns: boolean }
      can_upload_service_evidence: { Args: { _path: string }; Returns: boolean }
      claim_daily_coin: { Args: never; Returns: Json }
      complete_service_check: {
        Args: { _booking_id: string; _done: boolean; _item_id: string }
        Returns: undefined
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
      credit_wallet: {
        Args: { _amount: number; _note: string; _ref?: string; _user: string }
        Returns: undefined
      }
      decide_approval: {
        Args: { _approve: boolean; _id: string; _note: string }
        Returns: undefined
      }
      decide_service_quote: {
        Args: { _approve: boolean; _quotation_id: string }
        Returns: undefined
      }
      decline_delivery_offer: {
        Args: { _offer_id: string; _reason?: string }
        Returns: undefined
      }
      delivery_dispatch_ready: {
        Args: { _id: string; _kind: string }
        Returns: boolean
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
      get_delivery_rider_location: {
        Args: { _kind: string; _order_id: string }
        Returns: {
          accuracy_m: number
          lat: number
          lng: number
          location_updated_at: string
          rider_name: string
          rider_phone: string
        }[]
      }
      get_delivery_route_context: {
        Args: { _kind: string; _order_id: string }
        Returns: Json
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
      grocery_can_manage_order: {
        Args: { _order_id: string }
        Returns: boolean
      }
      grocery_materialize_items: {
        Args: { _order_id: string }
        Returns: undefined
      }
      grocery_pick_item: {
        Args: {
          _action: string
          _item_id: string
          _picked_qty?: number
          _picked_weight?: number
          _reason?: string
        }
        Returns: Json
      }
      grocery_recalc_order: { Args: { _order_id: string }; Returns: number }
      grocery_respond_substitution: {
        Args: { _approve: boolean; _item_id: string }
        Returns: number
      }
      grocery_substitute_item: {
        Args: {
          _item_id: string
          _reason?: string
          _substitute_product_id: string
          _substitute_qty?: number
        }
        Returns: Json
      }
      grocery_weight_tolerance: { Args: never; Returns: number }
      has_permission: {
        Args: { _perm: string; _user_id: string }
        Returns: boolean
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
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      like_reel: { Args: { _reel_id: string }; Returns: undefined }
      list_deposit_accounts: {
        Args: never
        Returns: {
          account_number: string
          account_title: string
          bank_name: string
          id: string
          label: string
          method: string
        }[]
      }
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
      list_staff: {
        Args: never
        Returns: {
          city_ids: string[]
          email: string
          full_name: string
          last_action_at: string
          roles: string[]
          user_id: string
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
      my_permissions: { Args: never; Returns: string[] }
      notify_user: {
        Args: {
          _body: string
          _kind: string
          _path: string
          _title: string
          _user: string
        }
        Returns: undefined
      }
      owns_reel_source: {
        Args: { _source_id: string; _source_type: string; _user_id: string }
        Returns: boolean
      }
      owns_restaurant: {
        Args: { _restaurant_id: string; _user_id: string }
        Returns: boolean
      }
      parse_weight_kg: { Args: { _txt: string }; Returns: number }
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
      post_ledger_txn: {
        Args: {
          _currency?: string
          _description?: string
          _lines: Json
          _order_id: string
          _order_kind: string
          _txn_kind: string
        }
        Returns: string
      }
      propose_service_quote: {
        Args: {
          _booking_id: string
          _labour: number
          _notes: string
          _other: number
          _parts: number
        }
        Returns: string
      }
      publish_rider_location: {
        Args: { _accuracy: number; _lat: number; _lng: number }
        Returns: string
      }
      quote_delivery: {
        Args: {
          _city_id: string
          _lat: number
          _lng: number
          _store_id: string
          _store_kind: string
          _subtotal: number
          _weight_kg: number
        }
        Returns: Json
      }
      record_commission: {
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
      register_device_token: {
        Args: { _platform?: string; _token: string }
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
      report_service_issue: {
        Args: { _booking_id: string; _category: string; _description: string }
        Returns: string
      }
      request_approval: {
        Args: {
          _amount: number
          _kind: string
          _note: string
          _reference_id: string
        }
        Returns: string
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
      resolve_rider_return: {
        Args: { _kind: string; _note: string; _order_id: string }
        Returns: undefined
      }
      resolve_service_issue: {
        Args: { _reply: string; _ticket_id: string }
        Returns: undefined
      }
      restaurant_announce_delay: {
        Args: { _minutes: number; _order_id: string }
        Returns: undefined
      }
      retry_order_dispatch: {
        Args: { _kind: string; _order_id: string }
        Returns: string
      }
      review_rider_earning: {
        Args: { _distance_km: number; _earning_id: string; _note: string }
        Returns: undefined
      }
      review_rider_remittance:
        | {
            Args: { _approve: boolean; _id: string; _note?: string }
            Returns: undefined
          }
        | {
            Args: {
              _approve: boolean
              _expected?: number
              _id: string
              _note?: string
            }
            Returns: undefined
          }
      review_wallet_topup: {
        Args: {
          _approve: boolean
          _confirmed_reference?: string
          _id: string
          _note: string
        }
        Returns: undefined
      }
      rider_assign_block_reason: {
        Args: {
          _kind?: string
          _manual?: boolean
          _order?: string
          _rider: string
        }
        Returns: string
      }
      rider_cash_due: { Args: { _rider: string }; Returns: number }
      rider_cash_limit: { Args: never; Returns: number }
      rider_cash_outstanding: { Args: { _rider: string }; Returns: number }
      rider_delivery_action: {
        Args: {
          _action: string
          _cash?: number
          _kind: string
          _lat?: number
          _lng?: number
          _order_id: string
          _reason?: string
        }
        Returns: undefined
      }
      rider_dispatch_idle: {
        Args: { _kind?: string; _order?: string; _rider: string }
        Returns: boolean
      }
      rider_end_break: { Args: never; Returns: undefined }
      rider_heartbeat: { Args: never; Returns: undefined }
      rider_hotspots: {
        Args: never
        Returns: {
          address: string
          lat: number
          lng: number
          orders_2h: number
          orders_today: number
          restaurant_name: string
        }[]
      }
      rider_level_info: { Args: { _rider?: string }; Returns: Json }
      rider_mark_step: {
        Args: { _lat?: number; _lng?: number; _order_id: string; _step: string }
        Returns: undefined
      }
      rider_operations_report: { Args: { _days?: number }; Returns: Json }
      role_permissions: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: string[]
      }
      save_company_settings: { Args: { _values: Json }; Returns: undefined }
      save_provider_service: {
        Args: {
          _active: boolean
          _category_id: string
          _description: string
          _duration: string
          _id: string
          _image_url: string
          _name: string
          _price: number
        }
        Returns: string
      }
      service_assignment_candidates: {
        Args: { _booking_id: string }
        Returns: {
          id: string
          name: string
          rating: number
        }[]
      }
      service_booking_contact: { Args: { _booking_id: string }; Returns: Json }
      service_job_action: {
        Args: {
          _action: string
          _bill_path?: string
          _booking_id: string
          _note?: string
        }
        Returns: undefined
      }
      service_provider_is_approved: {
        Args: { _provider_id: string }
        Returns: boolean
      }
      set_service_availability: {
        Args: { _available: boolean }
        Returns: undefined
      }
      set_service_checklist: {
        Args: { _category_id: string; _items: Json }
        Returns: undefined
      }
      shop_mark_order_ready: { Args: { _order_id: string }; Returns: undefined }
      shop_public_reviews: {
        Args: { _limit?: number; _store_id: string }
        Returns: Json
      }
      staff_add: {
        Args: {
          _city_ids?: string[]
          _email: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      staff_remove: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      submit_service_review: {
        Args: { _booking_id: string; _comment: string; _rating: number }
        Returns: undefined
      }
      submit_wallet_receipt: {
        Args: {
          _account_id: string
          _amount: number
          _paid_at: string
          _receipt_path: string
          _reference: string
          _sha256: string
          _user_id: string
        }
        Returns: string
      }
      sync_shop_open_state: { Args: never; Returns: number }
      team_performance: {
        Args: { _days?: number }
        Returns: {
          actor_id: string
          approvals: number
          email: string
          finance_actions: number
          full_name: string
          last_action_at: string
          order_actions: number
          rider_actions: number
          total_actions: number
        }[]
      }
      track_ad_event: {
        Args: { _ad_id: string; _kind: string }
        Returns: undefined
      }
      validate_voucher: {
        Args: { _code: string; _scope: string; _subtotal: number }
        Returns: Json
      }
      vendor_payable: { Args: { _vendor: string }; Returns: number }
      wallet_deposit_accounts: {
        Args: never
        Returns: {
          account_number: string
          account_title: string
          bank_name: string
          id: string
          label: string
          method: string
        }[]
      }
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
        | "ops_manager"
        | "dispatcher"
        | "finance"
        | "partner_manager"
        | "rider_supervisor"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
        "ops_manager",
        "dispatcher",
        "finance",
        "partner_manager",
        "rider_supervisor",
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
