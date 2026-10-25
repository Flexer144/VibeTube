// Сгенерировано из схемы Supabase (supabase gen types typescript). Не редактировать вручную —
// после изменения схемы перегенерировать:
//   npx supabase gen types typescript --project-id itubaphgpfylrvqhbgff > src/shared/types/database.ts

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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_requests: {
        Row: {
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          user_id?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          created_at: string | null
          id: string
          parent_id: string | null
          text: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          parent_id?: string | null
          text: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          parent_id?: string | null
          text?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "video_search_view"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "video_search_view"
            referencedColumns: ["author_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          role: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          role?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          role?: string
          username?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          channel_id: string | null
          created_at: string | null
          id: string
          subscriber_id: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          id?: string
          subscriber_id?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          id?: string
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "video_search_view"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "subscriptions_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "video_search_view"
            referencedColumns: ["author_id"]
          },
        ]
      }
      video_genres: {
        Row: {
          genre_id: string | null
          id: string
          video_id: string | null
        }
        Insert: {
          genre_id?: string | null
          id?: string
          video_id?: string | null
        }
        Update: {
          genre_id?: string | null
          id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_genres_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_genres_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          author_id: string | null
          created_at: string | null
          description: string | null
          duration: string | null
          id: string
          thumbnail_url: string | null
          title: string
          video_url: string
          views: number | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          thumbnail_url?: string | null
          title: string
          video_url: string
          views?: number | null
        }
        Update: {
          author_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          video_url?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_author_id_fk"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_author_id_fk"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "video_search_view"
            referencedColumns: ["author_id"]
          },
        ]
      }
      watch_history: {
        Row: {
          id: string
          user_id: string
          video_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          video_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_history_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      video_search_view: {
        Row: {
          author_avatar: string | null
          author_id: string | null
          author_username: string | null
          created_at: string | null
          description: string | null
          duration: string | null
          fts_column: unknown
          genre_ids: string[] | null
          genre_names: string[] | null
          id: string | null
          search_genres_string: string | null
          thumbnail_url: string | null
          title: string | null
          video_url: string | null
          views: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      increment_views: { Args: { video_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

/** Строка таблицы или представления: Tables<"videos">, Tables<"video_search_view"> */
export type Tables<Name extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])> =
  (PublicSchema["Tables"] & PublicSchema["Views"])[Name] extends { Row: infer R } ? R : never

export type TablesInsert<Name extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][Name]["Insert"]

export type TablesUpdate<Name extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][Name]["Update"]
