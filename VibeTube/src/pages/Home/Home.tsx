import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { logoutUser } from "../../features/auth/logout";
import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import VideoCard from "../../components/VideoCard/VideoCard";
import '../../styles/HomeStyle.css';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const [videos, setVideos] = useState<any[]>([]);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchVideos();
  }, []);

  if (loading) return <p>Загрузка...</p>;
  if (!user) return <p>Не авторизован</p>;

  const fetchVideos = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select(`
        *,
        profiles(username),
        video_genres(
          genres(name,id)
        )
      `)
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error(error);
    } else {
      setVideos(data || []);
    }

    setLoadingVideo(false);
  };

  if (loadingVideo) return <p>Загрузка...</p>;

  return (
    <>
      <h2>Привет, {profile?.username} 👋</h2>
      <button onClick={logoutUser}>Выйти</button>
      <button onClick={() => navigate("/upload")}>Загрузить видео</button>

      <div className="home-page">
      <h2>Видео</h2>

      <div className="video-grid">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
    </>
  );
}
