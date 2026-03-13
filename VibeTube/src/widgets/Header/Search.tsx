import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";
import './SearchStyle.css'
import GengreIcon from '/GengreIcon.png'
import videoIcon from '/videoIcon.png'
import searchIcon from '/searchIcon.png'

export default function Search() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const navigate = useNavigate();
  // Ссылка на обертку поиска, чтобы отслеживать клики вне её зоны
  const wrapperRef = useRef<HTMLDivElement>(null);

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

      // Ищем подсказки и в видео, и в жанрах (делаем два быстрых запроса параллельно)
      const [videoRes, genreRes] = await Promise.all([
        supabase.from("videos").select("title").ilike("title", `%${query}%`).limit(3),
        supabase.from("genres").select("name").ilike("name", `%${query}%`).limit(2)
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

  // Обработчик отправки формы (нажатие Enter или кнопки лупы)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setShowDropdown(false); // Прячем подсказки при поиске
    navigate(`/search?q=${query}`);
    setQuery('')
  };

  // Обработчик клика по конкретной подсказке из списка
  const handleSuggestionClick = (title: string) => {
    setQuery(title);
    setShowDropdown(false);
    navigate(`/search?q=${title}`);
    setQuery('')
  };

  return (
    <div ref={wrapperRef} className="search-wrapper">
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Введите запрос..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          className="search-input"
        />

        <button type="submit" className="search-button">
          <img src={searchIcon} alt="search--v1"/>
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
              {item.type === 'genre' ? <img className="search-suggestion-icon" src={GengreIcon}/> : <img className="search-suggestion-icon" src={videoIcon} alt="search--v1"/>} {item.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}