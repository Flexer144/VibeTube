import { useEffect, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import { useAuth } from "../../../app/providers/AuthProvider";
import CommentForm from "./CommentForm";
import { timeAgo } from "../../../shared/utils/timeAgo";
import '../../../styles/CommentsStyle.css';


export default function CommentItem({
  comment,
  videoId,
  // onCommentAdded,
}: {
  comment: any;
  videoId: string;
  onCommentAdded?: () => void;
}) {
  const { user } = useAuth();

  const [likes, setLikes] = useState<number>(0);
  const [liked, setLiked] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [showReplies, setShowReplies] = useState(false);

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

  const refreshReplies = () => {
    setRefresh((r) => r + 1);
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
  }, [refresh]);

  return (
    <div className="comment-item" style={{ marginBottom: 15 }}>

      {/* header */}
      <div className="comment-header">
        <b>{comment.profiles?.username}</b>

        <span className="comment-time">
          {timeAgo(comment.created_at)}
        </span>
      </div>

      {/* текст */}
      <p>{comment.text}</p>

      {/* действия */}
      <div className="comment-actions">

        <button onClick={toggleLike}>
          👍 {likes}
        </button>

        <button onClick={() => setShowReply(!showReply)}>
          Ответить
        </button>

      </div>


      {/* форма ответа */}
      {showReply && (
        <CommentForm
          videoId={videoId}
          parentId={comment.id}
          onCommentAdded={refreshReplies}
        />
      )}

      {/* кнопка показать ответы */}
      {replies.length > 0 && (
        <button
          className="show-replies-btn"
          onClick={() => setShowReplies(!showReplies)}
        >
          {showReplies
            ? "Скрыть ответы"
            : `Показать ответы (${replies.length})`}
        </button>
      )}

      {/* ответы */}
      {showReplies && (
        <div
          className="comment-replies"
          style={{ marginLeft: 30 }}
        >
          {replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              videoId={videoId}
              onCommentAdded={refreshReplies}
            />
          ))}
        </div>
      )}

    </div>
  );
}
