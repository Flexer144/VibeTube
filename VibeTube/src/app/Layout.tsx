import { useState, useEffect, lazy, Suspense, type CSSProperties } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../widgets/Header/Header";
import SideBar from "../components/SideBar/SideBar";
import { useMediaQuery } from "../shared/lib/useMediaQuery";
import { MOBILE_MEDIA_QUERY, shouldShowGenres } from "../shared/lib/layout";

// Чат с ИИ (вместе с react-markdown) грузится отдельным чанком и не тормозит первую загрузку
const AIChat = lazy(() => import("../widgets/AiChatBot/AIChat"));

export default function Layout() {
  const location = useLocation();
  // Реагирует на изменение ширины окна (раньше window.innerWidth читался один раз при рендере)
  const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY);

  const isWatchPage = location.pathname.startsWith("/video");
  const isUploadPage = location.pathname.startsWith("/upload");

  // На ПК меню развёрнуто, на телефоне и на странице видео — свёрнуто
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => !isMobile && !isWatchPage);

  // При переходе на другую страницу (и при смене ширины) возвращаем меню в состояние по умолчанию.
  // Сравнение с прошлым ключом прямо во время рендера — рекомендуемый React-способ
  // «сбросить состояние при смене пропса» без лишнего рендера через useEffect
  const layoutKey = `${location.pathname}|${isMobile}`;
  const [prevLayoutKey, setPrevLayoutKey] = useState(layoutKey);
  if (layoutKey !== prevLayoutKey) {
    setPrevLayoutKey(layoutKey);
    setIsSidebarExpanded(!isMobile && !isWatchPage);
  }

  // Блокировка прокрутки (scroll) при открытом меню на мобилках
  useEffect(() => {
    document.body.style.overflow = isMobile && isSidebarExpanded ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, isSidebarExpanded]);

  const headerHeight = shouldShowGenres(location.pathname) ? "120px" : "66px";

  return (
    <div
      className="app-container"
      style={{ "--header-height": headerHeight } as CSSProperties}
    >
      <Header
        toggleSidebar={() => setIsSidebarExpanded((expanded) => !expanded)}
        isSidebarExpanded={isSidebarExpanded}
      />
      <Suspense fallback={null}>
        <AIChat />
      </Suspense>
      <div style={{ display: "flex", flex: 1, alignItems: "flex-start", position: "relative" }}>

        {/* Оверлей (затемнение) для мобилок. Закрывает меню при клике вне него */}
        <div
          className={`sidebar-mobile-overlay ${isSidebarExpanded ? 'active' : ''}`}
          onClick={() => setIsSidebarExpanded(false)}
        />

        <SideBar isExpanded={isSidebarExpanded} />

        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: isUploadPage ? "0" : (isMobile ? "10px 0" : "20px"),
            transition: "all 0.3s ease",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
