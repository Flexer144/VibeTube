import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";
import { ArrowLeft, SearchIcon } from "lucide-react";
import './SearchStyle.css'
import GengreIcon from '/GengreIcon.png'
import videoIcon from '/videoIcon.png'
import { escapeLike } from "../../shared/lib/escapeLike";

type Suggestion = { id: string; title: string; type: 'video' | 'genre' };

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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  // Подсказки показываем только для запроса от 2 символов — без синхронного setState в эффекте
  const visibleSuggestions = query.trim().length >= 2 ? suggestions : [];
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
    const term = query.trim();
    // Короткий запрос — не ищем; старые подсказки скрываются через visibleSuggestions ниже
    if (term.length < 2) return;

    // Флаг отмены: ответ на устаревший запрос не должен перезаписать свежие подсказки
    let isCancelled = false;
    const pattern = `%${escapeLike(term)}%`;

    const fetchSuggestions = async () => {
      const [videoRes, genreRes] = await Promise.all([
        supabase.from("videos").select("id, title").ilike("title", pattern).limit(3),
        supabase.from("genres").select("id, name").ilike("name", pattern).limit(2)
      ]);
      if (isCancelled) return;

      const videoHints: Suggestion[] = videoRes.data?.map(v => ({ id: `video-${v.id}`, title: v.title, type: 'video' })) || [];
      const genreHints: Suggestion[] = genreRes.data?.map(g => ({ id: `genre-${g.id}`, title: g.name, type: 'genre' })) || [];

      setSuggestions([...videoHints, ...genreHints]);
      setShowDropdown(true);
    };

    // Debounce: ждём, пока пользователь перестанет печатать
    const timer = setTimeout(fetchSuggestions, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const goToSearch = (rawQuery: string) => {
    const cleanQuery = rawQuery.trim().replace(/\s+/g, ' ');
    if (!cleanQuery) return;

    setShowDropdown(false);
    // encodeURIComponent — иначе «&», «#» или «?» в запросе обрежут его
    navigate(`/search?q=${encodeURIComponent(cleanQuery)}`);
    setQuery('');
    onNavigate?.();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    goToSearch(query);
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
            if (visibleSuggestions.length > 0) setShowDropdown(true);
          }}
          className={`search-input ${showBackButton ? 'search-input--with-back' : ''}`}
          ref={inputRef}
        />

        <button type="submit" className="search-button">
          <SearchIcon size={24} color="#fff" />
        </button>
      </form>

      {/* Выпадающий список с подсказками */}
      {showDropdown && visibleSuggestions.length > 0 && (
        <ul className="search-dropdown">
          {visibleSuggestions.map((item) => (
            <li
              key={item.id}
              onClick={() => goToSearch(item.title)}
              className="search-suggestion"
            >
              <div className="search-suggestion-icon-container">
                <img className="search-suggestion-icon" src={item.type === 'genre' ? GengreIcon : videoIcon} alt="" />
                {item.title}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}