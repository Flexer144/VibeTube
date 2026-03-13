import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import Search from "../Header/Search";
import { supabase } from "../../shared/lib/supabase";
import { Menu, User, Settings, LogOut } from "lucide-react"; // Добавили иконки
import { useEffect, useState } from "react";
import "./HeaderStyle.css";

export default function Header({ toggleSidebar }: { toggleSidebar?: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [genres, setGenres] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Состояние меню
  let closeTimeout: any;

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleGenreChange = (id: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (id) newParams.set("genre", id); else newParams.delete("genre");
    setSearchParams(newParams);
    if (location.pathname !== "/" && location.pathname !== "/search") {
      navigate(`/?${newParams.toString()}`);
    }
  };

  const handleMouseEnter = () => {
    clearTimeout(closeTimeout); // Если курсор вернулся, отменяем закрытие
    setIsMenuOpen(true);
  };
  const handleMouseLeave = () => {
    // Закрываем через 200мс, чтобы пользователь успел довести курсор до меню
    closeTimeout = setTimeout(() => {
      setIsMenuOpen(false);
    }, 200);
  };

  return (
    <div className="header-wrapper">
      <div className="header-top-bar">
        <div className="header-left">
          <button className="menu-burger-btn" onClick={toggleSidebar}>
            <Menu size={24} color="#fff" />
          </button>
          
          <div onClick={() => navigate("/")} style={{cursor: 'pointer'}}>
            <p className="logo-text">Vibe<span>Tube</span></p>
          </div>
        </div>

        <div className="header-center">
          <Search />
        </div>

        <div className="header-right">
          <button className="create-btn upload-btn" onClick={() => navigate("/upload")}>Создать</button>
          
          {/* КОНТЕЙНЕР ПРОФИЛЯ С МЕНЮ */}
          <div 
            className="profile-menu-container"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <img 
              src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.username}`}
              className="header-avatar"
              alt="avatar"
            />

            {isMenuOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-item" onClick={() => navigate(`/channel/${user?.id}`)}>
                  <User size={18} />
                  <span>Мой профиль</span>
                </div>
                <div className="dropdown-item" onClick={() => navigate(`/channel/${user?.id}`)}>
                  <Settings size={18} />
                  <span>Настройки</span>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item logout" onClick={handleLogout}>
                  <LogOut size={18} />
                  <span>Выйти</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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