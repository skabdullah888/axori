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
      appeals: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          reason: string
          status: string
          submission_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reason: string
          status?: string
          submission_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reason?: string
          status?: string
          submission_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appeals_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "task_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      notice_board: {
        Row: {
          active: boolean
          body: string
          created_at: string
          created_by: string | null
          id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          admin_targeted: boolean
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          admin_targeted?: boolean
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          admin_targeted?: boolean
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          active: boolean
          created_at: string
          id: string
          instructions: string | null
          name: string
          receiver_number: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          instructions?: string | null
          name: string
          receiver_number: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          instructions?: string | null
          name?: string
          receiver_number?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          receiver_number: string | null
          reference: string | null
          sender_number: string | null
          status: string
          trnx_id: string | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          receiver_number?: string | null
          reference?: string | null
          sender_number?: string | null
          status?: string
          trnx_id?: string | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          receiver_number?: string | null
          reference?: string | null
          sender_number?: string | null
          status?: string
          trnx_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          activated_at: string | null
          avatar_url: string | null
          balance: number
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_publisher: boolean
          last_activation_request_at: string | null
          notify_appeals: boolean
          notify_payments: boolean
          notify_tasks: boolean
          phone: string | null
          publisher_restricted: boolean
          referral_code: string | null
          referred_by: string | null
          signup_ip: string | null
          status: string
          trust_score: number
          updated_at: string
          user_id: string | null
          username: string
          withdrawal_account: string | null
          withdrawal_method: string | null
        }
        Insert: {
          activated_at?: string | null
          avatar_url?: string | null
          balance?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_publisher?: boolean
          last_activation_request_at?: string | null
          notify_appeals?: boolean
          notify_payments?: boolean
          notify_tasks?: boolean
          phone?: string | null
          publisher_restricted?: boolean
          referral_code?: string | null
          referred_by?: string | null
          signup_ip?: string | null
          status?: string
          trust_score?: number
          updated_at?: string
          user_id?: string | null
          username: string
          withdrawal_account?: string | null
          withdrawal_method?: string | null
        }
        Update: {
          activated_at?: string | null
          avatar_url?: string | null
          balance?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_publisher?: boolean
          last_activation_request_at?: string | null
          notify_appeals?: boolean
          notify_payments?: boolean
          notify_tasks?: boolean
          phone?: string | null
          publisher_restricted?: boolean
          referral_code?: string | null
          referred_by?: string | null
          signup_ip?: string | null
          status?: string
          trust_score?: number
          updated_at?: string
          user_id?: string | null
          username?: string
          withdrawal_account?: string | null
          withdrawal_method?: string | null
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          amount: number
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      section_videos: {
        Row: {
          created_at: string
          id: string
          section_key: string
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          section_key: string
          title?: string
          updated_at?: string
          video_url?: string
        }
        Update: {
          created_at?: string
          id?: string
          section_key?: string
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          meta: Json | null
          suspicious: boolean
          user_agent: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          meta?: Json | null
          suspicious?: boolean
          user_agent?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          meta?: Json | null
          suspicious?: boolean
          user_agent?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          activation_amount: number
          activation_fee: number
          duplicate_ip_warning_enabled: boolean
          duplicate_ip_warning_message: string
          duplicate_ip_warning_title: string
          id: string
          minimum_referrals_for_withdrawal: number
          minimum_task_publish_amount: number
          minimum_task_total_amount: number
          minimum_tasks_for_withdrawal: number
          minimum_withdrawal: number
          publisher_task_tax: number
          referral_bonus: number
          site_theme: string
          updated_at: string
          withdrawal_fee: number
          withdrawals_enabled: boolean
        }
        Insert: {
          activation_amount?: number
          activation_fee?: number
          duplicate_ip_warning_enabled?: boolean
          duplicate_ip_warning_message?: string
          duplicate_ip_warning_title?: string
          id?: string
          minimum_referrals_for_withdrawal?: number
          minimum_task_publish_amount?: number
          minimum_task_total_amount?: number
          minimum_tasks_for_withdrawal?: number
          minimum_withdrawal?: number
          publisher_task_tax?: number
          referral_bonus?: number
          site_theme?: string
          updated_at?: string
          withdrawal_fee?: number
          withdrawals_enabled?: boolean
        }
        Update: {
          activation_amount?: number
          activation_fee?: number
          duplicate_ip_warning_enabled?: boolean
          duplicate_ip_warning_message?: string
          duplicate_ip_warning_title?: string
          id?: string
          minimum_referrals_for_withdrawal?: number
          minimum_task_publish_amount?: number
          minimum_task_total_amount?: number
          minimum_tasks_for_withdrawal?: number
          minimum_withdrawal?: number
          publisher_task_tax?: number
          referral_bonus?: number
          site_theme?: string
          updated_at?: string
          withdrawal_fee?: number
          withdrawals_enabled?: boolean
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      task_submission_proofs: {
        Row: {
          created_at: string
          id: string
          image_url: string
          submission_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          submission_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_submission_proofs_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "task_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      task_submissions: {
        Row: {
          created_at: string
          id: string
          note: string | null
          proof_text: string | null
          status: string
          task_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          proof_text?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          proof_text?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tasks: {
        Row: {
          banner_url: string | null
          category: string | null
          completed_slots: number
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          instructions: string | null
          proof_count: number
          proof_examples: Json | null
          proof_fields: Json
          proof_type: string | null
          publisher_id: string | null
          reward: number
          status: string
          title: string
          total_slots: number
        }
        Insert: {
          banner_url?: string | null
          category?: string | null
          completed_slots?: number
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          instructions?: string | null
          proof_count?: number
          proof_examples?: Json | null
          proof_fields?: Json
          proof_type?: string | null
          publisher_id?: string | null
          reward?: number
          status?: string
          title: string
          total_slots?: number
        }
        Update: {
          banner_url?: string | null
          category?: string | null
          completed_slots?: number
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          instructions?: string | null
          proof_count?: number
          proof_examples?: Json | null
          proof_fields?: Json
          proof_type?: string | null
          publisher_id?: string | null
          reward?: number
          status?: string
          title?: string
          total_slots?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_publisher_id_fkey"
            columns: ["publisher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
      admin_reject_task_with_refund: {
        Args: { p_reason?: string; p_task_id: string }
        Returns: undefined
      }
      auto_approve_stale_submissions: { Args: never; Returns: number }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      gen_referral_code: { Args: never; Returns: string }
      get_my_referrals: {
        Args: never
        Returns: {
          created_at: string
          id: string
          status: string
          username: string
        }[]
      }
      get_site_theme: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      notify_admins: {
        Args: { p_message: string; p_title: string; p_type: string }
        Returns: undefined
      }
      publish_task_with_charge: {
        Args: {
          p_banner_url: string
          p_category: string
          p_description: string
          p_instructions: string
          p_proof_count: number
          p_proof_fields: Json
          p_proof_type: string
          p_reward: number
          p_title: string
          p_total_slots: number
        }
        Returns: string
      }
      publisher_cancel_task: { Args: { p_task_id: string }; Returns: Json }
      publisher_review_submission: {
        Args: { p_approve: boolean; p_reason?: string; p_submission_id: string }
        Returns: undefined
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      set_withdrawal_destination: {
        Args: { p_account: string; p_method: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
