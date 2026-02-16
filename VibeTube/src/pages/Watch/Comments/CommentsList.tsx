import { useEffect, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import CommentItem from "./CommentItem";

export default function CommentsList({
  videoId,
}: {
  videoId: string;
}) {
  const [comments, setComments] = useState<any[]>([]);

  // ---------- загрузка ----------
  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select(`*, profiles(username)`)
      .eq("video_id", videoId)
      .is("parent_id", null)
      .order("created_at", { ascending: false });

    setComments(data || []);
  };

  // ---------- realtime ----------
  useEffect(() => {
    fetchComments();

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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId]);

  return (
    <div>
      <h3>Комментарии</h3>

      {comments.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          videoId={videoId}
        />
      ))}
    </div>
  );
}
