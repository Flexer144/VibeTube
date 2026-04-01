import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import Search from "../Header/Search";
import { supabase } from "../../shared/lib/supabase";
import { Menu, User, Settings, LogOut } from "lucide-react"; 
import { useEffect, useState, useRef } from "react";
import "./HeaderStyle.css";

export default function Header({ 
  toggleSidebar, 
  isSidebarExpanded 
}: { 
  toggleSidebar?: () => void,
  isSidebarExpanded?: boolean 
}) {
  const [profile, setProfile] = useState<any>(null);
  const [genres, setGenres] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  let closeTimeout: any;

  const currentGenreId = searchParams.get("genre");
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Функции для скролла мышкой
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Множитель 2 для скорости
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const isHideGenres = location.pathname.startsWith("/search") || 
                       location.pathname.startsWith("/video") || 
                       location.pathname.startsWith("/channel") || 
                       location.pathname.startsWith("/upload"); 

  useEffect(() => {
    const loadHeaderData = async () => {
      // 1. Грузим профиль, если юзер авторизован
      if (user) {
        supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => setProfile(data));
      }

      // 2. Параллельно грузим таблицу жанров и колонку с жанрами из вьюшки видео
      const [{ data: allGenres }, { data: videosView }] = await Promise.all([
        supabase.from("genres").select("*"),
        supabase.from("video_search_view").select("search_genres_string")
      ]);

      if (allGenres && videosView) {
        // 3. Умная фильтрация без split
        const activeGenres = allGenres.filter((genre) => {
          // Проверяем, есть ли название этого жанра хотя бы в одной строке search_genres_string
          return videosView.some((video) => 
            video.search_genres_string && video.search_genres_string.includes(genre.name)
          );
        });
        
        setGenres(activeGenres);
      }
    };

    loadHeaderData();
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
    clearTimeout(closeTimeout); 
    setIsMenuOpen(true);
  };
  
  const handleMouseLeave = () => {
    closeTimeout = setTimeout(() => {
      setIsMenuOpen(false);
    }, 200);
  };

  return (
    <div className={`header-wrapper ${isSidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
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
          {/* Добавляем обертку для градиента */}
          <div className="genres-container"> 
            <div 
              className="header-genres-scroll"
              ref={scrollRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeaveOrUp}
              onMouseUp={handleMouseLeaveOrUp}
              onMouseMove={handleMouseMove}
              style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
            >
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
        </div>
      )}
    </div>
  );
}