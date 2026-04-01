import { useEffect, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import CommentItem from "./CommentItem";
import CommentForm from "./CommentForm"; // Импортируем форму сюда
import { ListFilter } from "lucide-react";
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
  
  return (
    <div className="comments-section-wrapper">
      {/* 1. Сначала КОЛИЧЕСТВО */}
      <div className="comments-header-row">
        <h3 className="comments-count">
          {totalCommentsCount} {pluralize(totalCommentsCount, ['Комментарий', 'Комментария', 'Комментариев'])}
        </h3>
        <div className="comments-sort-btn">
          <ListFilter size={20} />
          <span>Упорядочить</span>
        </div>
      </div>

      {/* 2. Затем ФОРМА (теперь она здесь) */}
      <CommentForm 
        videoId={videoId} 
        onCommentAdded={() => {
            fetchComments();
            fetchTotalCount();
        }} 
      />

      {/* 3. Затем СПИСОК комментариев */}
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
  );
}