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
  const [genres, setGenres] = useState<any[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchVideos = async (genreId?: number) => {
    setLoadingVideo(true);

    let query = supabase
      .from("videos")
      .select(`
        *,
        profiles(username),
        video_genres(
          genres(*)
        )
      `)
      .order("created_at", { ascending: false });

    if (genreId) {
      query = supabase
        .from("videos")
        .select(`
          *,
          profiles(username),
          video_genres!inner(
            genre_id,
            genres(*)
          )
        `)
        .eq("video_genres.genre_id", genreId)
        .order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) console.error(error);

    setVideos(data || []);
    setLoadingVideo(false);
  };



  const fetchGenres = async () => {
    const { data } = await supabase.from("genres").select("*");
    setGenres(data || []);
  };

  useEffect(() => {
    fetchVideos();
    fetchGenres();
  }, []);

  const handleGenreChange = (id: number | null) => {
    setSelectedGenre(id);
    fetchVideos(id ?? undefined);
  };

  if (loading) return <p>Загрузка...</p>;
  if (!user) return <p>Не авторизован</p>;

  return (
    <>
      <h2>Привет, {profile?.username} 👋</h2>
      <button onClick={logoutUser}>Выйти</button>
      <button onClick={() => navigate("/upload")}>Загрузить видео</button>

      <button
        className={selectedGenre === null ? "activeGenre" : ""}
        onClick={() => handleGenreChange(null)}
      >
        Все
      </button>

      {genres.map((g) => (
        <button
          key={g.id}
          className={selectedGenre === g.id ? "activeGenre" : ""}
          onClick={() => handleGenreChange(g.id)}
        >
          {g.name}
        </button>
      ))}

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
