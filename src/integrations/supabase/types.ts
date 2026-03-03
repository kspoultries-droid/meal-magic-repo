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
    }
    Enums: {
      app_role: "customer" | "restaurant_owner" | "rider" | "admin"
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
      app_role: ["customer", "restaurant_owner", "rider", "admin"],
    },
  },
} as const
