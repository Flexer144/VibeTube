import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import Search from "../Header/Search"; // Убедись, что внутри Search.tsx инпуты на весь контейнер
import { supabase } from "../../shared/lib/supabase";
import { useEffect, useState } from "react";
import "./HeaderStyle.css";

export default function Header() {
  const [profile, setProfile] = useState<any>(null);
  const [genres, setGenres] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentGenreId = searchParams.get("genre");

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isHideGenres = location.pathname.startsWith("/search") || location.pathname.startsWith("/video") || location.pathname.startsWith("/channel") || location.pathname.startsWith("/upload"); 

  useEffect(() => {
    supabase.from("genres").select("*").then(({ data }) => setGenres(data || []));
    if (user) {
      supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => setProfile(data));
    }
  }, [user]);

  const handleGenreChange = (id: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (id) newParams.set("genre", id); else newParams.delete("genre");
    setSearchParams(newParams);
    if (location.pathname !== "/" && location.pathname !== "/search") {
      navigate(`/?${newParams.toString()}`);
    }
  };

  return (
    <div className="header-wrapper">
      {/* 1 ЭТАЖ: Основная панель */}
      <div className="header-top-bar">
        <div className="header-left" onClick={() => navigate("/")} style={{cursor: 'pointer'}}>
          <img src="/logo.png" style={{ height: 24 }} alt="logo" />
        </div>

        <div className="header-center">
          <Search />
        </div>

        <div className="header-right">
          <button className="genre-chip" onClick={() => navigate("/upload")}>Создать</button>
          <img 
            src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.username}`}
            className="header-avatar"
            style={{width: 42, height: 42, borderRadius: '50%', cursor: 'pointer'}}
            onClick={() => navigate(`/channel/${user?.id}`)}
          />
        </div>
      </div>

      {/* 2 ЭТАЖ: Жанры (скрываем в поиске и видео) */}
      {!isHideGenres && (
        <div className="header-bottom-bar">
          <div className="header-genres-scroll">
            <button 
              className={`genre-chip ${!currentGenreId ? 'active' : ''}`}
              onClick={() => handleGenreChange(null)}
            >
              Все
            </button>
            {genres.map(g => (
              <button 
                key={g.id}
                className={`genre-chip ${currentGenreId === g.id ? 'active' : ''}`}
                onClick={() => handleGenreChange(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}