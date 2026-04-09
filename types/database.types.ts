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
      ai_hint_usage: {
        Row: {
          attempt_id: string | null
          created_at: string
          feature_type: string
          id: string
          token_usage: number | null
          user_id: string
        }
        Insert: {
          attempt_id?: string | null
          created_at?: string
          feature_type: string
          id?: string
          token_usage?: number | null
          user_id: string
        }
        Update: {
          attempt_id?: string | null
          created_at?: string
          feature_type?: string
          id?: string
          token_usage?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_hint_usage_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_hint_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_correct: boolean | null
          problem_id: string
          session_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          problem_id: string
          session_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_correct?: boolean | null
          problem_id?: string
          session_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_answers: {
        Row: {
          answer_latex: string | null
          created_at: string
          duel_id: string
          id: string
          is_correct: boolean | null
          player_id: string
          round_id: string
          submitted_at: string | null
        }
        Insert: {
          answer_latex?: string | null
          created_at?: string
          duel_id: string
          id?: string
          is_correct?: boolean | null
          player_id: string
          round_id: string
          submitted_at?: string | null
        }
        Update: {
          answer_latex?: string | null
          created_at?: string
          duel_id?: string
          id?: string
          is_correct?: boolean | null
          player_id?: string
          round_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duel_answers_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_answers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_answers_round_duel_fkey"
            columns: ["round_id", "duel_id"]
            isOneToOne: false
            referencedRelation: "duel_rounds"
            referencedColumns: ["id", "duel_id"]
          },
          {
            foreignKeyName: "duel_answers_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "duel_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_rounds: {
        Row: {
          created_at: string
          duel_id: string
          finished_at: string | null
          id: string
          problem_id: string
          round_number: number
          started_at: string | null
        }
        Insert: {
          created_at?: string
          duel_id: string
          finished_at?: string | null
          id?: string
          problem_id: string
          round_number: number
          started_at?: string | null
        }
        Update: {
          created_at?: string
          duel_id?: string
          finished_at?: string | null
          id?: string
          problem_id?: string
          round_number?: number
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duel_rounds_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_rounds_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      duels: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          player1_id: string
          player2_id: string
          started_at: string | null
          topic_id: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          player1_id: string
          player2_id: string
          started_at?: string | null
          topic_id?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          player1_id?: string
          player2_id?: string
          started_at?: string | null
          topic_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duels_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempt_count: number
          created_at: string
          id: string
          max_attempts: number
          payload: Json
          processed_at: string | null
          scheduled_at: string | null
          status: string
          type: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          id?: string
          max_attempts?: number
          payload?: Json
          processed_at?: string | null
          scheduled_at?: string | null
          status: string
          type: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          id?: string
          max_attempts?: number
          payload?: Json
          processed_at?: string | null
          scheduled_at?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      material_topics: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          material_id: string
          topic_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          material_id: string
          topic_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          material_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_topics_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          processed_at: string | null
          status: string
          title: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          processed_at?: string | null
          status?: string
          title?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          processed_at?: string | null
          status?: string
          title?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          id: string
          provider: string
          provider_payment_id: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          provider?: string
          provider_payment_id?: string | null
          status: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          provider?: string
          provider_payment_id?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          started_at: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_pool: {
        Row: {
          created_at: string
          id: string
          problem_id: string
          topic_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          problem_id: string
          topic_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          problem_id?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "problem_pool_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_pool_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_templates: {
        Row: {
          base_difficulty: number | null
          created_at: string
          id: string
          name: string
          parameter_schema: Json | null
          template_latex: string
        }
        Insert: {
          base_difficulty?: number | null
          created_at?: string
          id?: string
          name: string
          parameter_schema?: Json | null
          template_latex: string
        }
        Update: {
          base_difficulty?: number | null
          created_at?: string
          id?: string
          name?: string
          parameter_schema?: Json | null
          template_latex?: string
        }
        Relationships: []
      }
      problems: {
        Row: {
          created_at: string
          difficulty_level: number
          id: string
          is_validated: boolean | null
          parameters: Json | null
          problem_latex: string
          solution_latex: string
          template_id: string | null
          topic_id: string | null
        }
        Insert: {
          created_at?: string
          difficulty_level: number
          id?: string
          is_validated?: boolean | null
          parameters?: Json | null
          problem_latex: string
          solution_latex: string
          template_id?: string | null
          topic_id?: string | null
        }
        Update: {
          created_at?: string
          difficulty_level?: number
          id?: string
          is_validated?: boolean | null
          parameters?: Json | null
          problem_latex?: string
          solution_latex?: string
          template_id?: string | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "problems_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "problem_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problems_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_steps: {
        Row: {
          attempt_id: string
          created_at: string
          error_type: string | null
          id: string
          is_valid: boolean | null
          step_index: number
          step_latex: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          error_type?: string | null
          id?: string
          is_valid?: boolean | null
          step_index: number
          step_latex: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          error_type?: string | null
          id?: string
          is_valid?: boolean | null
          step_index?: number
          step_latex?: string
        }
        Relationships: [
          {
            foreignKeyName: "solution_steps_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_progress: {
        Row: {
          created_at: string
          id: string
          last_practiced_at: string | null
          mastery_score: number
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_practiced_at?: string | null
          mastery_score?: number
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_practiced_at?: string | null
          mastery_score?: number
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          user_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          user_id?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<never, never> // NOSONAR: auto-generated Supabase empty placeholder, structural change not allowed
    Functions: Record<never, never> // NOSONAR: auto-generated Supabase empty placeholder, structural change not allowed
    Enums: Record<never, never> // NOSONAR: auto-generated Supabase empty placeholder, structural change not allowed
    CompositeTypes: Record<never, never> // NOSONAR: auto-generated Supabase empty placeholder, structural change not allowed
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
    : never = string,
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
  PublicTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = string,
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
  PublicTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = string,
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
    : never = string,
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
    : never = string,
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
