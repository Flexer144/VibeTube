import { useEffect, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import { useAuth } from "../../../app/providers/AuthProvider";
import CommentForm from "./CommentForm";
import { timeAgo } from "../../../shared/utils/timeAgo";
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from "lucide-react";
import '../StyleWatch/CommentStyle.css';

export default function CommentItem({
  comment,
  videoId,
  onCommentAdded,
}: {
  comment: any;
  videoId: string;
  onCommentAdded?: () => void;
}) {
  const { user } = useAuth();

  const [likes, setLikes] = useState<number>(0);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false); // Визуальный дизлайк
  const [showReplyForm, setShowReplyForm] = useState(false);
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
    if (onCommentAdded) onCommentAdded(); // Обновляем общий счетчик, если нужно
  };

  // ---------- лайк ----------
  const toggleLike = async () => {
    if (!user) return alert("Войдите, чтобы ставить оценки");

    if (liked) {
      await supabase
        .from("comment_likes")
        .delete()
        .match({ user_id: user.id, comment_id: comment.id });
      setLiked(false);
      setLikes(prev => prev - 1);
    } else {
      await supabase.from("comment_likes").insert({
        user_id: user.id,
        comment_id: comment.id,
      });
      setLiked(true);
      setLikes(prev => prev + 1);
      if (disliked) setDisliked(false);
    }
  };

  const toggleDislike = () => {
    if (!user) return alert("Войдите, чтобы ставить оценки");
    if (disliked) {
      setDisliked(false);
    } else {
      setDisliked(true);
      if (liked) toggleLike(); // Убираем лайк, если ставим дизлайк
    }
  };

  // ---------- ответы ----------
  const fetchReplies = async () => {
    const { data } = await supabase
      .from("comments")
      .select(`*, profiles(username, avatar_url)`)
      .eq("parent_id", comment.id)
      .order("created_at");

    setReplies(data || []);
  };

  useEffect(() => {
    fetchLikes();
    fetchReplies();
  }, [refresh]);

  return (
    <div className="comment-item">
      {/* Аватарка автора комментария */}
      <div className="comment-avatar-container">
        <img 
          src={comment.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${comment.profiles?.username || 'User'}`} 
          alt="avatar" 
          className="comment-user-avatar"
        />
      </div>

      {/* Основной контент */}
      <div className="comment-content-container">
        {/* Заголовок (Имя + Время) */}
        <div className="comment-header">
          <span className="comment-author-name">
            {comment.profiles?.username || "Пользователь"}
          </span>
          <span className="comment-time">
            {timeAgo(comment.created_at)}
          </span>
        </div>

        {/* Текст */}
        <div className="comment-text">
          {comment.text}
        </div>

        {/* Панель действий */}
        <div className="comment-actions">
          <button className={`comment-action-btn ${liked ? 'active' : ''}`} onClick={toggleLike}>
            <ThumbsUp size={16} fill={liked ? "#f1f1f1" : "transparent"} />
            {likes > 0 && <span className="action-count">{likes}</span>}
          </button>

          <button className={`comment-action-btn ${disliked ? 'active' : ''}`} onClick={toggleDislike}>
            <ThumbsDown size={16} fill={disliked ? "#f1f1f1" : "transparent"} />
          </button>

          <button className="comment-reply-btn" onClick={() => setShowReplyForm(!showReplyForm)}>
            Ответить
          </button>
        </div>

        {/* Форма ответа */}
        {showReplyForm && (
          <CommentForm
            videoId={videoId}
            parentId={comment.id}
            onCommentAdded={refreshReplies}
            onCancel={() => setShowReplyForm(false)}
          />
        )}

        {/* Кнопка Показать/Скрыть ответы */}
        {replies.length > 0 && (
          <div className="comment-replies-toggle">
            <button 
              className="show-replies-btn" 
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              <span>{replies.length} ответ{replies.length > 1 ? 'а/ов' : ''}</span>
            </button>
          </div>
        )}

        {/* Вложенные ответы */}
        {showReplies && (
          <div className="comment-replies-list">
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
    </div>
  );
}