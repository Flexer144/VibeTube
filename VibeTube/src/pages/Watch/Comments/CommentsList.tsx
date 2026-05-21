import { useEffect, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import CommentItem from "./CommentItem";
import CommentForm from "./CommentForm";
import { ListFilter, X } from "lucide-react"; // Добавили X (крестик)
import { pluralize } from "../../../shared/lib/pluralize";
import '../StyleWatch/CommentStyle.css';

export default function CommentsList({
  videoId,
  refresh,
}: {
  videoId: string;
  refresh?: number;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [totalCommentsCount, setTotalCommentsCount] = useState<number>(0);
  
  // Состояние для мобильного модального окна
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select(`*, profiles(username, avatar_url)`)
      .eq("video_id", videoId)
      .is("parent_id", null)
      .order("created_at", { ascending: false });

    setComments(data || []);
  };

  const fetchTotalCount = async () => {
    const { count, error } = await supabase
      .from("comments")
      .select('*', { count: 'exact', head: true })
      .eq("video_id", videoId);
      
    if (!error && count !== null) {
      setTotalCommentsCount(count);
    }
  };

  useEffect(() => {
    fetchComments();
    fetchTotalCount();

    const channel = supabase
      .channel("comments-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `video_id=eq.${videoId}`,
        },
        () => {
          fetchComments();
          fetchTotalCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId, refresh]);

  // Блокировка скролла страницы, когда мобильная шторка открыта
  useEffect(() => {
    if (isModalOpen && window.innerWidth <= 500) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  // Берем самый первый комментарий для показа в тизере
  const previewComment = comments.length > 0 ? comments[0] : null;

  return (
    <div className={`comments-section-wrapper ${isModalOpen ? 'modal-open' : ''}`}>
      
      {/* 1. БЛОК-ТИЗЕР (ПОЯВЛЯЕТСЯ ТОЛЬКО НА ТЕЛЕФОНАХ) */}
      <div className="comments-mobile-teaser" onClick={() => setIsModalOpen(true)}>
        <div className="teaser-header">
          <span className="teaser-title">Комментарии</span>
          <span className="teaser-count">{totalCommentsCount}</span>
        </div>
        {previewComment ? (
          <div className="teaser-preview">
            <img 
              src={previewComment.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${previewComment.profiles?.username}`} 
              alt="avatar" 
              className="teaser-avatar" 
            />
            <span className="teaser-text">{previewComment.text}</span>
          </div>
        ) : (
          <div className="teaser-preview">
             <span className="teaser-text" style={{color: '#888'}}>Оставьте первый комментарий...</span>
          </div>
        )}
      </div>

      {/* ТЕМНЫЙ ФОН ПРИ ОТКРЫТОЙ ШТОРКЕ */}
      {isModalOpen && (
        <div className="comments-mobile-overlay" onClick={() => setIsModalOpen(false)}></div>
      )}

      {/* 2. ОСНОВНОЙ КОНТЕЙНЕР (НА ПК - ОБЫЧНЫЙ, НА ТЕЛЕФОНЕ - ШТОРКА) */}
      <div className="comments-main-container">
        
        {/* ШАПКА ШТОРКИ С КРЕСТИКОМ (ТОЛЬКО НА ТЕЛЕФОНАХ) */}
        <div className="comments-modal-header">
          <span className="modal-title">Комментарии</span>
          <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
            <X size={24} color="#f1f1f1" />
          </button>
        </div>

        {/* СТАНДАРТНАЯ ШАПКА ДЛЯ ПК */}
        <div className="comments-header-row">
          <h3 className="comments-count">
            {totalCommentsCount} {pluralize(totalCommentsCount, ['Комментарий', 'Комментария', 'Комментариев'])}
          </h3>
          <div className="comments-sort-btn">
            <ListFilter size={20} />
            <span>Упорядочить</span>
          </div>
        </div>

        {/* ЗОНА ПРОКРУТКИ ВНУТРИ ШТОРКИ */}
        <div className="comments-scrollable-area">
          <CommentForm 
            videoId={videoId} 
            onCommentAdded={() => {
                fetchComments();
                fetchTotalCount();
            }} 
          />

          <div className="comments-list-container">
            {comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                videoId={videoId}
                onCommentAdded={fetchComments}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}