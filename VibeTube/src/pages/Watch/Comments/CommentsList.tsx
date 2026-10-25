import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import { useAuth } from "../../../app/providers/AuthProvider";
import CommentItem from "./CommentItem";
import CommentForm from "./CommentForm";
import Avatar from "../../../shared/ui/Avatar/Avatar";
import { ListFilter, X } from "lucide-react";
import { pluralize } from "../../../shared/lib/pluralize";
import { fetchCommentTree, fetchLikedCommentIds, type CommentData } from "./commentsData";
import '../StyleWatch/CommentStyle.css';

type SortMode = "new" | "top";

/** Дерево комментариев + какие из них лайкнул текущий пользователь (2 запроса на всё видео) */
const fetchCommentsState = async (videoId: string, userId: string | undefined) => {
  const { roots, total, ids } = await fetchCommentTree(videoId);
  const liked = userId ? await fetchLikedCommentIds(userId, ids) : new Set<string>();
  return { roots, total, liked };
};

export default function CommentsList({ videoId }: { videoId: string }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [comments, setComments] = useState<CommentData[]>([]);
  const [totalCommentsCount, setTotalCommentsCount] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>("new");

  // Состояние для мобильного модального окна
  const [isModalOpen, setIsModalOpen] = useState(false);

  // isStale — чтобы ответ по старому видео/пользователю не перезаписал актуальные данные
  const loadComments = useCallback((isStale: () => boolean = () => false) =>
    fetchCommentsState(videoId, userId)
      .then(({ roots, total, liked }) => {
        if (isStale()) return;
        setComments(roots);
        setTotalCommentsCount(total);
        setLikedIds(liked);
      })
      .catch((error) => console.error("Не удалось загрузить комментарии:", error)),
  [videoId, userId]);

  useEffect(() => {
    let isCancelled = false;
    const isStale = () => isCancelled;
    loadComments(isStale);

    // Имя канала уникально для видео — иначе при переходе между видео подписки путаются
    const channel = supabase
      .channel(`comments-${videoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `video_id=eq.${videoId}`,
        },
        () => loadComments(isStale)
      )
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }, [videoId, loadComments]);

  // Блокировка скролла страницы, когда мобильная шторка открыта
  useEffect(() => {
    if (isModalOpen && window.innerWidth <= 500) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  // Сортировка только верхнего уровня; ответы всегда по порядку
  const sortedComments = useMemo(() => {
    const list = [...comments];
    if (sortMode === "top") {
      list.sort((a, b) => b.likesCount - a.likesCount || (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    } else {
      list.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    }
    return list;
  }, [comments, sortMode]);

  const handleLikeChange = useCallback((commentId: string, liked: boolean) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (liked) next.add(commentId); else next.delete(commentId);
      return next;
    });
  }, []);

  // Берем самый свежий комментарий для показа в тизере
  const previewComment = sortedComments[0] ?? null;

  return (
    <div className={`comments-section-wrapper ${isModalOpen ? 'modal-open' : ''}`}>

      {/* 1. БЛОК-ТИЗЕР (ПОЯВЛЯЕТСЯ ТОЛЬКО НА ТЕЛЕФОНАХ) */}
      <button type="button" className="comments-mobile-teaser" onClick={() => setIsModalOpen(true)}>
        <div className="teaser-header">
          <span className="teaser-title">Комментарии</span>
          <span className="teaser-count">{totalCommentsCount}</span>
        </div>
        {previewComment ? (
          <div className="teaser-preview">
            <Avatar src={previewComment.author?.avatar_url} name={previewComment.author?.username} className="teaser-avatar" />
            <span className="teaser-text">{previewComment.text}</span>
          </div>
        ) : (
          <div className="teaser-preview">
             <span className="teaser-text" style={{color: '#888'}}>Оставьте первый комментарий...</span>
          </div>
        )}
      </button>

      {/* ТЕМНЫЙ ФОН ПРИ ОТКРЫТОЙ ШТОРКЕ */}
      {isModalOpen && (
        <div className="comments-mobile-overlay" onClick={() => setIsModalOpen(false)}></div>
      )}

      {/* 2. ОСНОВНОЙ КОНТЕЙНЕР (НА ПК - ОБЫЧНЫЙ, НА ТЕЛЕФОНЕ - ШТОРКА) */}
      <div className="comments-main-container">

        {/* ШАПКА ШТОРКИ С КРЕСТИКОМ (ТОЛЬКО НА ТЕЛЕФОНАХ) */}
        <div className="comments-modal-header">
          <span className="modal-title">Комментарии</span>
          <button className="modal-close-btn" onClick={() => setIsModalOpen(false)} aria-label="Закрыть комментарии">
            <X size={24} color="#f1f1f1" />
          </button>
        </div>

        {/* СТАНДАРТНАЯ ШАПКА ДЛЯ ПК */}
        <div className="comments-header-row">
          <h3 className="comments-count">
            {totalCommentsCount} {pluralize(totalCommentsCount, ['Комментарий', 'Комментария', 'Комментариев'])}
          </h3>
          <button
            type="button"
            className="comments-sort-btn"
            onClick={() => setSortMode((mode) => (mode === "new" ? "top" : "new"))}
            title="Изменить порядок"
          >
            <ListFilter size={20} />
            <span>{sortMode === "new" ? "Сначала новые" : "Сначала популярные"}</span>
          </button>
        </div>

        {/* ЗОНА ПРОКРУТКИ ВНУТРИ ШТОРКИ */}
        <div className="comments-scrollable-area">
          <CommentForm videoId={videoId} onCommentAdded={() => void loadComments()} />

          <div className="comments-list-container">
            {sortedComments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                videoId={videoId}
                likedIds={likedIds}
                onLikeChange={handleLikeChange}
                onCommentAdded={() => void loadComments()}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
