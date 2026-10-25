import { supabase } from "../../../shared/lib/supabase";

export type CommentData = {
  id: string;
  text: string;
  created_at: string | null;
  user_id: string;
  parent_id: string | null;
  author: { username: string | null; avatar_url: string | null } | null;
  likesCount: number;
  replies: CommentData[];
};

/**
 * Загружает ВСЕ комментарии видео одним запросом (вместе с числом лайков)
 * и собирает дерево на клиенте. Раньше каждый комментарий делал свои запросы — N+1.
 */
export const fetchCommentTree = async (videoId: string) => {
  const { data, error } = await supabase
    .from("comments")
    .select("id, text, created_at, user_id, parent_id, profiles(username, avatar_url), comment_likes(count)")
    .eq("video_id", videoId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const byId = new Map<string, CommentData>();
  for (const row of data ?? []) {
    byId.set(row.id, {
      id: row.id,
      text: row.text,
      created_at: row.created_at,
      user_id: row.user_id,
      parent_id: row.parent_id,
      author: row.profiles,
      likesCount: row.comment_likes[0]?.count ?? 0,
      replies: [],
    });
  }

  const roots: CommentData[] = [];
  for (const comment of byId.values()) {
    const parent = comment.parent_id ? byId.get(comment.parent_id) : undefined;
    if (parent) parent.replies.push(comment);
    else roots.push(comment);
  }

  return { roots, total: byId.size, ids: [...byId.keys()] };
};

/** id комментариев из списка, которые лайкнул пользователь — одним запросом */
export const fetchLikedCommentIds = async (userId: string, commentIds: string[]) => {
  if (commentIds.length === 0) return new Set<string>();

  const { data } = await supabase
    .from("comment_likes")
    .select("comment_id")
    .eq("user_id", userId)
    .in("comment_id", commentIds);

  return new Set((data ?? []).map((row) => row.comment_id).filter((id): id is string => !!id));
};
