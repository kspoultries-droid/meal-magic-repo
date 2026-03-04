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
      cities: {
        Row: {
          created_at: string | null
          delivery_fee: number | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          delivery_fee?: number | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          delivery_fee?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      grocery_list_orders: {
        Row: {
          alternatives_note: string | null
          bill_image_url: string | null
          created_at: string
          customer_id: string
          delivery_address: string | null
          id: string
          image_url: string
          notes: string | null
          payment_method: string | null
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
          id?: string
          image_url: string
          notes?: string | null
          payment_method?: string | null
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
          id?: string
          image_url?: string
          notes?: string | null
          payment_method?: string | null
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
          category: string | null
          created_at: string | null
          description: string | null
          discount_price: number | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_special_offer: boolean | null
          name: string
          price: number
          sort_order: number | null
          store_id: string
          unit: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          discount_price?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_special_offer?: boolean | null
          name: string
          price: number
          sort_order?: number | null
          store_id: string
          unit?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          discount_price?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_special_offer?: boolean | null
          name?: string
          price?: number
          sort_order?: number | null
          store_id?: string
          unit?: string | null
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
      grocery_stores: {
        Row: {
          category: string
          city_id: string | null
          created_at: string | null
          delivery_time: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          owner_id: string
          rating: number | null
        }
        Insert: {
          category?: string
          city_id?: string | null
          created_at?: string | null
          delivery_time?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          owner_id: string
          rating?: number | null
        }
        Update: {
          category?: string
          city_id?: string | null
          created_at?: string | null
          delivery_time?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          owner_id?: string
          rating?: number | null
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
          price: number
          restaurant_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          price: number
          restaurant_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          price?: number
          restaurant_id?: string
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
      order_items: {
        Row: {
          id: string
          menu_item_id: string
          name: string
          order_id: string
          price: number
          quantity: number
        }
        Insert: {
          id?: string
          menu_item_id: string
          name: string
          order_id: string
          price: number
          quantity?: number
        }
        Update: {
          id?: string
          menu_item_id?: string
          name?: string
          order_id?: string
          price?: number
          quantity?: number
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
      orders: {
        Row: {
          city_id: string
          created_at: string | null
          customer_id: string
          delivery_address: string | null
          delivery_fee: number | null
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          restaurant_id: string
          rider_id: string | null
          status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          city_id: string
          created_at?: string | null
          customer_id: string
          delivery_address?: string | null
          delivery_fee?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          restaurant_id: string
          rider_id?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          city_id?: string
          created_at?: string | null
          customer_id?: string
          delivery_address?: string | null
          delivery_fee?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          restaurant_id?: string
          rider_id?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
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
          id: string
          notes: string | null
          payout_method: string
          period_end: string
          period_start: string
          processed_at: string | null
          processed_by: string | null
          status: string
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payout_method?: string
          period_end: string
          period_start: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payout_method?: string
          period_end?: string
          period_start?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          vendor_id?: string
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
      restaurants: {
        Row: {
          city_id: string
          commission_rate: number | null
          created_at: string | null
          cuisines: string[] | null
          delivery_time: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          owner_id: string
          rating: number | null
          updated_at: string | null
        }
        Insert: {
          city_id: string
          commission_rate?: number | null
          created_at?: string | null
          cuisines?: string[] | null
          delivery_time?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          owner_id: string
          rating?: number | null
          updated_at?: string | null
        }
        Update: {
          city_id?: string
          commission_rate?: number | null
          created_at?: string | null
          cuisines?: string[] | null
          delivery_time?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          owner_id?: string
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
      riders: {
        Row: {
          city_id: string | null
          current_lat: number | null
          current_lng: number | null
          id: string
          is_available: boolean | null
          total_earnings: number | null
          updated_at: string | null
          wallet_balance: number | null
        }
        Insert: {
          city_id?: string | null
          current_lat?: number | null
          current_lng?: number | null
          id: string
          is_available?: boolean | null
          total_earnings?: number | null
          updated_at?: string | null
          wallet_balance?: number | null
        }
        Update: {
          city_id?: string | null
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_available?: boolean | null
          total_earnings?: number | null
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
      service_reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          rating: number
          service_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          rating: number
          service_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          rating?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_restaurant: {
        Args: { _restaurant_id: string; _user_id: string }
        Returns: boolean
      }
      request_wallet_topup: {
        Args: { _amount: number; _payment_method: string }
        Returns: string
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
      ],
    },
  },
} as const
