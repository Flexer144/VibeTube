import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../widgets/Header/Header";
import AIChat from '../widgets/AiChatBot/AIChat.tsx'
import SideBar from "../components/SideBar/SideBar";

export default function Layout() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const location = useLocation();

  const isWatchPage = location.pathname.startsWith("/video");
  // Определяем, находимся ли мы на странице загрузки
  const isUploadPage = location.pathname.startsWith("/upload");

  useEffect(() => {
    if (isWatchPage) {
      setIsSidebarExpanded(false);
    }
  }, [location.pathname]);

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
      <div style={{ display: "flex", flex: 1, alignItems: "flex-start" }}>
        <SideBar setExpanded={setIsSidebarExpanded} isExpanded={isSidebarExpanded} />

        <main 
          style={{ 
            flex: 1, 
            minWidth: 0, 
            /* Если это страница загрузки — отступы 0, иначе — 20px */
            padding: isUploadPage ? "0" : "20px", 
            transition: "all 0.3s ease", // Добавил transition для плавности
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}