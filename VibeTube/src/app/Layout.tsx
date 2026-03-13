import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../widgets/Header/Header";
import SideBar from "../components/SideBar/SideBar";

export default function Layout() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const location = useLocation();

  // Проверяем, скрыты ли жанры на текущей странице (такая же логика, как в Header)
  const isHideGenres = 
    location.pathname.startsWith("/search") || 
    location.pathname.startsWith("/video") || 
    location.pathname.startsWith("/channel") || 
    location.pathname.startsWith("/upload");

  // Вычисляем общую высоту хедера: 66px (верх) + ~50px (жанры)
  const headerHeight = isHideGenres ? "66px" : "120px";

  return (
    <div 
      className="app-container"
      // Передаем актуальную высоту в CSS переменную
      style={{ "--header-height": headerHeight } as any}
    >
      <Header toggleSidebar={() => setIsSidebarExpanded(!isSidebarExpanded)} />

      <div style={{ display: "flex", flex: 1, alignItems: "flex-start" }}>
        <SideBar isExpanded={isSidebarExpanded} />

        <main style={{ flex: 1, minWidth: 0, padding: "20px" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}