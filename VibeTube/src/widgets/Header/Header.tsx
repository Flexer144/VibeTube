import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Avatar from "../../shared/ui/Avatar/Avatar";
import { shouldShowGenres } from "../../shared/lib/layout";
import { useAuth } from "../../app/providers/AuthProvider";
import Search from "../Header/Search";
import { supabase } from "../../shared/lib/supabase";
import { Menu, User, Settings, LogOut, ShieldAlert, Upload, Search as SearchIcon } from "lucide-react"; 
import { useEffect, useState, useRef } from "react";
import "./HeaderStyle.css";

export default function Header({ 
  toggleSidebar, 
  isSidebarExpanded 
}: { 
  toggleSidebar?: () => void,
  isSidebarExpanded?: boolean 
}) {
  const [genres, setGenres] = useState<{ id: string; name: string }[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  // useRef, а не let: обычная переменная сбрасывается при каждом рендере, и таймер нельзя отменить
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentGenreId = searchParams.get("genre");
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

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
    const walk = (x - startX) * 2; 
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const isHideGenres = !shouldShowGenres(location.pathname);

  useEffect(() => {
    const loadGenres = async () => {
      // !inner оставляет только жанры, у которых есть хотя бы одно видео.
      // Раньше ради этого загружалась вся таблица видео и фильтровалась на клиенте
      const { data } = await supabase
        .from("genres")
        .select("id, name, video_genres!inner(id)")
        .order("name");

      setGenres((data ?? []).map(({ id, name }) => ({ id, name })));
    };
    loadGenres();
  }, []);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await supabase.auth.signOut();
    navigate("/login");
  };

  const goTo = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
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
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setIsMenuOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeout.current = setTimeout(() => {
      setIsMenuOpen(false);
    }, 200);
  };

  useEffect(() => () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
  }, []);

  // Закрываем меню профиля по клику вне его и по Escape
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isMenuOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <div className={`header-wrapper ${isSidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      <div className="header-top-bar">
        <div className="header-left">
          <button
            className="menu-burger-btn"
            onClick={toggleSidebar}
            aria-label={isSidebarExpanded ? "Свернуть меню" : "Развернуть меню"}
            aria-expanded={isSidebarExpanded}
          >
            <Menu size={24} color="#fff" />
          </button>

          <Link to="/" className="logo-link" aria-label="VibeTube — на главную">
            <p className="logo-text">Vibe<span>Tube</span></p>
          </Link>
        </div>

        <div className="header-center">
          <Search />
        </div>

        <div className="header-right">
          <button
            className="mobile-search-toggle-btn"
            onClick={() => setIsMobileSearchOpen(true)}
            aria-label="Поиск"
            title="Поиск"
          >
            <SearchIcon size={24} color="#fff" />
          </button>

          {profile?.role === 'admin' && (
            <Link
              to="/admin"
              className="admin-panel-icon-btn mobile-hidden"
              title="Админ панель"
              aria-label="Админ панель"
            >
              <ShieldAlert size={20} />
            </Link>
          )}

          <Link
            to="/upload"
            className="upload-icon-btn mobile-hidden"
            title="Загрузить видео"
            aria-label="Загрузить видео"
          >
            <Upload size={20} />
          </Link>

          {/* Меню открывается и наведением, и кликом/клавиатурой (раньше — только наведением) */}
          <div
            ref={menuRef}
            className="profile-menu-container mobile-hidden"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              className="header-avatar-btn"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-label="Меню профиля"
            >
              <Avatar src={profile?.avatar_url} name={profile?.username} className="header-avatar" />
            </button>

            {isMenuOpen && (
              <div className="profile-dropdown" role="menu">
                <button type="button" role="menuitem" className="dropdown-item" onClick={() => goTo(`/channel/${user?.id}`)}>
                  <User size={18} />
                  <span>Мой профиль</span>
                </button>
                <button type="button" role="menuitem" className="dropdown-item" onClick={() => goTo(`/channel/${user?.id}`)}>
                  <Settings size={18} />
                  <span>Настройки</span>
                </button>
                <div className="dropdown-divider"></div>
                <button type="button" role="menuitem" className="dropdown-item logout" onClick={handleLogout}>
                  <LogOut size={18} />
                  <span>Выйти</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {isMobileSearchOpen && (
          <div className="mobile-search-overlay">
            <Search
              onNavigate={() => setIsMobileSearchOpen(false)}
              autoFocus
              showBackButton
              onBack={() => setIsMobileSearchOpen(false)}
            />
          </div>
        )}
      </div>

      {!isHideGenres && (
        <div className="header-bottom-bar">
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