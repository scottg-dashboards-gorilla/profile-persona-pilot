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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      assessment_action_items: {
        Row: {
          action: string | null
          attempt_id: string | null
          comment: string | null
          created_at: string
          created_by: string | null
          delta_from: number | null
          delta_key: string | null
          delta_kind: string
          delta_to: number | null
          employee_uuid: string
          follow_up_review_id: string | null
          id: string
          review_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action?: string | null
          attempt_id?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          delta_from?: number | null
          delta_key?: string | null
          delta_kind: string
          delta_to?: number | null
          employee_uuid: string
          follow_up_review_id?: string | null
          id?: string
          review_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action?: string | null
          attempt_id?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          delta_from?: number | null
          delta_key?: string | null
          delta_kind?: string
          delta_to?: number | null
          employee_uuid?: string
          follow_up_review_id?: string | null
          id?: string
          review_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_action_items_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_action_items_follow_up_review_id_fkey"
            columns: ["follow_up_review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_action_items_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_attempts: {
        Row: {
          created_at: string
          cycle_id: string | null
          disc_primary: string | null
          disc_scores: Json
          employee_uuid: string
          id: string
          raw_answers: Json | null
          review_id: string | null
          submitted_at: string | null
          taken_at: string
          technical_scores: Json
          tier: string | null
          truthfulness_score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id?: string | null
          disc_primary?: string | null
          disc_scores?: Json
          employee_uuid: string
          id?: string
          raw_answers?: Json | null
          review_id?: string | null
          submitted_at?: string | null
          taken_at?: string
          technical_scores?: Json
          tier?: string | null
          truthfulness_score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string | null
          disc_primary?: string | null
          disc_scores?: Json
          employee_uuid?: string
          id?: string
          raw_answers?: Json | null
          review_id?: string | null
          submitted_at?: string | null
          taken_at?: string
          technical_scores?: Json
          tier?: string | null
          truthfulness_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          changed_fields: Json
          created_at: string
          id: string
          record_id: string | null
          summary: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          changed_fields?: Json
          created_at?: string
          id?: string
          record_id?: string | null
          summary?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          changed_fields?: Json
          created_at?: string
          id?: string
          record_id?: string | null
          summary?: string | null
          table_name?: string
        }
        Relationships: []
      }
      employee_profiles: {
        Row: {
          created_at: string
          disc_profile: Json | null
          elapsed_seconds: number
          employee_name: string
          id: string
          role: string | null
          scores: Json
          truthfulness: Json | null
        }
        Insert: {
          created_at?: string
          disc_profile?: Json | null
          elapsed_seconds?: number
          employee_name: string
          id?: string
          role?: string | null
          scores: Json
          truthfulness?: Json | null
        }
        Update: {
          created_at?: string
          disc_profile?: Json | null
          elapsed_seconds?: number
          employee_name?: string
          id?: string
          role?: string | null
          scores?: Json
          truthfulness?: Json | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          compensations: Json
          created_at: string
          current_annual_comp: number | null
          department: string | null
          email: string | null
          first_name: string
          hire_date: string | null
          last_name: string
          last_synced_at: string
          manager_uuid: string | null
          payment_unit: string | null
          terminated: boolean
          title: string | null
          updated_at: string
          user_id: string | null
          uuid: string
        }
        Insert: {
          compensations?: Json
          created_at?: string
          current_annual_comp?: number | null
          department?: string | null
          email?: string | null
          first_name: string
          hire_date?: string | null
          last_name: string
          last_synced_at?: string
          manager_uuid?: string | null
          payment_unit?: string | null
          terminated?: boolean
          title?: string | null
          updated_at?: string
          user_id?: string | null
          uuid: string
        }
        Update: {
          compensations?: Json
          created_at?: string
          current_annual_comp?: number | null
          department?: string | null
          email?: string | null
          first_name?: string
          hire_date?: string | null
          last_name?: string
          last_synced_at?: string
          manager_uuid?: string | null
          payment_unit?: string | null
          terminated?: boolean
          title?: string | null
          updated_at?: string
          user_id?: string | null
          uuid?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_manager_uuid_fkey"
            columns: ["manager_uuid"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["uuid"]
          },
        ]
      }
      goal_check_ins: {
        Row: {
          created_at: string
          employee_uuid: string
          goal_id: string
          id: string
          note: string | null
          progress_percent: number | null
          review_id: string | null
          source: string
        }
        Insert: {
          created_at?: string
          employee_uuid: string
          goal_id: string
          id?: string
          note?: string | null
          progress_percent?: number | null
          review_id?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          employee_uuid?: string
          goal_id?: string
          id?: string
          note?: string | null
          progress_percent?: number | null
          review_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_check_ins_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_check_ins_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_key_results: {
        Row: {
          created_at: string
          current_value: number
          goal_id: string
          id: string
          metric_type: string
          sort_order: number
          starting_value: number
          target_value: number
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          goal_id: string
          id?: string
          metric_type?: string
          sort_order?: number
          starting_value?: number
          target_value?: number
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          goal_id?: string
          id?: string
          metric_type?: string
          sort_order?: number
          starting_value?: number
          target_value?: number
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_key_results_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string
          created_at: string
          description: string | null
          employee_name: string
          employee_uuid: string
          id: string
          parent_goal_id: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          employee_name: string
          employee_uuid: string
          id?: string
          parent_goal_id?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          employee_name?: string
          employee_uuid?: string
          id?: string
          parent_goal_id?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_parent_goal_id_fkey"
            columns: ["parent_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_notes: {
        Row: {
          content: string
          created_at: string
          employee_profile_id: string
          id: string
          note_type: string
          outcome: string | null
        }
        Insert: {
          content: string
          created_at?: string
          employee_profile_id: string
          id?: string
          note_type?: string
          outcome?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          employee_profile_id?: string
          id?: string
          note_type?: string
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manager_notes_employee_profile_id_fkey"
            columns: ["employee_profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          aggregation_method: string
          assessment_attempt_id: string | null
          comp_adjustment_amount: number | null
          comp_adjustment_percent: number | null
          comp_approval_note: string | null
          comp_approval_status: string
          comp_approved_at: string | null
          comp_approved_by: string | null
          comp_effective_date: string | null
          completed_date: string | null
          created_at: string
          current_annual_comp: number | null
          cycle_id: string | null
          department: string | null
          employee_ack_at: string | null
          employee_ack_comment: string | null
          employee_email: string | null
          employee_name: string
          employee_uuid: string
          hire_date: string | null
          id: string
          manager_review_response: string | null
          manager_review_sent_at: string | null
          new_title: string | null
          notes: string | null
          overall_rating: string | null
          promotion: boolean
          released_at: string | null
          released_by: string | null
          review_cycle: string
          review_type: string
          reviewer_uuid: string | null
          scheduled_date: string
          selected_contributor_versions: Json | null
          self_assessment_response: string | null
          self_assessment_sent_at: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          aggregation_method?: string
          assessment_attempt_id?: string | null
          comp_adjustment_amount?: number | null
          comp_adjustment_percent?: number | null
          comp_approval_note?: string | null
          comp_approval_status?: string
          comp_approved_at?: string | null
          comp_approved_by?: string | null
          comp_effective_date?: string | null
          completed_date?: string | null
          created_at?: string
          current_annual_comp?: number | null
          cycle_id?: string | null
          department?: string | null
          employee_ack_at?: string | null
          employee_ack_comment?: string | null
          employee_email?: string | null
          employee_name: string
          employee_uuid: string
          hire_date?: string | null
          id?: string
          manager_review_response?: string | null
          manager_review_sent_at?: string | null
          new_title?: string | null
          notes?: string | null
          overall_rating?: string | null
          promotion?: boolean
          released_at?: string | null
          released_by?: string | null
          review_cycle?: string
          review_type?: string
          reviewer_uuid?: string | null
          scheduled_date: string
          selected_contributor_versions?: Json | null
          self_assessment_response?: string | null
          self_assessment_sent_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          aggregation_method?: string
          assessment_attempt_id?: string | null
          comp_adjustment_amount?: number | null
          comp_adjustment_percent?: number | null
          comp_approval_note?: string | null
          comp_approval_status?: string
          comp_approved_at?: string | null
          comp_approved_by?: string | null
          comp_effective_date?: string | null
          completed_date?: string | null
          created_at?: string
          current_annual_comp?: number | null
          cycle_id?: string | null
          department?: string | null
          employee_ack_at?: string | null
          employee_ack_comment?: string | null
          employee_email?: string | null
          employee_name?: string
          employee_uuid?: string
          hire_date?: string | null
          id?: string
          manager_review_response?: string | null
          manager_review_sent_at?: string | null
          new_title?: string | null
          notes?: string | null
          overall_rating?: string | null
          promotion?: boolean
          released_at?: string | null
          released_by?: string | null
          review_cycle?: string
          review_type?: string
          reviewer_uuid?: string | null
          scheduled_date?: string
          selected_contributor_versions?: Json | null
          self_assessment_response?: string | null
          self_assessment_sent_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_assessment_attempt_id_fkey"
            columns: ["assessment_attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "review_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_access_tokens: {
        Row: {
          contributor_id: string | null
          created_at: string
          created_by: string | null
          employee_uuid: string
          expires_at: string
          id: string
          kind: string
          last_used_at: string | null
          review_id: string
          revoked: boolean
          token: string
        }
        Insert: {
          contributor_id?: string | null
          created_at?: string
          created_by?: string | null
          employee_uuid: string
          expires_at?: string
          id?: string
          kind: string
          last_used_at?: string | null
          review_id: string
          revoked?: boolean
          token: string
        }
        Update: {
          contributor_id?: string | null
          created_at?: string
          created_by?: string | null
          employee_uuid?: string
          expires_at?: string
          id?: string
          kind?: string
          last_used_at?: string | null
          review_id?: string
          revoked?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_access_tokens_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "review_contributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_access_tokens_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_contributor_versions: {
        Row: {
          contributor_id: string
          created_at: string
          id: string
          improvements: string | null
          rating_collaboration: number | null
          rating_impact: number | null
          rating_overall: number | null
          strengths: string | null
          submitted_at: string
          version: number
        }
        Insert: {
          contributor_id: string
          created_at?: string
          id?: string
          improvements?: string | null
          rating_collaboration?: number | null
          rating_impact?: number | null
          rating_overall?: number | null
          strengths?: string | null
          submitted_at?: string
          version: number
        }
        Update: {
          contributor_id?: string
          created_at?: string
          id?: string
          improvements?: string | null
          rating_collaboration?: number | null
          rating_impact?: number | null
          rating_overall?: number | null
          strengths?: string | null
          submitted_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_contributor_versions_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "review_contributors"
            referencedColumns: ["id"]
          },
        ]
      }
      review_contributors: {
        Row: {
          allow_resubmission: boolean
          anonymous: boolean
          contributor_department: string | null
          contributor_name: string
          contributor_title: string | null
          contributor_uuid: string
          created_at: string
          current_version_id: string | null
          id: string
          improvements: string | null
          invited_at: string
          rating_collaboration: number | null
          rating_impact: number | null
          rating_overall: number | null
          review_id: string
          status: string
          strengths: string | null
          submission_count: number
          submitted_at: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          allow_resubmission?: boolean
          anonymous?: boolean
          contributor_department?: string | null
          contributor_name: string
          contributor_title?: string | null
          contributor_uuid: string
          created_at?: string
          current_version_id?: string | null
          id?: string
          improvements?: string | null
          invited_at?: string
          rating_collaboration?: number | null
          rating_impact?: number | null
          rating_overall?: number | null
          review_id: string
          status?: string
          strengths?: string | null
          submission_count?: number
          submitted_at?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          allow_resubmission?: boolean
          anonymous?: boolean
          contributor_department?: string | null
          contributor_name?: string
          contributor_title?: string | null
          contributor_uuid?: string
          created_at?: string
          current_version_id?: string | null
          id?: string
          improvements?: string | null
          invited_at?: string
          rating_collaboration?: number | null
          rating_impact?: number | null
          rating_overall?: number | null
          review_id?: string
          status?: string
          strengths?: string | null
          submission_count?: number
          submitted_at?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_contributors_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "review_contributor_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_contributors_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_cycles: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string
          id: string
          name: string
          question_template: Json | null
          review_types: string[]
          scope_type: string
          scope_value: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at: string
          id?: string
          name: string
          question_template?: Json | null
          review_types?: string[]
          scope_type?: string
          scope_value?: string | null
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          name?: string
          question_template?: Json | null
          review_types?: string[]
          scope_type?: string
          scope_value?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      review_self_assessments: {
        Row: {
          challenges: string | null
          created_at: string
          employee_uuid: string
          growth: string | null
          id: string
          review_id: string
          submitted_at: string | null
          support_needed: string | null
          updated_at: string
          wins: string | null
        }
        Insert: {
          challenges?: string | null
          created_at?: string
          employee_uuid: string
          growth?: string | null
          id?: string
          review_id: string
          submitted_at?: string | null
          support_needed?: string | null
          updated_at?: string
          wins?: string | null
        }
        Update: {
          challenges?: string | null
          created_at?: string
          employee_uuid?: string
          growth?: string | null
          id?: string
          review_id?: string
          submitted_at?: string | null
          support_needed?: string | null
          updated_at?: string
          wins?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_self_assessments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      role_configs: {
        Row: {
          created_at: string
          description: string
          dimension_ids: Json
          id: string
          includes_technical: boolean
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          dimension_ids?: Json
          id: string
          includes_technical?: boolean
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          dimension_ids?: Json
          id?: string
          includes_technical?: boolean
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      acknowledge_review: {
        Args: { _comment?: string; _review_id: string }
        Returns: Json
      }
      create_review_token: {
        Args: {
          _contributor_id?: string
          _days?: number
          _kind: string
          _review_id: string
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
      is_attempt_manager: { Args: { _attempt_id: string }; Returns: boolean }
      is_employee_manager: {
        Args: { _employee_uuid: string }
        Returns: boolean
      }
      is_review_contributor: {
        Args: { _contributor_id: string }
        Returns: boolean
      }
      is_review_manager: { Args: { _review_id: string }; Returns: boolean }
      is_self_employee: { Args: { _employee_uuid: string }; Returns: boolean }
      resolve_review_token: { Args: { _token: string }; Returns: Json }
      submit_contributor_feedback: {
        Args: {
          _collaboration: number
          _impact: number
          _improvements: string
          _overall: number
          _strengths: string
          _token: string
        }
        Returns: Json
      }
      submit_self_assessment: {
        Args: {
          _challenges: string
          _checkin_notes?: Json
          _growth: string
          _kr_updates?: Json
          _support: string
          _token: string
          _wins: string
        }
        Returns: Json
      }
      sync_cycle_reviews: { Args: { _cycle_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "hr" | "manager"
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
      app_role: ["admin", "hr", "manager"],
    },
  },
} as const
