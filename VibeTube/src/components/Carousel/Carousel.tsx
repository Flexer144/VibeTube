import { useRef, useState, useEffect } from "react";
import ArrowLeft from '/ArrowLeft.png'
import ArrowRight from '/ArrowRight.png'

export default function Carousel({ children, text }: { children: React.ReactNode, text: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
const [canScrollLeft, setCanScrollLeft] = useState(false);
const [canScrollRight, setCanScrollRight] = useState(true);


  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -600 : 600; // На сколько пикселей прыгаем
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      // Можно ли скроллить влево? (если отступ больше 0)
      setCanScrollLeft(scrollLeft > 5); 
      // Можно ли скроллить вправо? (если текущий скролл + ширина контейнера < полной ширины контента)
      // -5 для погрешности округления
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  // Проверяем скролл при первом рендере
  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  // ЛОГИКА ПЕРЕТАСКИВАНИЯ МЫШКОЙ (Drag to scroll)
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDown.current = true;
    startX.current = e.pageX - scrollRef.current!.offsetLeft;
    scrollLeftStart.current = scrollRef.current!.scrollLeft;
  };

  const handleMouseLeaveOrUp = () => {
    isDown.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current!.offsetLeft;
    const walk = (x - startX.current) * 2; // Множитель скорости прокрутки
    scrollRef.current!.scrollLeft = scrollLeftStart.current - walk;
  };

  return (
    <div className="carousel-section">
      {/* Контейнер для кнопок. Размести его либо тут, либо внутри своего заголовка в Profile.tsx */}
      <div className="carousel-controls">
        <h2 className="section-title-carousel">{text}</h2>
        <div className="button-container">
          <button 
            className="carousel-btn" 
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
          >
            <img src={ArrowLeft} alt="<" />
          </button>
          <button 
            className="carousel-btn" 
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
          >
            <img src={ArrowRight} alt=">" />
          </button>
        </div>
      </div>

      <div className="carousel-wrapper">
        <div 
          className="carousel-container" 
          ref={scrollRef} 
          onScroll={checkScroll}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeaveOrUp}
          onMouseUp={handleMouseLeaveOrUp}
          onMouseMove={handleMouseMove}
        >
          {children}
        </div>
      </div>
    </div>
);
}