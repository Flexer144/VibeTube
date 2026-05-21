import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../widgets/Header/Header";
import AIChat from '../widgets/AiChatBot/AIChat.tsx'
import SideBar from "../components/SideBar/SideBar";

export default function Layout() {
  // Инициализируем состояние в зависимости от ширины экрана
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(window.innerWidth > 500);
  const location = useLocation();

  const isWatchPage = location.pathname.startsWith("/video");
  const isUploadPage = location.pathname.startsWith("/upload");

  // Обработка ресайза и закрытие меню при навигации на мобилках
  useEffect(() => {
    // Если перешли на другую страницу на мобилке — закрываем меню
    if (window.innerWidth <= 500) {
      setIsSidebarExpanded(false);
    } else if (isWatchPage) {
      setIsSidebarExpanded(false);
    }
  }, [location.pathname, isWatchPage]);

  // Блокировка прокрутки (scroll) при открытом меню на мобилках
  useEffect(() => {
    if (window.innerWidth <= 500 && isSidebarExpanded) {
      document.body.style.overflow = 'hidden'; // Запрещаем скролл
    } else {
      document.body.style.overflow = ''; // Возвращаем как было
    }
    
    // Очистка при размонтировании
    return () => { document.body.style.overflow = ''; };
  }, [isSidebarExpanded]);

  const isHideGenres = 
    location.pathname.startsWith("/search") || 
    location.pathname.startsWith("/video") || 
    location.pathname.startsWith("/channel") || 
    location.pathname.startsWith("/admin") ||
    isUploadPage;

  const headerHeight = isHideGenres ? "66px" : "120px";

  return (
    <div 
      className="app-container"
      style={{ "--header-height": headerHeight } as any}
    >
      <Header 
        toggleSidebar={() => setIsSidebarExpanded(!isSidebarExpanded)} 
        isSidebarExpanded={isSidebarExpanded} 
      />
      <AIChat />
      <div style={{ display: "flex", flex: 1, alignItems: "flex-start", position: "relative" }}>
        
        {/* Оверлей (затемнение) для мобилок. Закрывает меню при клике вне него */}
        <div 
          className={`sidebar-mobile-overlay ${isSidebarExpanded ? 'active' : ''}`}
          onClick={() => setIsSidebarExpanded(false)}
        />

        <SideBar setExpanded={setIsSidebarExpanded} isExpanded={isSidebarExpanded} />

        <main 
          style={{ 
            flex: 1, 
            minWidth: 0, 
            padding: isUploadPage ? "0" : (window.innerWidth <= 500 ? "10px 0" : "20px"), 
            transition: "all 0.3s ease",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}