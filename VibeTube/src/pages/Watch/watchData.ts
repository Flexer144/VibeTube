import { supabase } from "../../shared/lib/supabase";

// Запросы страницы просмотра. Типы выводятся из самих запросов — при изменении
// списка колонок TypeScript подскажет, где поправить компоненты.

export const fetchWatchVideo = (id: string) =>
  supabase
    .from("videos")
    .select(`
      id, title, description, video_url, thumbnail_url, views, created_at, author_id, duration,
      profiles(username, avatar_url),
      video_genres(
        genres(name, id)
      )
    `)
    .eq("id", id)
    .maybeSingle();

export const fetchRecommended = (excludeId: string) =>
  supabase
    .from("videos")
    .select(`
      id,
      title,
      thumbnail_url,
      views,
      created_at,
      profiles(id, username, avatar_url)
    `)
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(20);

export type WatchVideo = NonNullable<Awaited<ReturnType<typeof fetchWatchVideo>>["data"]>;
export type RecommendedVideo = NonNullable<Awaited<ReturnType<typeof fetchRecommended>>["data"]>[number];
