import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";
import { ArrowLeft, SearchIcon } from "lucide-react";
import './SearchStyle.css'
import GengreIcon from '/GengreIcon.png'
import videoIcon from '/videoIcon.png'
import searchIcon from '/searchIcon.png'

export default function Search({
  onNavigate,
  autoFocus,
  showBackButton,
  onBack
}: {
  onNavigate?: () => void;
  autoFocus?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const navigate = useNavigate();
  // Ссылка на обертку поиска, чтобы отслеживать клики вне её зоны
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Автофокус для мобильного оверлея поиска
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // 1. Закрываем список подсказок, если кликнули куда-то в другое место
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 2. Эффект с Debounce для загрузки подсказок
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim().length < 2) return;

      const [videoRes, genreRes] = await Promise.all([
        supabase.from("videos").select("title").ilike("title", `%${query.trim()}%`).limit(3),
        supabase.from("genres").select("name").ilike("name", `%${query.trim()}%`).limit(2)
      ]);

      const videoHints = videoRes.data?.map(v => ({ title: v.title, type: 'video' })) || [];
      const genreHints = genreRes.data?.map(g => ({ title: g.name, type: 'genre' })) || [];

      setSuggestions([...videoHints, ...genreHints]);
      setShowDropdown(true);
    };

    // Устанавливаем таймер
    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 300); // 300 мс — оптимальная задержка

    // Очищаем таймер, если пользователь продолжает печатать
    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  
  const cleanQuery = query.trim().replace(/\s+/g, ' ');

  if (!cleanQuery) return;

  setShowDropdown(false);
  navigate(`/search?q=${cleanQuery}`);
  setQuery('');
  onNavigate?.();
};
  // Обработчик клика по конкретной подсказке из списка
  const handleSuggestionClick = (title: string) => {
    setQuery(title);
    setShowDropdown(false);
    navigate(`/search?q=${title}`);
    setQuery('')
    onNavigate?.();
  };

  return (
    <div ref={wrapperRef} className="search-wrapper">
      <form onSubmit={handleSearch} className="search-form">
        {showBackButton && (
          <button type="button" className="search-back-inside-btn" onClick={onBack} aria-label="Назад">
            <ArrowLeft size={22} color="#fff" />
          </button>
        )}
        <input
          type="text"
          placeholder="Введите запрос..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          className={`search-input ${showBackButton ? 'search-input--with-back' : ''}`}
          ref={inputRef}
        />

        <button type="submit" className="search-button">
          <SearchIcon size={24} color="#fff" />
        </button>
      </form>

      {/* Выпадающий список с подсказками */}
      {showDropdown && suggestions.length > 0 && (
        <ul className="search-dropdown">
          {suggestions.map((item) => (
            <li
              key={item.id}
              onClick={() => handleSuggestionClick(item.title)}
              className="search-suggestion"
            >
              <div className="search-suggestion-icon-container">
                {item.type === 'genre' ? <img className="search-suggestion-icon" src={GengreIcon}/> : <img className="search-suggestion-icon" src={videoIcon} alt="search--v1"/>}
                {item.title}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}