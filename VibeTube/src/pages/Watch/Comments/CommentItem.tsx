import { useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import { useAuth } from "../../../app/providers/AuthProvider";
import CommentForm from "./CommentForm";
import { timeAgo } from "../../../shared/utils/timeAgo";
import { pluralize } from "../../../shared/lib/pluralize";
import Avatar from "../../../shared/ui/Avatar/Avatar";
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from "lucide-react";
import type { CommentData } from "./commentsData";
import '../StyleWatch/CommentStyle.css';

interface Props {
  comment: CommentData;
  videoId: string;
  likedIds: Set<string>;
  onLikeChange: (commentId: string, liked: boolean) => void;
  onCommentAdded: () => void;
}

export default function CommentItem({ comment, videoId, likedIds, onLikeChange, onCommentAdded }: Props) {
  const { user } = useAuth();

  const liked = likedIds.has(comment.id);
  // Сдвиг счётчика относительно значения с сервера — для мгновенного отклика.
  // Привязан к base: когда придёт свежий счётчик с сервера, сдвиг автоматически обнулится
  const [likeShift, setLikeShift] = useState({ base: comment.likesCount, delta: 0 });
  const likesDelta = likeShift.base === comment.likesCount ? likeShift.delta : 0;
  const setLikesDelta = (update: (d: number) => number) =>
    setLikeShift((prev) => ({
      base: comment.likesCount,
      delta: update(prev.base === comment.likesCount ? prev.delta : 0),
    }));
  const [isLikePending, setIsLikePending] = useState(false);
  const [disliked, setDisliked] = useState(false); // Визуальный дизлайк
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const likes = Math.max(0, comment.likesCount + likesDelta);
  const replies = comment.replies;

  // ---------- лайк (оптимистично: сразу меняем UI, при ошибке откатываем) ----------
  const toggleLike = async () => {
    if (!user || isLikePending) return;

    const nextLiked = !liked;
    setIsLikePending(true);
    onLikeChange(comment.id, nextLiked);
    setLikesDelta((d) => d + (nextLiked ? 1 : -1));
    if (nextLiked) setDisliked(false);

    const { error } = nextLiked
      ? await supabase.from("comment_likes").insert({ user_id: user.id, comment_id: comment.id })
      : await supabase.from("comment_likes").delete().match({ user_id: user.id, comment_id: comment.id });

    if (error) {
      console.error("Не удалось изменить лайк:", error);
      onLikeChange(comment.id, liked);
      setLikesDelta((d) => d - (nextLiked ? 1 : -1));
    }
    setIsLikePending(false);
  };

  const toggleDislike = () => {
    if (!user) return;
    if (disliked) {
      setDisliked(false);
    } else {
      setDisliked(true);
      if (liked) toggleLike(); // Убираем лайк, если ставим дизлайк
    }
  };

  const handleReplyAdded = () => {
    setShowReplies(true);
    onCommentAdded();
  };

  return (
    <div className="comment-item">
      {/* Аватарка автора комментария */}
      <div className="comment-avatar-container">
        <Avatar src={comment.author?.avatar_url} name={comment.author?.username} className="comment-user-avatar" />
      </div>

      {/* Основной контент */}
      <div className="comment-content-container">
        {/* Заголовок (Имя + Время) */}
        <div className="comment-header">
          <span className="comment-author-name">
            {comment.author?.username || "Пользователь"}
          </span>
          {comment.created_at && (
            <span className="comment-time">
              {timeAgo(comment.created_at)}
            </span>
          )}
        </div>

        {/* Текст */}
        <div className="comment-text">
          {comment.text}
        </div>

        {/* Панель действий */}
        <div className="comment-actions">
          <button
            className={`comment-action-btn ${liked ? 'active' : ''}`}
            onClick={toggleLike}
            disabled={!user}
            aria-pressed={liked}
            aria-label="Нравится"
          >
            <ThumbsUp size={16} fill={liked ? "#f1f1f1" : "transparent"} />
            {likes > 0 && <span className="action-count">{likes}</span>}
          </button>

          <button
            className={`comment-action-btn ${disliked ? 'active' : ''}`}
            onClick={toggleDislike}
            disabled={!user}
            aria-pressed={disliked}
            aria-label="Не нравится"
          >
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
            onCommentAdded={handleReplyAdded}
            onCancel={() => setShowReplyForm(false)}
          />
        )}

        {/* Кнопка Показать/Скрыть ответы */}
        {replies.length > 0 && (
          <div className="comment-replies-toggle">
            <button
              className="show-replies-btn"
              onClick={() => setShowReplies(!showReplies)}
              aria-expanded={showReplies}
            >
              {showReplies ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              <span>{replies.length} {pluralize(replies.length, ['ответ', 'ответа', 'ответов'])}</span>
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
                likedIds={likedIds}
                onLikeChange={onLikeChange}
                onCommentAdded={onCommentAdded}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
