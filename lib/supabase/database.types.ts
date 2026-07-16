export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      benefits: {
        Row: {
          amount: number | null
          created_at: string
          currency: string
          id: string
          last_verified_at: string
          meta: Json
          notes: string | null
          slug: string
          source_url: string
          title: string
          unit: string | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string
          id?: string
          last_verified_at: string
          meta?: Json
          notes?: string | null
          slug: string
          source_url: string
          title: string
          unit?: string | null
          updated_at?: string
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string
          id?: string
          last_verified_at?: string
          meta?: Json
          notes?: string | null
          slug?: string
          source_url?: string
          title?: string
          unit?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          answers: Json
          created_at: string
          done_step_ids: Json
          id: string
          share_slug: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          answers?: Json
          created_at?: string
          done_step_ids?: Json
          id?: string
          share_slug: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          done_step_ids?: Json
          id?: string
          share_slug?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      step_reports: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          reason: string
          step_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          reason: string
          step_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          reason?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_reports_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "steps"
            referencedColumns: ["id"]
          },
        ]
      }
      steps: {
        Row: {
          body_md: string
          cond: Json
          created_at: string
          docs: Json
          id: string
          last_verified_at: string
          needs_review: boolean
          section_slug: string
          slug: string
          sort_order: number
          source_url: string
          stage: string | null
          summary: string | null
          tips: Json
          title: string
          updated_at: string
          warn_rule: Json | null
        }
        Insert: {
          body_md: string
          cond?: Json
          created_at?: string
          docs?: Json
          id?: string
          last_verified_at: string
          needs_review?: boolean
          section_slug: string
          slug: string
          sort_order?: number
          source_url: string
          stage?: string | null
          summary?: string | null
          tips?: Json
          title: string
          updated_at?: string
          warn_rule?: Json | null
        }
        Update: {
          body_md?: string
          cond?: Json
          created_at?: string
          docs?: Json
          id?: string
          last_verified_at?: string
          needs_review?: boolean
          section_slug?: string
          slug?: string
          sort_order?: number
          source_url?: string
          stage?: string | null
          summary?: string | null
          tips?: Json
          title?: string
          updated_at?: string
          warn_rule?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "steps_section_slug_fkey"
            columns: ["section_slug"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["slug"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_plan_by_share_slug: {
        Args: { p_share_slug: string }
        Returns: {
          answers: Json
          created_at: string
          done_step_ids: Json
          id: string
          share_slug: string
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

