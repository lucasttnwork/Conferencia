/*
  Gerado via MCP Supabase: tipos TypeScript do schema atual.
  Fonte: mcp_supabase_generate_typescript_types
*/

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      boards: {
        Row: {
          created_at: string
          id: string
          name: string
          trello_id: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          trello_id: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          trello_id?: string
          url?: string | null
        }
        Relationships: []
      }
      card_events: {
        Row: {
          action_type: string
          board_id: string | null
          board_name: string | null
          card_id: string | null
          card_name: string | null
          created_at: string
          id: string
          list_from_id: string | null
          list_from_name: string | null
          list_to_id: string | null
          list_to_name: string | null
          member_fullname: string | null
          member_id: string | null
          member_username: string | null
          occurred_at: string
          payload_json: Json | null
          raw_action_type: string | null
          trello_action_id: string | null
        }
        Insert: {
          action_type: string
          board_id?: string | null
          board_name?: string | null
          card_id?: string | null
          card_name?: string | null
          created_at?: string
          id?: string
          list_from_id?: string | null
          list_from_name?: string | null
          list_to_id?: string | null
          list_to_name?: string | null
          member_fullname?: string | null
          member_id?: string | null
          member_username?: string | null
          occurred_at?: string
          payload_json?: Json | null
          raw_action_type?: string | null
          trello_action_id?: string | null
        }
        Update: {
          action_type?: string
          board_id?: string | null
          board_name?: string | null
          card_id?: string | null
          card_name?: string | null
          created_at?: string
          id?: string
          list_from_id?: string | null
          list_from_name?: string | null
          list_to_id?: string | null
          list_to_name?: string | null
          member_fullname?: string | null
          member_id?: string | null
          member_username?: string | null
          occurred_at?: string
          payload_json?: Json | null
          raw_action_type?: string | null
          trello_action_id?: string | null
        }
        Relationships: []
      }
      card_labels: {
        Row: { card_id: string; label_id: string }
        Insert: { card_id: string; label_id: string }
        Update: { card_id?: string; label_id?: string }
        Relationships: [
          {
            foreignKeyName: "card_labels_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          }
        ]
      }
      card_members: {
        Row: { card_id: string; member_id: string }
        Insert: { card_id: string; member_id: string }
        Update: { card_id?: string; member_id?: string }
        Relationships: [
          {
            foreignKeyName: "card_members_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      card_movements: {
        Row: {
          board_id: string
          card_id: string
          created_at: string | null
          from_list_id: string | null
          id: number
          moved_at: string
          moved_by_member_id: string | null
          occurred_at: string | null
          to_list_id: string | null
          trello_action_id: string | null
        }
        Insert: {
          board_id: string
          card_id: string
          created_at?: string | null
          from_list_id?: string | null
          id?: number
          moved_at: string
          moved_by_member_id?: string | null
          occurred_at?: string | null
          to_list_id?: string | null
          trello_action_id?: string | null
        }
        Update: {
          board_id?: string
          card_id?: string
          created_at?: string | null
          from_list_id?: string | null
          id?: number
          moved_at?: string
          moved_by_member_id?: string | null
          occurred_at?: string | null
          to_list_id?: string | null
          trello_action_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_movements_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_movements_moved_by_member_id_fkey"
            columns: ["moved_by_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      cards: {
        Row: {
          act_type: string | null
          act_value: number | null
          act_value_text: string | null
          board_id: string
          clerk_email: string | null
          clerk_name: string | null
          created_at: string
          created_by_member_id: string | null
          current_list_id: string | null
          current_list_trello_id: string | null
          description: string | null
          due_at: string | null
          id: string
          is_closed: boolean
          name: string | null
          protocol_number: string | null
          received_at: string | null
          received_at_text: string | null
          reconference: boolean | null
          trello_id: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          act_type?: string | null
          act_value?: number | null
          act_value_text?: string | null
          board_id: string
          clerk_email?: string | null
          clerk_name?: string | null
          created_at?: string
          created_by_member_id?: string | null
          current_list_id?: string | null
          current_list_trello_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          is_closed?: boolean
          name?: string | null
          protocol_number?: string | null
          received_at?: string | null
          received_at_text?: string | null
          reconference?: boolean | null
          trello_id: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          act_type?: string | null
          act_value?: number | null
          act_value_text?: string | null
          board_id?: string
          clerk_email?: string | null
          clerk_name?: string | null
          created_at?: string
          created_by_member_id?: string | null
          current_list_id?: string | null
          current_list_trello_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          is_closed?: boolean
          name?: string | null
          protocol_number?: string | null
          received_at?: string | null
          received_at_text?: string | null
          reconference?: boolean | null
          trello_id?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_created_by_member_id_fkey"
            columns: ["created_by_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      labels: {
        Row: {
          board_id: string
          color: string | null
          created_at: string
          id: string
          name: string | null
          trello_id: string
        }
        Insert: {
          board_id: string
          color?: string | null
          created_at?: string
          id?: string
          name?: string | null
          trello_id: string
        }
        Update: {
          board_id?: string
          color?: string | null
          created_at?: string
          id?: string
          name?: string | null
          trello_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "labels_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          }
        ]
      }
      lists: {
        Row: {
          board_id: string
          closed: boolean
          created_at: string
          id: string
          name: string
          pos: number | null
          trello_id: string
          updated_at: string | null
        }
        Insert: {
          board_id: string
          closed?: boolean
          created_at?: string
          id?: string
          name: string
          pos?: number | null
          trello_id: string
          updated_at?: string | null
        }
        Update: {
          board_id?: string
          closed?: boolean
          created_at?: string
          id?: string
          name?: string
          pos?: number | null
          trello_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lists_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          }
        ]
      }
      members: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          trello_id: string
          username: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          trello_id: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          trello_id?: string
          username?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          action_type: string | null
          board_id: string | null
          id: number
          payload: Json
          processed_at: string | null
          received_at: string
          trello_action_id: string | null
        }
        Insert: {
          action_type?: string | null
          board_id?: string | null
          id?: number
          payload: Json
          processed_at?: string | null
          received_at?: string
          trello_action_id?: string | null
        }
        Update: {
          action_type?: string | null
          board_id?: string | null
          id?: number
          payload?: Json
          processed_at?: string | null
          received_at?: string
          trello_action_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      dashboard_act_types: { Row: { name: string | null; total_count: number | null; total_value: number | null } }
      dashboard_list_breakdown: { Row: { act_type_name: string | null; cards_count: number | null; classified_cards: number | null; completion_percentage: number | null; list_id: string | null; list_name: string | null; list_position: number | null; total_cards_in_list: number | null; total_value: number | null; unclassified_cards: number | null; unique_act_types: number | null } }
      dashboard_list_pivot: { Row: Record<string, number | null> & { list_name: string | null; list_position: number | null; "Percentual Classificados": number | null; "Total Classificados": number | null; total_cards: number | null } }
      dashboard_list_summary: { Row: { classified_cards: number | null; completion_percentage: number | null; list_name: string | null; list_position: number | null; status: string | null; total_cards: number | null; unclassified_cards: number | null; unique_act_types: number | null } }
      dashboard_lists: { Row: { cards_with_act_type: number | null; cards_without_act_type: number | null; id: string | null; name: string | null; position: number | null; total_cards: number | null } }
      dashboard_stats: { Row: { data: Json | null; data_type: string | null } }
      dashboard_total_cards: { Row: { cards_needing_reconference: number | null; cards_with_act_type: number | null; cards_with_clerk: number | null; cards_with_value: number | null; cards_without_act_type: number | null; total_cards: number | null; total_value: number | null } }
    }
    Functions: { backfill_card_list_id: { Args: { p_board_id: string }; Returns: undefined } }
    Enums: { "Escrevente ativo/desativado": "ativo" | "desativado" }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) |
    { schema: keyof DatabaseWithoutInternals },
  N extends T extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[T["schema"]]["Tables"] & DatabaseWithoutInternals[T["schema"]]["Views"]) : never = never,
> = T extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[T["schema"]]["Tables"] & DatabaseWithoutInternals[T["schema"]]["Views"])[N] extends { Row: infer R } ? R : never
  : T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never : never

export type TablesInsert<
  T extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  N extends T extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[T["schema"]]["Tables"] : never = never,
> = T extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[T["schema"]]["Tables"][N] extends { Insert: infer I } ? I : never
  : T extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never : never

export type TablesUpdate<
  T extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  N extends T extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[T["schema"]]["Tables"] : never = never,
> = T extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[T["schema"]]["Tables"][N] extends { Update: infer U } ? U : never
  : T extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never : never

export type Enums<
  T extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  N extends T extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[T["schema"]]["Enums"] : never = never,
> = T extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[T["schema"]]["Enums"][N]
  : T extends keyof DefaultSchema["Enums"] ? DefaultSchema["Enums"][T] : never

export type CompositeTypes<
  T extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  N extends T extends { schema: keyof DatabaseWithoutInternals } ? keyof DatabaseWithoutInternals[T["schema"]]["CompositeTypes"] : never = never,
> = T extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[T["schema"]]["CompositeTypes"][N]
  : T extends keyof DefaultSchema["CompositeTypes"] ? DefaultSchema["CompositeTypes"][T] : never

export const Constants = {
  public: {
    Enums: {
      "Escrevente ativo/desativado": ["ativo", "desativado"],
    },
  },
} as const


