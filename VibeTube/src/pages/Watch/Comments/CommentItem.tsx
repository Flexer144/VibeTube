import { useEffect, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import { useAuth } from "../../../app/providers/AuthProvider";
import CommentForm from "./CommentForm";

export default function CommentItem({
  comment,
  videoId,
}: any) {
  const { user } = useAuth();

  const [likes, setLikes] = useState<number>(0);
  const [liked, setLiked] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);

  // ---------- загрузка лайков ----------
  const fetchLikes = async () => {
    const { data } = await supabase
      .from("comment_likes")
      .select("*")
      .eq("comment_id", comment.id);

    setLikes(data?.length ?? 0);

    if (user) {
      setLiked(data?.some((l) => l.user_id === user.id) ?? false);
    }
  };

  // ---------- лайк ----------
  const toggleLike = async () => {
    if (!user) return;

    if (liked) {
      await supabase
        .from("comment_likes")
        .delete()
        .match({ user_id: user.id, comment_id: comment.id });
    } else {
      await supabase.from("comment_likes").insert({
        user_id: user.id,
        comment_id: comment.id,
      });
    }

    fetchLikes();
  };

  // ---------- ответы ----------
  const fetchReplies = async () => {
    const { data } = await supabase
      .from("comments")
      .select(`*, profiles(username)`)
      .eq("parent_id", comment.id)
      .order("created_at");

    setReplies(data || []);
  };

  useEffect(() => {
    fetchLikes();
    fetchReplies();
  }, []);

  return (
    <div style={{ marginBottom: 15 }}>
      <b>{comment.profiles?.username}</b>
      <p>{comment.text}</p>

      <button onClick={toggleLike}>
        👍 {likes}
      </button>

      <button onClick={() => setShowReply(!showReply)}>
        Ответить
      </button>

      {showReply && (
        <CommentForm videoId={videoId} parentId={comment.id} />
      )}

      {/* ответы */}
      <div style={{ marginLeft: 20 }}>
        {replies.map((r) => (
          <CommentItem
            key={r.id}
            comment={r}
            videoId={videoId}
          />
        ))}
      </div>
    </div>
  );
}
