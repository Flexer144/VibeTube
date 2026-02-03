import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check, Search } from 'lucide-react'; // Убедись, что lucide-react установлен
import '../../../styles/GenreSelector.css';

interface Genre {
  id: string; // или number, зависит от твоей базы
  name: string;
}

interface GenreSelectorProps {
  genres: Genre[];
  selectedGenres: string[];
  onChange: (selectedIds: string[]) => void;
}

export default function GenreSelector({ genres, selectedGenres, onChange }: GenreSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Фильтрация жанров по поиску
  const filteredGenres = genres.filter((genre) =>
    genre.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Обработка выбора
  const toggleGenre = (id: string) => {
    if (selectedGenres.includes(id)) {
      onChange(selectedGenres.filter((gId) => gId !== id));
    } else {
      onChange([...selectedGenres, id]);
    }
  };

  // Удаление кликом по крестику
  const removeGenre = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Чтобы не открывался список при удалении
    onChange(selectedGenres.filter((gId) => gId !== id));
  };

  return (
    <div className="gs-container" ref={containerRef}>
      {/* --- Триггер (Поле ввода) --- */}
      <div className="gs-trigger" onClick={() => setIsOpen(!isOpen)}>
        <div className="gs-tags-area">
          {selectedGenres.length > 0 ? (
            selectedGenres.map((id) => {
              const genre = genres.find((g) => g.id === id);
              if (!genre) return null;
              return (
                <span key={id} className="gs-tag">
                  {genre.name}
                  <span
                    className="gs-tag-close"
                    onClick={(e) => removeGenre(e, id)}
                  >
                    <X size={14} />
                  </span>
                </span>
              );
            })
          ) : (
            <span className="gs-placeholder">Выберите жанры...</span>
          )}
        </div>
        <ChevronDown size={16} className={`gs-chevron ${isOpen ? 'open' : ''}`} />
      </div>

      {/* --- Выпадающий список --- */}
      {isOpen && (
        <div className="gs-dropdown">
          <div className="gs-search-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={16} color="#a1a1aa"/>
                <input
                type="text"
                className="gs-search-input"
                placeholder="Поиск жанра..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                />
            </div>
          </div>

          <div className="gs-options-list">
            {filteredGenres.length > 0 ? (
              filteredGenres.map((genre) => {
                const isSelected = selectedGenres.includes(genre.id);
                return (
                  <div
                    key={genre.id}
                    className={`gs-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleGenre(genre.id)}
                  >
                    <span>{genre.name}</span>
                    <Check
                      size={16}
                      className={`gs-check-icon ${isSelected ? 'visible' : ''}`}
                    />
                  </div>
                );
              })
            ) : (
              <div className="gs-empty">Ничего не найдено</div>
            )}
          </div>
        </div>)}
    </div>
  );
}