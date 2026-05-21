import { useState, useRef, useEffect } from "react";
import { supabase } from "../../../shared/lib/supabase";
import { useAuth } from "../../../app/providers/AuthProvider";
import '../StyleWatch/CommentStyle.css';

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
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Получаем аватарку текущего юзера
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url, username")
          .eq("id", user.id)
          .single();
        setUserProfile(data);
      };
      fetchProfile();
    }
  }, [user]);

  // Автоматическая высота для textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [text]);

  const sendComment = async () => {
    if (!text.trim() || !user) return;

    setLoading(true);

    await supabase.from("comments").insert({
      user_id: user.id,
      video_id: videoId,
      parent_id: parentId ?? null,
      text,
    });

    setText("");
    setIsFocused(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px"; // Сбрасываем высоту
    }

    if (onCommentAdded) onCommentAdded();
    if (onCancel) onCancel(); // Закрываем форму ответа после отправки

    setLoading(false);
  };

  const handleCancel = () => {
    setText("");
    setIsFocused(false);
    if (textareaRef.current) textareaRef.current.style.height = "24px";
    if (onCancel) onCancel(); // Если это форма ответа, скрываем её
  };

  if (!user) return <div className="comment-login-prompt">Войдите, чтобы оставить комментарий</div>;

  return (
    <div className={`comment-form-container ${parentId ? 'reply-form' : 'main-form'}`}>
      <img 
        src={userProfile?.avatar_url || `https://ui-avatars.com/api/?name=${userProfile?.username || 'User'}`} 
        alt="User avatar" 
        className="comment-user-avatar"
      />
      <div className="comment-input-wrapper">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={parentId ? "Добавьте ответ..." : "Введите комментарий..."}
          className="comment-textarea"
          rows={1}
        />
        <div className={`comment-input-underline ${isFocused ? 'active' : ''}`}></div>
        
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
              {parentId ? "Ответить" : "Оставить комментарий"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}