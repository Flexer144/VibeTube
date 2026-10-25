import { useState, useRef, useEffect } from "react";
import { supabase } from "../../../shared/lib/supabase";
import { useAuth } from "../../../app/providers/AuthProvider";
import Avatar from "../../../shared/ui/Avatar/Avatar";
import '../StyleWatch/CommentStyle.css';

const MAX_COMMENT_LENGTH = 2000;

export default function CommentForm({
  videoId,
  parentId,
  onCommentAdded,
  onCancel // Функция для закрытия формы (нужна для ответов)
}: {
  videoId: string;
  parentId?: string | null;
  onCommentAdded?: () => void;
  onCancel?: () => void;
}) {
  const { user, profile } = useAuth();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Автоматическая высота для textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [text]);

  const resetForm = () => {
    setText("");
    setIsFocused(false);
    setError(null);
    if (textareaRef.current) textareaRef.current.style.height = "24px"; // Сбрасываем высоту
  };

  const sendComment = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || loading) return;

    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from("comments").insert({
      user_id: user.id,
      video_id: videoId,
      parent_id: parentId ?? null,
      text: trimmed,
    });

    setLoading(false);

    // Текст не стираем, чтобы пользователь не потерял написанное
    if (insertError) {
      console.error("Не удалось отправить комментарий:", insertError);
      setError("Не удалось отправить комментарий. Попробуйте ещё раз.");
      return;
    }

    resetForm();
    onCommentAdded?.();
    onCancel?.(); // Закрываем форму ответа после отправки
  };

  const handleCancel = () => {
    resetForm();
    onCancel?.(); // Если это форма ответа, скрываем её
  };

  if (!user) return <div className="comment-login-prompt">Войдите, чтобы оставить комментарий</div>;

  return (
    <div className={`comment-form-container ${parentId ? 'reply-form' : 'main-form'}`}>
      <Avatar src={profile?.avatar_url} name={profile?.username} className="comment-user-avatar" />
      <div className="comment-input-wrapper">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={(e) => {
            // Ctrl/Cmd + Enter — отправить
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              sendComment();
            }
          }}
          placeholder={parentId ? "Добавьте ответ..." : "Введите комментарий..."}
          className="comment-textarea"
          rows={1}
          maxLength={MAX_COMMENT_LENGTH}
          aria-label={parentId ? "Текст ответа" : "Текст комментария"}
          autoFocus={!!parentId}
        />
        <div className={`comment-input-underline ${isFocused ? 'active' : ''}`}></div>

        {error && <div className="comment-form-error" role="alert">{error}</div>}

        {/* Кнопки появляются только при фокусе, наличии текста или если это форма ответа */}
        {(isFocused || text || parentId) && (
          <div className="comment-actions-row">
            <button className="comment-cancel-btn" onClick={handleCancel}>
              Отмена
            </button>
            <button
              className={`comment-submit-btn ${text.trim() ? 'active' : ''}`}
              onClick={sendComment}
              disabled={loading || !text.trim()}
            >
              {loading ? "Отправка..." : parentId ? "Ответить" : "Оставить комментарий"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
