import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useAuth } from "../../app/providers/AuthProvider";

export default function VideoActions({ videoId }: { videoId: string }) {
  const { user } = useAuth();

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    fetchLikes();
  }, [videoId]);

  const fetchLikes = async () => {
    const { data } = await supabase
      .from("likes")
      .select("*")
      .eq("video_id", videoId);

    setLikesCount(data?.length || 0);

    if (user) {
      const isLiked = data?.some(l => l.user_id === user.id) ?? false;
      setLiked(isLiked);
    }
  };

  const toggleLike = async () => {
    if (!user) return;

    if (liked) {
      await supabase
        .from("likes")
        .delete()
        .match({ user_id: user.id, video_id: videoId });
    } else {
      await supabase
        .from("likes")
        .insert({ user_id: user.id, video_id: videoId });
    }

    fetchLikes();
  };

  return (
    <div>

      <button onClick={toggleLike}>
        {liked ? "❤️" : "🤍"} {likesCount}
      </button>

    </div>
  );
}
