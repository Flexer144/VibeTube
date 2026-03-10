import { useRef, useState, useEffect } from "react";
import ArrowLeft from '/ArrowLeft.png'
import ArrowRight from '/ArrowRight.png'

export default function Carousel({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  // Проверка: нужно ли показывать стрелки?
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeft(scrollLeft > 0);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -600 : 600; // На сколько пикселей прыгаем
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

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
    <div className="carousel-wrapper">
      {showLeft && (
        <button className="carousel-btn left" onClick={() => scroll("left")}>
          <img src={ArrowLeft} alt="" />
        </button>
      )}
      
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

      {showRight && (
        <button className="carousel-btn right" onClick={() => scroll("right")}>
          <img src={ArrowRight} alt="" />
        </button>
      )}
    </div>
  );
}