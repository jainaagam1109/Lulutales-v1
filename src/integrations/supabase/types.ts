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
      child_profiles: {
        Row: {
          age: number
          city: string | null
          companion: string | null
          created_at: string
          family_address_terms: string | null
          family_members: string | null
          family_type: string | null
          favourite_place: string | null
          gender: string | null
          home_type: string | null
          id: string
          last_active_at: string | null
          last_occasion: string | null
          last_theme: string | null
          name: string
          personality: string | null
          sibling_age: number | null
          status: Database["public"]["Enums"]["profile_status"]
          user_id: string
        }
        Insert: {
          age: number
          city?: string | null
          companion?: string | null
          created_at?: string
          family_address_terms?: string | null
          family_members?: string | null
          family_type?: string | null
          favourite_place?: string | null
          gender?: string | null
          home_type?: string | null
          id?: string
          last_active_at?: string | null
          last_occasion?: string | null
          last_theme?: string | null
          name: string
          personality?: string | null
          sibling_age?: number | null
          status?: Database["public"]["Enums"]["profile_status"]
          user_id: string
        }
        Update: {
          age?: number
          city?: string | null
          companion?: string | null
          created_at?: string
          family_address_terms?: string | null
          family_members?: string | null
          family_type?: string | null
          favourite_place?: string | null
          gender?: string | null
          home_type?: string | null
          id?: string
          last_active_at?: string | null
          last_occasion?: string | null
          last_theme?: string | null
          name?: string
          personality?: string | null
          sibling_age?: number | null
          status?: Database["public"]["Enums"]["profile_status"]
          user_id?: string
        }
        Relationships: []
      }
      episodes: {
        Row: {
          audio_url: string | null
          created_at: string
          description: string | null
          duration: number | null
          episode_number: number
          id: string
          story_id: string
          title: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          episode_number: number
          id?: string
          story_id: string
          title: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          episode_number?: number
          id?: string
          story_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      playback_progress: {
        Row: {
          completed: boolean
          created_at: string
          duration_seconds: number | null
          episode_id: string | null
          episode_number: number | null
          id: string
          percent: number
          position_seconds: number
          profile_id: string
          story_id: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          duration_seconds?: number | null
          episode_id?: string | null
          episode_number?: number | null
          id?: string
          percent?: number
          position_seconds?: number
          profile_id: string
          story_id: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          duration_seconds?: number | null
          episode_id?: string | null
          episode_number?: number | null
          id?: string
          percent?: number
          position_seconds?: number
          profile_id?: string
          story_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playback_progress_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playback_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playback_progress_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_stories: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          story_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          story_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_stories_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_stories_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          age_group: string | null
          bucket_key: string | null
          child_profile_id: string | null
          created_at: string
          description: string | null
          generation_attempts: number
          generation_params: Json | null
          id: string
          is_featured: boolean
          is_generated: boolean
          owner_profile_id: string | null
          parent_summary: string | null
          scoring_status: string | null
          story_text: string | null
          story_type: string | null
          theme: string | null
          thumbnail: string | null
          title: string
        }
        Insert: {
          age_group?: string | null
          bucket_key?: string | null
          child_profile_id?: string | null
          created_at?: string
          description?: string | null
          generation_attempts?: number
          generation_params?: Json | null
          id?: string
          is_featured?: boolean
          is_generated?: boolean
          owner_profile_id?: string | null
          parent_summary?: string | null
          scoring_status?: string | null
          story_text?: string | null
          story_type?: string | null
          theme?: string | null
          thumbnail?: string | null
          title: string
        }
        Update: {
          age_group?: string | null
          bucket_key?: string | null
          child_profile_id?: string | null
          created_at?: string
          description?: string | null
          generation_attempts?: number
          generation_params?: Json | null
          id?: string
          is_featured?: boolean
          is_generated?: boolean
          owner_profile_id?: string | null
          parent_summary?: string | null
          scoring_status?: string | null
          story_text?: string | null
          story_type?: string | null
          theme?: string | null
          thumbnail?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_analytics: {
        Row: {
          created_at: string
          episode_id: string | null
          event_type: string
          id: string
          position_seconds: number | null
          profile_id: string
          story_id: string
        }
        Insert: {
          created_at?: string
          episode_id?: string | null
          event_type: string
          id?: string
          position_seconds?: number | null
          profile_id: string
          story_id: string
        }
        Update: {
          created_at?: string
          episode_id?: string | null
          event_type?: string
          id?: string
          position_seconds?: number | null
          profile_id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_analytics_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_analytics_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_analytics_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_tags: {
        Row: {
          id: string
          story_id: string
          tag: string
        }
        Insert: {
          id?: string
          story_id: string
          tag: string
        }
        Update: {
          id?: string
          story_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_tags_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_library: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          story_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          story_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_library_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_library_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
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
      can_access_story: { Args: { _story_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      owns_profile: { Args: { _profile_id: string }; Returns: boolean }
      set_active_profile: { Args: { _profile_id: string }; Returns: string }
      soft_delete_profile: { Args: { _profile_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
      profile_status: "active" | "inactive" | "deleted"
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
      profile_status: ["active", "inactive", "deleted"],
    },
  },
} as const
