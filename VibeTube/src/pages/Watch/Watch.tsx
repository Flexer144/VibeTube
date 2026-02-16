import { useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../shared/lib/supabase";

import VideoPlayer from "./VideoPlayer";
import VideoInfo from "./VideoInfo";
import VideoActions from "./VideoActions";
import CommentsList from "./Comments/CommentsList";
import CommentForm from "./Comments/CommentForm";
import '../../pages/Watch/WatchStyle.css';

export default function Watch() {
  const { id } = useParams();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const viewTriggered = useRef(false);

  useEffect(() => {
    fetchVideo();
  }, [id]);

  // Загружаем видео
  const fetchVideo = async () => {
    const { data } = await supabase
      .from("videos")
      .select(`
        *,
        profiles(username),
        video_genres(
          genres(name,id)
        )
      `)
      .eq("id", id)
      .single();

    setVideo(data);
    setLoading(false);
  };

  // ✅ НОВАЯ логика просмотров (StrictMode-safe)
  useEffect(() => {
    if (!id || !video) return;
    if (viewTriggered.current) return;

    const viewedKey = `viewed_${id}`;
    const alreadyViewed = sessionStorage.getItem(viewedKey);

    if (alreadyViewed) return;

    viewTriggered.current = true;

    const increment = async () => {
      await supabase.rpc("increment_views", { video_id: id });
      sessionStorage.setItem(viewedKey, "true");
    };

    increment();
  }, [id, video]);


  if (loading) return <p>Загрузка...</p>;
  if (!video) return <p>Видео не найдено</p>;

  return (
    <div className="watch-page">

      <VideoPlayer url={video.video_url} />

      <VideoInfo video={video} />

      <VideoActions videoId={video.id} />

      <CommentForm videoId={video.id} />

      <CommentsList videoId={video.id} />

    </div>
  );
}
